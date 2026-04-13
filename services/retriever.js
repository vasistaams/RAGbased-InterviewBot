/**
 * ============================================
 *  RAG Retriever Service
 * ============================================
 * 
 * This module implements the Retrieval logic of the RAG pipeline.
 * It uses keyword matching with TF-IDF-inspired scoring to find
 * the most relevant answer from the knowledge base.
 * 
 * For production use, replace this with:
 *  - Vector embeddings (OpenAI, Sentence Transformers)
 *  - Vector database (Pinecone, Weaviate, ChromaDB)
 * 
 * See: services/openai-integration.js for OpenAI upgrade path.
 */

const fs = require('fs');
const path = require('path');

// ─── Load Knowledge Base ──────────────────────────────────────────
let knowledgeBase = null;

function loadKnowledgeBase() {
  if (knowledgeBase) return knowledgeBase;

  const kbPath = path.join(__dirname, '..', 'knowledge.json');
  const rawData = fs.readFileSync(kbPath, 'utf-8');
  knowledgeBase = JSON.parse(rawData);

  console.log(`📚 Knowledge base loaded: ${knowledgeBase.entries.length} entries`);
  return knowledgeBase;
}

// ─── Difficulty Mapping ──────────────────────────────────────────
const DIFFICULTY_MAP = {
  1: 'easy', 2: 'easy', 3: 'easy', 7: 'easy', 8: 'easy', 9: 'easy',
  4: 'medium', 5: 'medium', 6: 'medium', 10: 'medium', 11: 'medium',
  12: 'medium', 13: 'medium', 16: 'medium', 17: 'medium', 18: 'medium',
  14: 'hard', 15: 'hard', 19: 'hard', 20: 'hard'
};

function getDifficulty(id) { return DIFFICULTY_MAP[id] || 'medium'; }

/**
 * Get random questions filtered by difficulty.
 * @param {string} difficulty - 'easy', 'medium', 'hard', or 'mixed'
 * @param {number} count - Number of questions to return
 */
function getQuestionsByDifficulty(difficulty, count) {
  const kb = loadKnowledgeBase();
  let filtered = kb.entries;
  if (difficulty !== 'mixed') {
    filtered = kb.entries.filter(e => getDifficulty(e.id) === difficulty);
  }
  // Shuffle and take 'count' entries
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(e => ({
    id: e.id,
    question: e.question,
    category: e.category,
    difficulty: getDifficulty(e.id),
    expectedAnswer: e.answer
  }));
}

/**
 * Evaluate a user's answer against the expected answer.
 * Returns a score 0-100 and improvement suggestions.
 */
function evaluateAnswer(userAnswer, expectedAnswer, question) {
  if (!userAnswer || userAnswer.trim().length < 5) {
    return { score: 10, feedback: 'Your answer was too short. Try to provide a detailed, structured response.', suggestions: ['Provide more detail', 'Use examples', 'Structure your answer with clear points'] };
  }
  const userTokens = new Set(removeStopwords(preprocessText(userAnswer)));
  const expectedTokens = removeStopwords(preprocessText(expectedAnswer));
  const importantTerms = [...new Set(expectedTokens)].slice(0, 30);
  let matches = 0;
  for (const term of importantTerms) {
    if (userTokens.has(term)) matches++;
  }
  const coverage = importantTerms.length > 0 ? matches / importantTerms.length : 0;
  const lengthFactor = Math.min(userAnswer.length / 100, 1);
  const rawScore = Math.round((coverage * 70) + (lengthFactor * 30));
  const score = Math.min(Math.max(rawScore, 15), 98);

  const suggestions = ['Expand on technical implementation details', 'Include relevant real-world use cases'];

  let feedback;
  if (score >= 80) feedback = 'Excellent response! You covered the key concepts well. 🌟';
  else if (score >= 60) feedback = 'Good answer, but there\'s room for improvement. Review the suggested answer for missed points. 👍';
  else if (score >= 40) feedback = 'You touched on some points, but missed several key concepts. Study the model answer below. 📖';
  else feedback = 'This needs significant improvement. Review the complete model answer and practice again. 💪';

  return { score, feedback, suggestions };
}

// ─── Text Preprocessing ──────────────────────────────────────────
/**
 * Cleans and normalizes text for better matching.
 * Removes punctuation, converts to lowercase, and splits into tokens.
 */
function preprocessText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')   // Remove punctuation
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim()
    .split(' ')
    .filter(word => word.length > 1); // Remove single characters
}

// ─── Stopwords (common words to ignore) ──────────────────────────
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for',
  'of', 'and', 'or', 'but', 'not', 'with', 'this', 'that', 'by',
  'from', 'as', 'be', 'was', 'are', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'can', 'what', 'how', 'which', 'when', 'where', 'who',
  'whom', 'why', 'me', 'my', 'i', 'you', 'your', 'we', 'they',
  'he', 'she', 'his', 'her', 'its', 'our', 'their', 'about',
  'if', 'then', 'so', 'just', 'than', 'also', 'very', 'some',
  'tell', 'please', 'explain', 'describe', 'know', 'want'
]);

