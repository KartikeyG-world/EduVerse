const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  solutionText: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Solution', solutionSchema);
