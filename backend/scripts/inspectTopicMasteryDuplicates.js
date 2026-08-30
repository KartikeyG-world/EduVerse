// Operator-controlled read-only duplicate inspection tool
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const TopicMastery = require('../models/TopicMastery');
const { normalizeTopicName } = require('../utils/mastery');

const inspect = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eduverse';
    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB. Inspecting TopicMastery records...');

    const allRecords = await TopicMastery.find({}).lean();
    console.log(` Total TopicMastery records found: ${allRecords.length}`);

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

    const duplicateGroups = [];
    for (const [key, records] of groups.entries()) {
      if (records.length > 1) {
        const [userId, canonical] = key.split(':::');
        duplicateGroups.push({ userId, canonical, records });
      }
    }

    console.log(`\n Total unique canonical topic keys: ${groups.size}`);
    console.log(` Duplicate groups detected: ${duplicateGroups.length}`);

    if (duplicateGroups.length > 0) {
      console.log('\n--- Duplicate Groups Breakdown ---');
      duplicateGroups.forEach((g, idx) => {
        console.log(`\nGroup #${idx + 1} [User: ${g.userId}] Canonical Topic: "${g.canonical}" (${g.records.length} records):`);
        g.records.forEach(r => {
          console.log(`  • ID: ${r._id} | Display: "${r.topicName}" | Category: "${r.category}" | Score: ${r.masteryScore}% | Attempts: ${r.correctAttempts}C/${r.wrongAttempts}W | RevisionDue: ${r.nextRevisionDue}`);
        });
      });
    } else {
      console.log('\n No duplicate canonical topics found in the database. All records are distinct.');
    }

    await mongoose.disconnect();
    console.log('\n Inspection complete. Zero modifications made.');
    return { totalRecords: allRecords.length, duplicateGroups: duplicateGroups.length };
  } catch (err) {
    console.error(' Inspection error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  inspect();
}

module.exports = { inspect };