/**
 * Removes stopwords from a token array.
 */
function removeStopwords(tokens) {
  return tokens.filter(token => !STOPWORDS.has(token));
}

// ─── Scoring Algorithm ───────────────────────────────────────────
/**
 * Calculates a relevance score between the user query and a KB entry.
 * Uses a multi-factor scoring approach:
 *   1. Exact keyword match (highest weight)
 *   2. Partial keyword match
 *   3. Question similarity
 *   4. Bigram matching (for phrases)
 */
function calculateScore(queryTokens, entry) {
  let score = 0;
  const queryText = queryTokens.join(' ');
  const cleanedQueryTokens = removeStopwords(queryTokens);

  // ── Factor 1: Exact keyword match (weight: 10) ────────────────
  for (const keyword of entry.keywords) {
    const keywordLower = keyword.toLowerCase();

    // Full phrase match in query text
    if (queryText.includes(keywordLower)) {
      score += 10 * keywordLower.split(' ').length; // Multi-word keywords score higher
    }
  }

  // ── Factor 2: Individual token match against keywords (weight: 3) ──
  for (const token of cleanedQueryTokens) {
    for (const keyword of entry.keywords) {
      const keywordTokens = keyword.toLowerCase().split(' ');
      if (keywordTokens.includes(token)) {
        score += 3;
      }
    }
  }

  // ── Factor 3: Question similarity (weight: 2) ─────────────────
  const questionTokens = removeStopwords(preprocessText(entry.question));
  for (const token of cleanedQueryTokens) {
    if (questionTokens.includes(token)) {
      score += 2;
    }
  }

  // ── Factor 4: Bigram matching (weight: 5) ─────────────────────
  // Matches two-word phrases for better context understanding
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
    for (const keyword of entry.keywords) {
      if (keyword.toLowerCase().includes(bigram)) {
        score += 5;
      }
    }
  }

  return score;
}

// ─── Main Retrieval Function ─────────────────────────────────────
/**
 * Retrieves the best matching answer from the knowledge base.
 * 
 * @param {string} query - The user's question
 * @returns {object} - { found: boolean, answer: string, question: string, category: string, score: number }
 */
function retrieve(query) {
  const kb = loadKnowledgeBase();
  const queryTokens = preprocessText(query);

  if (queryTokens.length === 0) {
    return {
      found: false,
      answer: "I didn't catch that. Could you please rephrase your question?",
      question: null,
      category: null,
      score: 0
    };
  }

  // Score every entry in the knowledge base
  const scoredEntries = kb.entries.map(entry => ({
    entry,
    score: calculateScore(queryTokens, entry)
  }));

  // Sort by score (descending)
  scoredEntries.sort((a, b) => b.score - a.score);

  const bestMatch = scoredEntries[0];

  // Minimum threshold to consider a match valid
  const SCORE_THRESHOLD = 5;

  if (bestMatch.score >= SCORE_THRESHOLD) {
    return {
      found: true,
      answer: bestMatch.entry.answer,
      question: bestMatch.entry.question,
      category: bestMatch.entry.category,
      score: bestMatch.score
    };
  }

  // ── Fallback: No good match found ─────────────────────────────
  return {
    found: false,
    answer: getFallbackResponse(query),
    question: null,
    category: null,
    score: bestMatch.score
  };
}

// ─── Fallback Responses ──────────────────────────────────────────
/**
 * Returns a helpful fallback when no matching answer is found.
 */
function getFallbackResponse(query) {
  const kb = loadKnowledgeBase();
  const categories = kb.categories.join(', ');

  const fallbacks = [
    `I don't have a specific answer for that yet, but I'm always learning! 📚\n\nI can help you with topics like: **${categories}**.\n\nTry asking me about:\n• "Tell me about yourself"\n• "What are OOP concepts?"\n• "Explain SQL joins"\n• "How to handle team conflict?"`,

    `That's a great question! Unfortunately, it's not in my knowledge base yet. 🤔\n\nHere are some topics I can help with:\n• **Introduction** — Self-introduction tips\n• **Behavioral** — Strengths, weaknesses, conflict resolution\n• **Technical** — OOP, SQL, JavaScript, System Design\n• **Situational** — Career goals, challenging projects`,

    `I'm not sure about that one! My expertise covers these interview topics: **${categories}**.\n\nFeel free to ask me anything related to these areas! 🎯`
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ─── Get Available Topics ────────────────────────────────────────
/**
 * Returns a list of all available topics/questions in the knowledge base.
 * Useful for showing users what they can ask.
 */
function getTopics() {
  const kb = loadKnowledgeBase();
  return kb.entries.map(entry => ({
    id: entry.id,
    category: entry.category,
    question: entry.question,
    difficulty: getDifficulty(entry.id)
  }));
}

// ─── Exports ─────────────────────────────────────────────────────
module.exports = {
  retrieve,
  getTopics,
  loadKnowledgeBase,
  getQuestionsByDifficulty,
  evaluateAnswer
};
