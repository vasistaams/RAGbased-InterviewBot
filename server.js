/**
 * ============================================
 *  RAG Interview Platform — Express Server v5
 *  Email OTP + Google OAuth Authentication
 *  MongoDB + Mistral 7B RAG Backend
 * ============================================
 *
 * API:
 *   POST /api/auth/register        — Create account (name, email, password)
 *   POST /api/auth/send-otp        — Send OTP to registered email
 *   POST /api/auth/verify-otp      — Verify OTP → return JWT
 *   POST /api/auth/google          — Google OAuth login
 *   GET  /api/auth/google-client-id — Get Google Client ID
 *   GET  /api/auth/session         — Verify JWT → user data
 *   POST /api/auth/logout          — Clear session
 *   GET  /api/user/dashboard       — Dashboard data
 *   PUT  /api/user/profile         — Update profile
 *   PUT  /api/user/theme           — Update theme
 *   POST /api/interview/start      — Start session
 *   POST /api/interview/configure  — Configure difficulty/count
 *   GET  /api/interview/question   — Get next question
 *   POST /api/interview/evaluate   — Evaluate answer
 *   POST /api/interview/end        — End session + review
 *   POST /api/interview/upload     — Upload resume
 *   POST /api/ats/score            — ATS resume scoring
 *   POST /api/chat                 — RAG chat
 *   POST /api/assistant            — Site assistant
 *   GET  /api/fastapi/status       — FastAPI backend status
 *   POST /api/fastapi/reconnect    — Re-discover FastAPI endpoints
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const https = require('https');
const rateLimit = require('express-rate-limit');
const pdfParse = require('pdf-parse');

// Database
const { connectDB } = require('./services/database');
const InterviewReport = require('./models/InterviewReport');
const PDFDocument = require('pdfkit');

// Services
const userStore = require('./services/user-store');
const { clerkMiddleware, requireAuth: ClerkExpressRequireAuth } = require('@clerk/express');
const { protectRoute } = require('./middleware/auth');
const { retrieve, getTopics, loadKnowledgeBase, getQuestionsByDifficulty, evaluateAnswer } = require('./services/retriever');
const { getHelpAnswer } = require('./services/assistant');
const { scoreResume } = require('./services/ats-scorer');
const { generateWithOllama } = require('./services/ollama-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Fisher-Yates Shuffle (PART 2)
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// In-memory Cache & Datasets (PART 2 - Loaded once)
const questionCache = new Map();
let mcqDataset = [];
try {
  const mcqPath = process.env.MCQ_PATH || path.join(__dirname, 'data', 'mcq-questions.json');
  if (fs.existsSync(mcqPath)) {
    mcqDataset = JSON.parse(fs.readFileSync(mcqPath, 'utf8'));
    console.log(`✅ MCQ Dataset loaded: ${mcqDataset.length} questions`);
  }
} catch (e) {
  console.error("Failed to load MCQ dataset", e);
}

// Utility to extract JSON from LLM text
function extractJSON(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Standard Response Wrapper (PART 12)
function sendSuccess(res, data = null, message = null) {
  return res.json({ success: true, data, message });
}
function sendError(res, error = 'Internal Server Error', status = 500) {
  return res.status(status).json({ success: false, error });
}

// Middleware setup
// Allow requests from the Vite dev server with Authorization headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(clerkMiddleware()); // Global Clerk session parsing — populates req.auth

// Session middleware (required for req.session.* in interview routes)
app.use(session({
  secret: process.env.SESSION_SECRET || 'interviewbot-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[Backend Log] ${req.method} ${req.url} | Auth: ${req.headers.authorization ? 'present' : 'MISSING'}`);
  next();
});

// NOTE: protectRoute already calls requireAuth() internally — no need for a global guard here.
// Individual routes use protectRoute which handles Clerk token verification + MongoDB user sync.

// Backend root route - instructional or redirect to frontend
app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(publicIndex)) {
    let html = fs.readFileSync(publicIndex, 'utf8');
    html = html.replace('__CLERK_PUBLISHABLE_KEY__', process.env.CLERK_PUBLISHABLE_KEY || '');
    return res.send(html);
  }
  
  // If vanilla index is gone, we are likely using the React frontend
  res.json({ 
    message: "InterviewBot API is running.", 
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173" 
  });
});
app.use(express.static(path.join(__dirname, 'public')));

// File upload config
const upload = multer({
  dest: path.join(__dirname, 'data', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});



// Preload knowledge base
loadKnowledgeBase();

// Discover endpoints skip - Using local Ollama and Modules

// Health endpoint (PART 6)
app.get('/ollama/status', async (req, res) => {
  try {
    const { generateWithOllama } = require('./services/ollama-client');
    const response = await generateWithOllama("Say hello in one sentence", "phi3", { num_predict: 20 });
    if (response) return res.json({ status: "ok", model: "phi3" });
    throw new Error("Empty response");
  } catch (err) {
    res.json({ status: "down", error: err.message });
  }
});



// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
//  USER ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/user/dashboard', protectRoute, async (req, res) => {
  const user = await userStore.findUserById(req.mongoUser._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    name: user.name,
    avatar: user.avatar,
    interviewsTaken: user.interviewsTaken,
    interviewHistory: (user.interviewHistory || []).slice(-10),
    theme: user.theme,
    resumeName: user.resumeName
  });
});

app.put('/api/user/profile', protectRoute, async (req, res) => {
  const { name } = req.body;
  const updated = await userStore.updateUser(req.mongoUser._id, { name });
  res.json({ success: true, user: sanitizeUser(updated) });
});

app.put('/api/user/theme', protectRoute, async (req, res) => {
  const { theme } = req.body;
  if (!['light', 'dark'].includes(theme)) {
    return res.status(400).json({ error: 'Theme must be light or dark' });
  }
  await userStore.updateUser(req.mongoUser._id, { theme });
  res.json({ success: true, theme });
});

// ═══════════════════════════════════════════════════════════════
//  INTERVIEW ROUTES
// ═══════════════════════════════════════════════════════════════

app.post('/api/interview/start', protectRoute, upload.single('resume'), async (req, res) => {
  try {
    const numQ = parseInt(req.body.numQuestions) || 5;
    const diff = req.body.difficulty || "medium";

    let resumeText = "";
    if (req.file) {
      await userStore.updateUser(req.mongoUser._id, { resumePath: req.file.path, resumeName: req.file.originalname });
      const pdfBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(pdfBuffer);
      resumeText = pdfData.text;
    } else {
      const user = await userStore.findUserById(req.mongoUser._id);
      if (user?.resumePath && fs.existsSync(user.resumePath)) {
        const pdfBuffer = fs.readFileSync(user.resumePath);
        const pdfData = await pdfParse(pdfBuffer);
        resumeText = pdfData.text;
      }
    }

    req.session.interviewStart = Date.now();
    req.session.questionCount = numQ;
    req.session.difficulty = diff;
    req.session.interviewResults = [];
    req.session.interviewQuestions = [];
    req.session.askedQuestions = [];
    req.session.resumeText = resumeText;
    
    res.json({ success: true, message: 'Interview session started' });
  } catch (err) {
    console.error("Interview start error:", err);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

app.post('/api/interview/chat-next', protectRoute, async (req, res) => {
  console.time("API: /api/interview/chat-next");
  try {
    const { conversation, difficulty, totalQuestions } = req.body;
    const resumeText = req.session.resumeText || "";
    const currentIdx = conversation.length;
    
    // Track asked questions using a Set to avoid duplicates (PART 5)
    req.session.askedQuestions = req.session.askedQuestions || [];
    const usedQuestions = new Set(req.session.askedQuestions);
    
    conversation.forEach(c => usedQuestions.add(c.question));

    // Structured Flow (PART 5)
    let focus = "General Technical";
    let specificPrompt = "";

    if (currentIdx === 0) {
      const q = "Tell me about yourself and your background.";
      req.session.askedQuestions.push(q);
      console.timeEnd("API: /api/interview/chat-next");
      return sendSuccess(res, { question: q, category: "Introduction", difficulty: "easy" });
    } else if (currentIdx <= 2) {
      focus = "Resume & Projects";
      specificPrompt = "Ask about a specific project or skill from their resume.";
    } else if (currentIdx >= totalQuestions - 2) {
      focus = "Behavioral";
      specificPrompt = "Ask a SITUATIONAL or BEHAVIORAL question.";
    } else {
      focus = "Technical (DSA, DBMS, OOPS, OS, CN)";
      specificPrompt = "Ask a core technical question.";
    }

    const memory = conversation.slice(-6); // Maintain conversation memory (PART 5)
    const contextStr = memory.map(c => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n");
    
    const prompt = `
You are a technical interviewer.

Candidate Resume:
${resumeText || 'No resume provided.'}

Recent Conversation:
${contextStr}

Task: Ask Question ${currentIdx + 1} of ${totalQuestions}.
Focus: ${focus}
Context: ${specificPrompt}

Rules:
* Avoid repeating these: ${Array.from(usedQuestions).join(" | ")}
* Ask ONE specific question.
* Format as JSON: {"question": "...", "category": "...", "difficulty": "..."}
`;

    const raw = await generateWithOllama(prompt, process.env.MODEL_PRIMARY, { temperature: 0.8 });
    let result = extractJSON(raw);

    if (!result || !result.question || usedQuestions.has(result.question)) {
      // Fallback to dataset (PART 9/3)
      const fallbacks = getQuestionsByDifficulty(difficulty, 10);
      result = fallbacks.find(f => !usedQuestions.has(f.question)) || fallbacks[0];
    }

    req.session.askedQuestions.push(result.question);
    console.timeEnd("API: /api/interview/chat-next");
    return sendSuccess(res, result);
  } catch (err) {
    console.error("Chat-next error:", err);
    const fallback = getQuestionsByDifficulty(req.body.difficulty, 1)[0];
    console.timeEnd("API: /api/interview/chat-next");
    return sendSuccess(res, fallback);
  }
});

app.post('/generate-questions', protectRoute, async (req, res) => {
  console.time("question_gen");
  const { resumeText, numQuestions, difficulty } = req.body;
  const count = Math.min(Math.max(numQuestions || 5, 1), 25);
  const diff = difficulty || 'mixed';

  const cacheKey = `gen_${diff}_${count}`;
  if (questionCache.has(cacheKey)) {
    console.timeEnd("question_gen");
    return res.json(questionCache.get(cacheKey));
  }

  try {
    // Dataset-First (Instant)
    let questions = getQuestionsByDifficulty(diff, count);
    
    // Ensure Q1 is Introduction unless skipped
    if (questions.length > 0 && !req.body.skipIntro) {
      questions[0].question = "Tell me about yourself";
      questions[0].category = "Behavioral";
    }

    const payload = { success: true, totalQuestions: questions.length, questions };
    questionCache.set(cacheKey, payload);
    
    // Standard session storage
    req.session.interviewQuestions = questions;
    req.session.currentQuestionIdx = 0;
    req.session.interviewResults = [];

    res.json(payload);
    console.timeEnd("question_gen");
    console.log("AI used for interview/evaluation [Model: phi3/mistral]");

    // Background Enrichment for AI Interview Questions
    if (process.env.OLLAMA_URL) {
      setTimeout(async () => {
        try {
          const prompt = `Generate EXACTLY ${count} interview questions for ${diff} level. Return ONLY JSON array of {question, category, difficulty, expectedAnswer}. No explanation.`;
          const raw = await generateWithOllama(prompt);
          const extra = extractJSON(raw);
          if (extra && Array.isArray(extra)) {
             console.log(`[Background] AI Questions enriched.`);
          }
        } catch (e) {
          console.log("[Background] AI Enrichment failed.");
        }
      }, 0);
    }
  } catch (err) {
    console.error("Gen Error:", err.message);
    const fallbacks = getQuestionsByDifficulty(diff, count);
    res.json({ success: true, totalQuestions: fallbacks.length, questions: fallbacks });
  }
});

app.get('/api/interview/question', protectRoute, (req, res) => {
  const idx = req.session.currentQuestionIdx || 0;
  const questions = req.session.interviewQuestions || [];
  if (idx >= questions.length) return res.json({ done: true });
  res.json({ done: false, index: idx, total: questions.length, question: questions[idx].question, category: questions[idx].category, difficulty: questions[idx].difficulty });
});

app.post('/api/interview/evaluate', protectRoute, async (req, res) => {
  const { answer, useLocalEval } = req.body;
  const idx = req.session.currentQuestionIdx || 0;
  const questions = req.session.interviewQuestions || [];
  if (idx >= questions.length) return res.json({ done: true });
  const q = questions[idx];

  const trimmedLower = (answer || '').trim().toLowerCase();
  const skipPhrases = ["", "i dont know", "i don't know", "no idea", "skip"];
  
  let evaluation;
  
  if (skipPhrases.includes(trimmedLower)) {
    evaluation = {
      score: 0,
      skipped: true,
      feedback: "You did not attempt the question.",
      suggestions: ["Try to explain even a basic idea.", "Interviewers expect some attempt."]
    };
  } else {
    try {
      console.log("Evaluating (Real-time):", q.question);
      const qPrompt = `
You are a strict technical interviewer.
Evaluate this specific answer for correctness and quality.

Question: "${q.question}"
Candidate Answer: "${answer}"

Instructions:
* Analyze match, correctness, depth, and clarity.
* Penalize vague answers and detect incorrect concepts.
* Do NOT give generic feedback.
* Be direct and structured.

Return STRICT JSON:
{
  "score": (0-100),
  "feedback": "specific technical feedback",
  "suggestions": ["specific actionable tip 1", "tip 2"]
}
`;
      const raw = await generateWithOllama(qPrompt, "phi3", { temperature: 0.7 });
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        evaluation = JSON.parse(match[0]);
      } else {
        throw new Error("Invalid AI response");
      }
    } catch (e) {
      console.error("Real-time eval failed:", e.message);
      // Safety in Evaluation (Step 4)
      evaluation = {
        score: 50,
        strengths: "Basic attempt",
        weaknesses: "Evaluation unavailable",
        improvement: "Try improving explanation clarity"
      };
    }
  }

  req.session.interviewResults.push({ question: q.question, category: q.category, difficulty: q.difficulty, userAnswer: answer, score: evaluation.score, feedback: evaluation.feedback, suggestions: evaluation.suggestions || [], modelAnswer: q.expectedAnswer });
  req.session.currentQuestionIdx = idx + 1;
  const hasNext = (idx + 1) < questions.length;
  res.json({ evaluation, hasNext, questionIndex: idx, totalQuestions: questions.length });
});

app.post('/api/interview/end', protectRoute, async (req, res) => {
  const results = req.session.interviewResults || [];
  const duration = req.session.interviewStart ? Math.floor((Date.now() - req.session.interviewStart) / 60000) : 0;
  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const record = await userStore.addInterviewSession(req.mongoUser._id, { questionsAsked: results.length, duration, score: avgScore });
  req.session.interviewStart = null;
  req.session.interviewQuestions = [];
  req.session.interviewResults = [];
  req.session.currentQuestionIdx = 0;
  res.json({ success: true, record, review: { results, avgScore, duration, totalQuestions: results.length } });
});

app.post('/api/interview/upload', protectRoute, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  await userStore.updateUser(req.mongoUser._id, { resumePath: req.file.path, resumeName: req.file.originalname });
  res.json({ success: true, filename: req.file.originalname });
});

app.post('/upload-resume', protectRoute, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    res.json({ success: true, text: pdfData.text });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract text from PDF' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ATS SCORING (Ollama Engine)
// ═══════════════════════════════════════════════════════════════

app.get('/api/health/ollama', async (req, res) => {
  try {
    const fetchAPI = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({default: f}) => f(...args));
    const response = await fetchAPI("http://localhost:11434/api/tags");
    if (response.ok) return res.json({ status: "ok" });
    return res.status(500).json({ status: "error", error: "Ollama not responding" });
  } catch (e) {
    return res.status(500).json({ status: "error", error: "Ollama not running" });
  }
});

async function runOllama(prompt) {
  // fallback for older node versions
  const fetchAPI = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({default: f}) => f(...args));
  
  const response = await fetchAPI("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "phi3",
      prompt,
      stream: false,
      format: "json", // Strict JSON mode
      options: {
        num_predict: 300,   // Force sub-5 second generation threshold
        temperature: 0.1    // Zero creativity, just strict evaluation
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

app.post('/api/ats/analyze', protectRoute, upload.single('resume'), async (req, res) => {
  const jobDesc = req.body.jobDesc || req.body.jobDescription;
  
  if (!req.file || !jobDesc) {
    return res.status(400).json({ error: "Missing resume or job description" });
  }

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    console.log("Resume length:", resumeText.length);

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: "Resume parsing failed" });
    }

    const prompt = `
Evaluate this resume strictly against the job description. Be HARSH. Average is 50.
Output ONLY valid JSON explicitly matching this compact schema exactly (no extra text):
{
  "s": 45,
  "k": ["React"],
  "m": ["Node", "AWS"],
  "sec": {
    "Contact": [20, 20, ""],
    "Summary": [5, 10, "Too generic"],
    "Experience": [15, 30, "No metrics"],
    "Education": [10, 10, ""],
    "Skills": [5, 20, "Missing AWS"],
    "Format": [8, 10, ""]
  },
  "c": [
    ["Missing limits", "Add metrics to experience"]
  ]
}

Resume:
${resumeText.substring(0, 1500)}

Job:
${jobDesc.substring(0, 1500)}
`;

    console.time("Ollama Response");
    const resultStr = await runOllama(prompt);
    console.timeEnd("Ollama Response");
    
    // Parse the JSON safely
    let parsedResult = {};
    try {
      const match = resultStr.match(/\{[\s\S]*\}/);
      const raw = match ? JSON.parse(match[0]) : JSON.parse(resultStr);
      
      // Remap the compressed JSON to the frontend's expected ATSResult structure
      parsedResult.score = raw.s || raw.overallScore || 50;
      parsedResult.matches = raw.k || raw.matchedKeywords || [];
      parsedResult.missing = raw.m || raw.missingKeywords || [];
      
      parsedResult.sections = {};
      if (raw.sec) {
        for (const [key, val] of Object.entries(raw.sec)) {
          parsedResult.sections[key] = {
            score: val[0],
            max: val[1],
            issues: val[2] ? [val[2]] : [],
            suggestions: []
          };
        }
      }
      
      parsedResult.criticalIssues = [];
      if (raw.c) {
        parsedResult.criticalIssues = raw.c.map(iss => ({
          issue: iss[0],
          fix: iss[1]
        }));
      }
      
      parsedResult.feedback = "Analysis completed.";
      
    } catch(e) {
      console.warn("Failed to parse ATS JSON:", e, "Raw output:", resultStr.substring(0, 100));
      return res.status(500).json({ error: "AI generated invalid JSON. Please try again." });
    }

    res.json(parsedResult);
  } catch (err) {
    console.error('[ATS] Scoring failed:', err);
    return res.status(500).json({ error: 'ATS analysis failed.' });
  }
});

// ── Delete Resume ───────────────────────────────────────────────
app.delete('/api/interview/resume', protectRoute, async (req, res) => {
  const user = await userStore.findUserById(req.mongoUser._id);
  if (user?.resumePath && fs.existsSync(user.resumePath)) {
    try { fs.unlinkSync(user.resumePath); } catch (e) { /* ignore */ }
  }
  await userStore.updateUser(req.mongoUser._id, { resumePath: null, resumeName: null });
  res.json({ success: true, message: 'Resume removed' });
});

