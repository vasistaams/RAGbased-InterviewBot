/**
 * ============================================
 *  MongoDB Database Connection
 * ============================================
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/interviewbot';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Falling back to in-memory storage');
    return false;
  }
  return true;
}

module.exports = { connectDB, mongoose };
