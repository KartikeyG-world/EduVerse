const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    enum: ['Maths', 'Physics', 'Chemistry', 'Programming', 'Other'],
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['unsolved', 'solved'],
    default: 'unsolved'
  },
  solutions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Solution'
  }],
  acceptedSolution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Solution',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Problem', problemSchema);
