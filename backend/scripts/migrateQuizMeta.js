/**
 * Migration & Rollback Script for QuizGenerationMeta Collection
 * 
 * Usage:
 *   node backend/scripts/migrateQuizMeta.js --up      (Creates collection & indexes)
 *   node backend/scripts/migrateQuizMeta.js --down    (Safely drops collection)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const QuizGenerationMeta = require('../models/quizGenerationMeta');

const runMigration = async () => {
  const mode = process.argv.includes('--down') ? 'down' : 'up';
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('ERROR: MONGO_URI is not set in environment variables.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB for migration (${mode.toUpperCase()})...`);
  await mongoose.connect(mongoUri);

  try {
    if (mode === 'up') {
      console.log('Ensuring collection and indexes for QuizGenerationMeta...');
      await QuizGenerationMeta.init(); // triggers schema index creation
      const indexes = await QuizGenerationMeta.collection.indexes();
      console.log('Migration UP successful. Active indexes:', indexes.map(idx => idx.name).join(', '));
    } else {
      console.log('Rolling back QuizGenerationMeta collection...');
      const collections = await mongoose.connection.db.listCollections({ name: 'quiz_generation_meta' }).toArray();
      if (collections.length > 0) {
        await mongoose.connection.db.dropCollection('quiz_generation_meta');
        console.log('Migration DOWN successful: quiz_generation_meta dropped safely.');
      } else {
        console.log('Collection quiz_generation_meta does not exist. Nothing to drop.');
      }
    }
  } catch (err) {
    console.error(`Migration ${mode.toUpperCase()} failed:`, err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

runMigration();
