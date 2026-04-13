/**
 * ============================================
 *  User Model — MongoDB (Mongoose)
 * ============================================
 */

const { mongoose } = require('../services/database');

const interviewSessionSchema = new mongoose.Schema({
  date:           { type: Date, default: Date.now },
  score:          { type: Number, default: 0 },
  questionsAsked: { type: Number, default: 0 },
  duration:       { type: Number, default: 0 },
  category:       { type: String, default: 'Mixed' },
});

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:{ type: String, default: '' },
  phone:       { type: String, default: '' },
  avatar:      { type: String, default: 'U' },
  authMethod:  { type: String, enum: ['email-otp', 'google', 'clerk'], default: 'email-otp' },
  clerkId:     { type: String, default: null },
  googleId:    { type: String, default: null },
  otp:         { type: String, default: null },
  otpExpires:  { type: Date, default: null },
  theme:       { type: String, enum: ['light', 'dark'], default: 'light' },
  resumePath:  { type: String, default: null },
  resumeName:  { type: String, default: null },

  // Stats
  interviewsTaken:    { type: Number, default: 0 },
  totalSessions:      { type: Number, default: 0 },

  // Interview history
  interviewHistory: [interviewSessionSchema],

  lastLogin: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Virtual for user ID string
userSchema.virtual('userId').get(function () {
  return this._id.toString();
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
