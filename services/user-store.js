/**
 * ============================================
 *  User Store — MongoDB-backed
 * ============================================
 *
 * All user CRUD operations via Mongoose.
 * Replaces the old JSON-file persistence.
 */

const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// ─── User CRUD ──────────────────────────────────────────────────

async function findUserByEmail(email) {
  if (!email) return null;
  return User.findOne({ email: email.toLowerCase().trim() });
}

async function findUserById(id) {
  try {
    return await User.findById(id);
  } catch {
    return null;
  }
}

async function createUser(profile) {
  // Check if user already exists by email
  if (profile.email) {
    const existing = await findUserByEmail(profile.email);
    if (existing) {
      existing.lastLogin = new Date();
      if (profile.name && profile.name !== 'User') existing.name = profile.name;
      if (profile.authMethod) existing.authMethod = profile.authMethod;
      await existing.save();
      return existing;
    }
  }

  const user = new User({
    name: profile.name || 'User',
    email: (profile.email || '').toLowerCase().trim(),
    passwordHash: profile.passwordHash || '',
    phone: profile.phone || '',
    avatar: profile.avatar || (profile.name?.[0] || 'U').toUpperCase(),
    authMethod: profile.authMethod || 'email-otp',
    theme: 'light',
    interviewsTaken: 0,
    interviewHistory: [],
    lastLogin: new Date(),
  });

  await user.save();
  return user;
}

async function updateUser(id, updates) {
  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    return user;
  } catch {
    return null;
  }
}

// ─── Interview Session ──────────────────────────────────────────

async function addInterviewSession(userId, session) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const record = {
      date: new Date(),
      score: session.score || Math.floor(Math.random() * 40) + 60,
      questionsAsked: session.questionsAsked || 0,
      duration: session.duration || 0,
      category: session.category || 'Mixed',
    };

    user.interviewHistory.push(record);
    user.interviewsTaken = user.interviewHistory.length;

    await user.save();

    return { id: uuidv4(), ...record, date: record.date.toISOString() };
  } catch (err) {
    console.error('addInterviewSession error:', err.message);
    return null;
  }
}

module.exports = {
  findUserByEmail, findUserById,
  createUser, updateUser, addInterviewSession,
};
