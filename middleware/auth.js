const { getAuth, clerkClient } = require('@clerk/express');
const User = require('../models/User');

/**
 * Determine if we have a real (non-placeholder) Clerk Secret Key.
 * If not, Clerk API calls for user lookup will fail gracefully.
 */
const hasRealClerkSecret = () => {
  const key = process.env.CLERK_SECRET_KEY || '';
  return key.length > 20 && !key.includes('...');
};

/**
 * requireClerkAuth — Modern replacement for deprecated requireAuth().
 * Uses clerkMiddleware() + getAuth() per Clerk v5+ docs.
 */
const requireClerkAuth = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    console.warn('[Auth] Unauthorized request — no valid Clerk token');
    return res.status(401).json({ error: 'Unauthorized: Valid Clerk session required' });
  }
  // Attach to req.auth for downstream use (matches old API shape)
  req.auth = { userId };
  next();
};

/**
 * syncUser — Syncs a Clerk user to MongoDB.
 * Runs after requireClerkAuth so req.auth.userId is guaranteed.
 *
 * If CLERK_SECRET_KEY is a placeholder, Clerk API calls are skipped
 * and a fallback user is created from the userId alone. This allows
 * development to work while the real secret key is pending.
 */
const syncUser = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: No Clerk token found' });
    }

    console.log('[Auth] Syncing user for Clerk ID:', clerkUserId);

    // Check for existing user by clerkId
    let user = await User.findOne({ clerkId: clerkUserId });

    if (!user) {
      let name = 'Clerk User';
      let email = `${clerkUserId}@clerk.local`;
      let avatar = 'U';

      // Only call Clerk API if we have a real secret key
      if (hasRealClerkSecret()) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          email = clerkUser.emailAddresses[0]?.emailAddress || email;
          name = clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
            : name;
          avatar = clerkUser.imageUrl || avatar;
        } catch (e) {
          console.warn('[Auth] Clerk API call failed (check CLERK_SECRET_KEY):', e.message);
          // Continue with defaults — do not block the request
        }
      } else {
        console.warn('[Auth] CLERK_SECRET_KEY is not set — using fallback user identity. Set a real key in .env for full profile sync.');
      }

      // Check if user already exists by email (legacy sync / same email)
      user = await User.findOne({ email });
      if (user) {
        user.clerkId = clerkUserId;
        user.authMethod = 'clerk';
        await user.save();
      } else {
        // Create a new MongoDB user from Clerk identity
        user = new User({
          name,
          email,
          clerkId: clerkUserId,
          avatar,
          authMethod: 'clerk',
        });
        await user.save();
        console.log('[Auth] New user created:', email);
      }
    }

    // Attach MongoDB user to request for downstream handlers
    req.mongoUser = user;
    next();
  } catch (err) {
    console.error('[Auth] DB Sync Error:', err);
    res.status(500).json({ error: 'Database synchronization failed' });
  }
};

/**
 * protectRoute: Array middleware — verify Clerk JWT then sync to MongoDB.
 * Usage: app.get('/api/...', protectRoute, handler)
 */
const protectRoute = [requireClerkAuth, syncUser];

module.exports = { protectRoute, syncUser, requireClerkAuth };
