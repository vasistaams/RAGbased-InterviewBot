const mongoose = require('mongoose');

const InterviewReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  questions: {
    type: [String],
    default: []
  },
  answers: {
    type: [String],
    default: []
  },
  scores: {
    type: [Number],
    default: []
  },
  feedback: {
    type: [String],
    default: []
  },
  overallScore: {
    type: Number,
    required: true
  },
  interviewNumber: {
    type: Number,
    default: 1
  },
  totalTime: {
    type: String,
    default: "00:00"
  },
  detailedEvaluation: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model('InterviewReport', InterviewReportSchema);
