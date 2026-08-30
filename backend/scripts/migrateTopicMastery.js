// Operator-controlled deterministic migration tool for TopicMastery duplicates
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const TopicMastery = require('../models/TopicMastery');
const { normalizeTopicName } = require('../utils/mastery');

const migrate = async (options = {}) => {
  const isExecute = options.execute || process.argv.includes('--execute');
  const isDryRun = !isExecute || process.argv.includes('--dry-run');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eduverse';
    await mongoose.connect(mongoUri);
    console.log(` Connected to MongoDB [Mode: ${isDryRun ? 'DRY-RUN (No writes)' : 'EXECUTE'}]`);

    const allRecords = await TopicMastery.find({});
    console.log(` Total TopicMastery records found: ${allRecords.length}`);

    // Create timestamped backup snapshot before any operations
    const backupDir = path.resolve(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `topic_mastery_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(allRecords, null, 2), 'utf8');
    console.log(` Created rollback backup snapshot: ${backupFile}`);

    // Group by userId and canonicalTopicName
    const groups = new Map();
    for (const record of allRecords) {
      const canonical = normalizeTopicName(record.canonicalTopicName || record.topicName);
      const userKey = `${record.userId.toString()}:::${canonical}`;
      if (!groups.has(userKey)) {
        groups.set(userKey, []);
      }
      groups.get(userKey).push(record);
    }

    let mergedGroupsCount = 0;
    let deletedRecordsCount = 0;
    let updatedRecordsCount = 0;

    for (const [key, records] of groups.entries()) {
      const [userId, canonical] = key.split(':::');

      if (records.length > 1) {
        mergedGroupsCount++;
        console.log(`\n Merging duplicate group for User: ${userId}, Canonical: "${canonical}" (${records.length} records)`);

        // Sort records to pick the primary (most recent or most attempts)
        const sorted = [...records].sort((a, b) => {
          const aAttempts = (a.correctAttempts || 0) + (a.wrongAttempts || 0);
          const bAttempts = (b.correctAttempts || 0) + (b.wrongAttempts || 0);
          if (bAttempts !== aAttempts) return bAttempts - aAttempts;
          return new Date(b.lastStudiedAt || 0).getTime() - new Date(a.lastStudiedAt || 0).getTime();
        });

        const primary = sorted[0];
        const secondaries = sorted.slice(1);

        // Deterministic Merge Calculations
        const allCategories = new Set();
        let totalCorrect = 0;
        let totalWrong = 0;
        let highestScore = 0;
        let maxLastStudied = new Date(0);
        let earliestRevisionDue = null;
        let hasAssessmentEvidence = false;

        const mergedSources = [];

        for (const r of records) {
          if (r.category) allCategories.add(r.category.trim());
          if (Array.isArray(r.categories)) {
            r.categories.forEach(c => c && allCategories.add(c.trim()));
          }
          if (Array.isArray(r.sources)) {
            r.sources.forEach(s => {
              const existing = mergedSources.find(m => m.type === s.type);
              if (existing) {
                existing.count = (existing.count || 1) + (s.count || 1);
                if (new Date(s.lastStudiedAt) > new Date(existing.lastStudiedAt)) {
                  existing.lastStudiedAt = s.lastStudiedAt;
                }
              } else {
                mergedSources.push({ ...s.toObject ? s.toObject() : s });
              }
            });
          }

          totalCorrect += (r.correctAttempts || 0);
          totalWrong += (r.wrongAttempts || 0);
          if ((r.masteryScore || 0) > highestScore) highestScore = r.masteryScore;

          if (r.lastStudiedAt && new Date(r.lastStudiedAt) > maxLastStudied) {
            maxLastStudied = new Date(r.lastStudiedAt);
          }

          // Safety rule: preserve earliest revision due so an overdue topic is NOT postponed
          if (r.nextRevisionDue && ((r.correctAttempts || 0) > 0 || (r.wrongAttempts || 0) > 0)) {
            hasAssessmentEvidence = true;
            const revDate = new Date(r.nextRevisionDue);
            if (!earliestRevisionDue || revDate < earliestRevisionDue) {
              earliestRevisionDue = revDate;
            }
          }
        }

        const calculatedWeak = highestScore < 40 || (totalWrong > totalCorrect && highestScore < 60);

        if (!isDryRun) {
          primary.canonicalTopicName = canonical;
          primary.categories = Array.from(allCategories);
          primary.sources = mergedSources;
          primary.correctAttempts = totalCorrect;
          primary.wrongAttempts = totalWrong;
          primary.masteryScore = highestScore;
          primary.lastStudiedAt = maxLastStudied.getTime() > 0 ? maxLastStudied : new Date();
          primary.nextRevisionDue = hasAssessmentEvidence ? earliestRevisionDue : null;
          primary.isWeakArea = calculatedWeak;

          await primary.save();
          updatedRecordsCount++;

          for (const sec of secondaries) {
            await TopicMastery.findByIdAndDelete(sec._id);
            deletedRecordsCount++;
          }
        } else {
          console.log(`  [DRY-RUN] Would merge into ID: ${primary._id}, delete ${secondaries.length} secondary IDs.`);
        }
      } else {
        // Single record: ensure canonicalTopicName and categories are set
        const single = records[0];
        if (!single.canonicalTopicName || !single.categories || single.categories.length === 0) {
          if (!isDryRun) {
            single.canonicalTopicName = canonical;
            if (!single.categories || single.categories.length === 0) {
              single.categories = single.category ? [single.category] : ['General'];
            }
            await single.save();
            updatedRecordsCount++;
          }
        }
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(` Total records processed: ${allRecords.length}`);
    console.log(` Duplicate groups merged: ${mergedGroupsCount}`);
    console.log(` Primary records updated: ${updatedRecordsCount}`);
    console.log(` Redundant duplicates removed: ${deletedRecordsCount}`);
    console.log(` Mode: ${isDryRun ? 'DRY RUN (zero modifications made)' : 'EXECUTE COMPLETED'}`);

    await mongoose.disconnect();
    return { mergedGroupsCount, deletedRecordsCount, updatedRecordsCount, backupFile };
  } catch (err) {
    console.error(' Migration error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
