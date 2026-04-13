const { requireAuth, clerkClient } = require('@clerk/express');
const User = require('../models/User');

/**
 * Middleware that syncs a Clerk user to MongoDB.
 * Assumes `requireAuth()` ran before this, meaning `req.auth.userId` exists.
 */
const syncUser = async (req, res, next) => {
  try {
    const clerkUserId = req.auth.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: No Clerk token found' });
    }

    // Try finding by clerkId first
    let user = await User.findOne({ clerkId: clerkUserId });

    if (!user) {
      // User not in DB with this clerkId, fetch from Clerk API
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (e) {
        console.error('Failed to fetch user from Clerk:', e);
        return res.status(500).json({ error: 'Failed to sync with auth provider' });
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUserId}@clerk.local`;
      const name = clerkUser.firstName 
        ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
        : 'Clerk User';

      // Check if user exists by email (legacy sync or same email signup)
      user = await User.findOne({ email });
      if (user) {
        user.clerkId = clerkUserId;
        user.authMethod = 'clerk';
        await user.save();
      } else {
        // Create brand new MongoDB user
        user = new User({
          name: name,
          email: email,
          clerkId: clerkUserId,
          avatar: clerkUser.imageUrl || 'U',
          authMethod: 'clerk'
        });
        await user.save();
      }
    }

    // Important: map the MongoDB user explicitly to req.mongoUser
    req.mongoUser = user;
    
    next();
  } catch (err) {
    console.error('Auth DB Sync Error:', err);
    res.status(500).json({ error: 'Database synchronization failed' });
  }
};

/**
 * Array of middlewares mapping standard Clerk authentication protecting rules,
 * followed by caching the user securely against a MongoDB model instance.
 */
const protectRoute = [
  requireAuth(),
  syncUser
];

module.exports = {
  protectRoute,
  syncUser
};
