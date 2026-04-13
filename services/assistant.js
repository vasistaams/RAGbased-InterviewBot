/**
 * ============================================
 *  AI Assistant — Website Usage Help
 * ============================================
 * 
 * Answers user queries about how to use the platform.
 * Separate from the interview RAG knowledge base.
 */

const helpEntries = [
  {
    keywords: ['start', 'begin', 'interview', 'mock', 'practice', 'session'],
    answer: "To start a mock interview session:\n\n1. Go to your **Dashboard** (Home page)\n2. Click the **\"Start Mock Interview\"** button\n3. Optionally upload your resume for personalized questions\n4. Start chatting with the AI interviewer!\n\nYou can ask questions on OOP, SQL, JavaScript, behavioral topics, and more. 🎯"
  },
  {
    keywords: ['upload', 'resume', 'cv', 'pdf', 'document'],
    answer: "To upload your resume:\n\n1. Start a new **Mock Interview Session**\n2. You'll see a **drag-and-drop upload area**\n3. Drop your PDF file or click to browse\n4. Your resume will be saved for the session\n\nSupported formats: **PDF** (max 5MB) 📄"
  },
  {
    keywords: ['rank', 'ranking', 'leaderboard', 'global', 'regional', 'score'],
    answer: "Your rankings are shown on the **Dashboard**:\n\n• **Global Ranking** — Your position among all users worldwide\n• **Regional Ranking** — Your position in your region\n• **Performance Graph** — Shows your interview scores over time\n\nThe more interviews you take and the better you score, the higher your ranking! 📊"
  },
  {
    keywords: ['theme', 'dark', 'light', 'mode', 'color', 'appearance'],
    answer: "To switch between light and dark mode:\n\n1. Click your **profile avatar** in the top-right corner\n2. Go to **Settings**\n3. Toggle the **Theme** switch between Light and Dark mode\n\nYour preference is saved automatically! 🌙☀️"
  },
  {
    keywords: ['logout', 'sign out', 'log out', 'exit'],
    answer: "To logout:\n\n1. Click your **profile avatar** in the navigation bar\n2. Go to **Settings**\n3. Scroll down and click the **\"Logout\"** button\n\nYou'll be redirected to the login page. 👋"
  },
  {
    keywords: ['profile', 'account', 'settings', 'edit', 'name', 'email'],
    answer: "To view or edit your profile:\n\n1. Click your **profile avatar** in the navigation bar\n2. Go to **Settings**\n3. You can see your name, email, phone, and login method\n\nProfile details are tied to your login method (Google or Phone). ⚙️"
  },
  {
    keywords: ['login', 'sign in', 'google', 'otp', 'phone', 'authenticate'],
    answer: "You can login using two methods:\n\n• **Google Sign-In** — Click \"Continue with Google\" for quick access\n• **Mobile OTP** — Enter your phone number, receive a 6-digit code, and verify\n\nBoth methods create your account automatically on first login! 🔐"
  },
  {
    keywords: ['help', 'support', 'how', 'what', 'can', 'feature', 'use'],
    answer: "I'm your **Platform Assistant**! I can help you with:\n\n• 🎤 Starting mock interview sessions\n• 📄 Uploading your resume\n• 📊 Understanding your rankings and scores\n• 🌙 Switching themes (light/dark)\n• ⚙️ Managing your profile and settings\n• 🔐 Login and authentication\n\nJust ask me anything about using the platform!"
  }
];

/**
 * Find the best help answer for a query.
 */
function getHelpAnswer(query) {
  const tokens = query.toLowerCase().split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of helpEntries) {
    let score = 0;
    for (const token of tokens) {
      for (const keyword of entry.keywords) {
        if (keyword.includes(token) || token.includes(keyword)) score += 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return bestMatch.answer;
  }

  return "I'm not sure about that! 🤔 Here's what I can help you with:\n\n• Starting mock interviews\n• Uploading resumes\n• Understanding rankings\n• Theme switching\n• Profile settings\n• Login help\n\nTry asking about any of these topics!";
}

module.exports = { getHelpAnswer };