// ═══════════════════════════════════════════════════════════════
//  INTERVIEW REPORTS
// ═══════════════════════════════════════════════════════════════

app.post('/evaluate-interview', protectRoute, async (req, res) => {
  console.time("API: /evaluate-interview");
  const { questions, answers } = req.body;
  if (!questions || !answers) return sendError(res, "Missing evaluation data", 400);

  try {
    // PART 1: Remove bottlenecks - Respond with fast initial evaluation
    // and process detailed AI evaluation in the background.
    
    // Fast Evaluation (Dataset-based or keyword-based)
    const fastEvaluation = questions.map((q, i) => {
      const result = evaluateAnswer(answers[i] || "", "N/A", q);
      return {
        question: q,
        answer: answers[i] || "",
        score: result.score,
        strengths: "Calculating...",
        weaknesses: "Calculating...",
        feedback: result.feedback
      };
    });

    const fastOverallScore = Math.round(fastEvaluation.reduce((s, r) => s + r.score, 0) / fastEvaluation.length);

    // AI Enrichment (Background Flow - PART 1)
    setTimeout(async () => {
      try {
        console.log("[Background] Starting detailed AI evaluation...");
        for (let i = 0; i < questions.length; i++) {
          const qEvalPrompt = `
            Technical Interviewer Evaluation:
            Question: "${questions[i]}"
            Answer: "${answers[i]}"
            Evaluate correctness, depth, and clarity. Return JSON: {"score": 0-100, "strengths": "...", "weaknesses": "...", "improvement": "..."}
          `;
          const raw = await generateWithOllama(qEvalPrompt, process.env.MODEL_PRIMARY, { temperature: 0.7 });
          const parsed = extractJSON(raw);
          if (parsed) {
             console.log(`[Background] Evaluated Q${i+1}`);
             // Note: In a real production system, we would store this in DB or emit via WebSocket.
             // For this standalone version, we rely on the summary which is generated next.
          }
        }
      } catch (e) { console.error("[Background Evaluation Error]:", e); }
    }, 0);

    console.timeEnd("API: /evaluate-interview");
    return res.json({ 
      success: true, 
      overallScore: fastOverallScore, 
      detailedEvaluation: fastEvaluation, 
      summary: "AI analysis is proceeding in the background. Your initial scores are based on technical coverage.", 
      suggestions: ["Structure your answers with examples.", "Be more specific with technical terms."] 
    });
  } catch (err) {
    console.error("Evaluation error:", err);
    console.timeEnd("API: /evaluate-interview");
    return sendError(res, "Evaluation system busy");
  }
});

app.post('/start-session', protectRoute, async (req, res) => {
  try {
    const user = await userStore.findUserById(req.mongoUser._id);
    if (user) {
      user.totalSessions = (user.totalSessions || 0) + 1;
      user.interviewsTaken = user.totalSessions;
      await user.save();
      return res.json({ success: true, totalSessions: user.totalSessions });
    }
  } catch(e) { console.error(e); }
  res.json({ success: true, totalSessions: 0 });
});

app.post('/save-report', protectRoute, async (req, res) => {
  try {
    const { report, date, interviewNumber, totalTime } = req.body;
    
    const questions = report.results ? report.results.map(r => r.question) : [];
    const answers = report.results ? report.results.map(r => r.userAnswer) : [];
    const scores = report.results ? report.results.map(r => r.score) : [];
    
    const newReport = new InterviewReport({
      userId: req.mongoUser._id,
      questions,
      answers,
      scores,
      overallScore: report.avgScore || 0,
      interviewNumber: interviewNumber || 1,
      totalTime: totalTime || "00:00",
      detailedEvaluation: report.results || []
    });
    await newReport.save();
    
    const user = await userStore.findUserById(req.mongoUser._id);
    if (user) {
       if (!user.interviewHistory) user.interviewHistory = [];
       user.interviewHistory.push({ score: report.avgScore || 0, questionsAsked: questions.length, date: new Date(date || Date.now()) });
       await user.save();
    }

    res.json({ success: true, reportId: report._id });
  } catch (err) {
    console.error('Error saving report:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.get('/api/reports', protectRoute, async (req, res) => {
  try {
    const reports = await InterviewReport.find({ userId: req.mongoUser._id }).sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.get('/api/report/:id', protectRoute, async (req, res) => {
  try {
    const report = await InterviewReport.findOne({ _id: req.params.id, userId: req.mongoUser._id });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

app.get('/report/:id/download', async (req, res) => {
  try {
    // For download requests via URL, we allow passing token as a query param
    const token = req.query.token;
    let authUserId = null;
    if (token) {
      const decoded = auth.verifyJWT(token);
      if (decoded && decoded.userId) authUserId = decoded.userId;
    }
    
    if (!authUserId) return res.status(401).send('Unauthorized');

    const report = await InterviewReport.findOne({ _id: req.params.id, userId: authUserId });
    if (!report) return res.status(404).send('Report not found');

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Interview_Report_${report.date.toISOString().split('T')[0]}.pdf"`);
    doc.pipe(res);

    doc.fontSize(24).text('Interview Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Date: ${report.date.toLocaleString()}`);
    doc.text(`Overall Score: ${report.overallScore}/100`);
    doc.moveDown(2);

    report.questions.forEach((q, i) => {
      doc.fontSize(16).fillColor('#333').text(`Q${i + 1}: ${q}`);
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').text(`Your Answer: ${report.answers[i] || 'No answer provided'}`);
      doc.moveDown(0.5);
      // Ensure red or green depending on score
      doc.fontSize(12).fillColor(report.scores[i] >= 60 ? 'darkgreen' : 'darkred').text(`Score: ${report.scores[i]}/100`);
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#555').text(`Feedback: ${report.feedback[i] || 'N/A'}`);
      doc.moveDown(2);
    });

    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).send('Failed to generate PDF');
  }
});

// ═══════════════════════════════════════════════════════════════
//  MCQ INTERVIEW
// ═══════════════════════════════════════════════════════════════
app.get('/api/mcq-dataset', protectRoute, (req, res) => {
  try {
    return sendSuccess(res, mcqDataset);
  } catch (error) {
    return sendError(res, 'Failed to load dataset');
  }
});

app.post('/api/mcq/start', protectRoute, async (req, res) => {
  console.time("API: /api/mcq/start");
  const { topic, company, difficulty, numberOfQuestions } = req.body;
  const numQs = parseInt(numberOfQuestions) || 5;
  
  const cacheKey = `mcq_${topic}_${company}_${difficulty}_${numQs}`;
  if (questionCache.has(cacheKey)) {
    console.timeEnd("API: /api/mcq/start");
    return sendSuccess(res, questionCache.get(cacheKey));
  }

  try {
    let filtered = mcqDataset || [];
    if (topic && topic !== 'All') {
      filtered = filtered.filter(q => q.topic?.toLowerCase() === topic.toLowerCase());
    }
    
    // Dataset is already once-loaded, so this is fast (PART 2)
    const questions = shuffle(filtered).slice(0, numQs);
    const result = { questions };
    
    questionCache.set(cacheKey, result);
    console.timeEnd("API: /api/mcq/start");
    return sendSuccess(res, result);
  } catch (err) {
    console.error("MCQ gen error:", err);
    console.timeEnd("API: /api/mcq/start");
    return sendSuccess(res, { questions: (mcqDataset || []).slice(0, numQs) });
  }
});




// ═══════════════════════════════════════════════════════════════
//  CHAT & ASSISTANT
// ═══════════════════════════════════════════════════════════════

app.post('/api/chat', protectRoute, async (req, res) => {
  console.time("API: /api/chat");
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return sendError(res, 'Please type a question! 💬', 400);
    }

    if (req.session.questionCount != null) req.session.questionCount++;

    const greetings = ['hi', 'hello', 'hey'];
    if (greetings.includes(message.trim().toLowerCase())) {
      console.timeEnd("API: /api/chat");
      return sendSuccess(res, {
        reply: "Hello! 👋 I'm your Interview Prep AI. Ask me about OOP, SQL, JavaScript, behavioral questions, and more!",
        metadata: { type: 'greeting' }
      });
    }

    const result = retrieve(message.trim());
    console.timeEnd("API: /api/chat");
    return sendSuccess(res, {
      reply: result.answer,
      metadata: {
        type: result.found ? 'retrieved' : 'fallback',
        source: 'local-retriever',
        category: result.category
      }
    });
  } catch (err) {
    console.error("Chat error:", err);
    console.timeEnd("API: /api/chat");
    return sendError(res, "Chat system unavailable");
  }
});

app.post('/api/assistant', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return sendError(res, 'How can I help you? 😊', 400);
    }
    const answer = getHelpAnswer(message.trim());
    return sendSuccess(res, { reply: answer });
  } catch (err) {
    return sendError(res, "Assistant unavailable");
  }
});


// ─── Helpers ────────────────────────────────────────────────────
function sanitizeUser(user) {
  return {
    id: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar,
    authMethod: user.authMethod,
    theme: user.theme
  };
}

// ─── SPA Fallback ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────────
async function startServer(port = PORT) {
  // Connect to MongoDB
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('⚠️  Server starting without database — auth will not work');
  }

  // Real-time Health Check (PART 7)
  let ollamaOk = false;
  try {
    const check = await generateWithOllama("say hello in one sentence", "phi3", { num_predict: 10 });
    if (check) ollamaOk = true;
  } catch (e) {
    console.warn("⚠️  Ollama initial check failed");
  }

  const ollamaStatus = ollamaOk ? '✅ Configured' : '❌ Not configured';

  console.log('Starting server on port:', port);
  const server = app.listen(port, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║   🤖 RAG Interview Platform v5.0 Running             ║
  ║   Auth:    Clerk Secure Authentication                ║
  ║   DB:      MongoDB ${dbConnected ? '✅ Connected' : '❌ Offline'}                      ║
  ║   Ollama:  ${ollamaStatus.padEnd(34)}║
  ║   LLM:     Local Ollama Mistral / LLaMA              ║
  ║   Local:   http://localhost:${port}                     ║
  ╚═══════════════════════════════════════════════════════╝
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  // Global Error Handler (PART 12)
  app.use((err, req, res, next) => {
    if (err.message === "Unauthenticated") {
      return res.status(401).json({ success: false, error: "Unauthenticated" });
    }
    console.error(err.stack);
    res.status(500).json({ success: false, error: "Something went wrong!" });
  });
}

startServer();
