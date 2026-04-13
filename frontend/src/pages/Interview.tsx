import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Send,
  StopCircle,
  Sparkles,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { raw } from "../services/api";

/* ── Types ──────────────────────────────────────────────── */
interface Message {
  type: "bot" | "user";
  text: string;
  category?: string;
}

interface ReviewResult {
  question: string;
  userAnswer: string;
  category: string;
  difficulty: string;
  score: number;
  feedback: string;
  suggestions: string[];
  modelAnswer?: string;
}

interface ReviewData {
  results: ReviewResult[];
  avgScore: number;
  duration: number;
  totalQuestions: number;
}

/* ── Component ──────────────────────────────────────────── */
export default function Interview() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"config" | "chat" | "review">("config");

  // Config state
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 5 });
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Start Interview ──────────────────────────────────── */
  const startInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      // Increment session counter on backend
      await raw.post("/start-session");

      // Start the interview session (server sets up session state)
      await api.post("/interview/start");

      // Get first question
      const res = await api.post("/interview/chat-next", {
        conversation: [],
        difficulty,
        totalQuestions: questionCount,
      });

      const firstQ = res.data.data;
      setMessages([{ type: "bot", text: firstQ.question, category: firstQ.category }]);
      setProgress({ current: 1, total: questionCount });
      setStep("chat");
    } catch (err) {
      console.error("Failed to start interview", err);
      setError("Failed to start interview. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  /* ── Submit Answer ────────────────────────────────────── */
  const submitAnswer = async () => {
    if (!currentInput.trim() || loading) return;
    const userMsg = currentInput.trim();
    setCurrentInput("");
    setMessages((prev) => [...prev, { type: "user", text: userMsg }]);
    setLoading(true);
    setError(null);

    try {
      // Build conversation history
      const botMessages = messages.filter((m) => m.type === "bot");
      const userMessages = messages.filter((m) => m.type === "user");
      const conversation = botMessages.map((m, i) => ({
        question: m.text,
        answer: i === botMessages.length - 1 ? userMsg : userMessages[i]?.text || "...",
      }));

      // Evaluate the current answer on the backend
      await api.post("/interview/evaluate", { answer: userMsg });

      if (progress.current >= questionCount) {
        // End the interview → get review
        const endRes = await api.post("/interview/end");
        const reviewData = endRes.data.review as ReviewData;
        setReview(reviewData);

        // Save report to MongoDB
        try {
          await raw.post("/save-report", {
            report: reviewData,
            date: new Date().toISOString(),
            interviewNumber: reviewData.totalQuestions,
            totalTime: `${reviewData.duration || 0}:00`,
          });
        } catch {
          console.warn("Report save failed (non-critical)");
        }

        setStep("review");
      } else {
        // Get next question
        const res = await api.post("/interview/chat-next", {
          conversation,
          difficulty,
          totalQuestions: questionCount,
        });

        const nextQ = res.data.data;
        setMessages((prev) => [
          ...prev,
          { type: "bot", text: nextQ.question, category: nextQ.category },
        ]);
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }
    } catch (err) {
      console.error("Failed to submit answer", err);
      setError("Failed to process answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── End Early ────────────────────────────────────────── */
  const endEarly = async () => {
    setLoading(true);
    try {
      const endRes = await api.post("/interview/end");
      const reviewData = endRes.data.review as ReviewData;
      setReview(reviewData);

      // Save report
      try {
        await raw.post("/save-report", {
          report: reviewData,
          date: new Date().toISOString(),
          interviewNumber: reviewData.totalQuestions,
          totalTime: `${reviewData.duration || 0}:00`,
        });
      } catch {
        console.warn("Report save failed (non-critical)");
      }

      setStep("review");
    } catch {
      setStep("review");
    } finally {
      setLoading(false);
    }
  };

  /* ── Reset ────────────────────────────────────────────── */
  const resetInterview = () => {
    setStep("config");
    setMessages([]);
    setProgress({ current: 0, total: 5 });
    setReview(null);
    setCurrentInput("");
    setError(null);
  };

  /* ── Difficulty options ───────────────────────────────── */
  const difficultyOptions = [
    { value: "easy", label: "Easy", color: "bg-emerald-500" },
    { value: "medium", label: "Medium", color: "bg-amber-500" },
    { value: "hard", label: "Hard", color: "bg-red-500" },
    { value: "mixed", label: "Mixed", color: "bg-brand-500" },
  ];

  /* ── Score color helper ───────────────────────────────── */
  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-red-500";
  const scoreBg = (s: number) =>
    s >= 80
      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30"
      : s >= 60
        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30"
        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30";

  return (
    <AnimatePresence mode="wait">
      {/* ═══ CONFIG STEP ═══════════════════════════════════ */}
      {step === "config" && (
        <motion.div
          key="config"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configure Your Interview
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Choose your settings and begin a personalized mock session
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6 space-y-6">
            {/* Difficulty */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Difficulty Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {difficultyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={`
                      px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200
                      ${
                        difficulty === opt.value
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-300"
                      }
                    `}
                  >
                    <div className={`w-2 h-2 rounded-full ${opt.color} mx-auto mb-1`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Number of Questions
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="w-10 text-center text-lg font-bold text-brand-600 dark:text-brand-400">
                  {questionCount}
                </span>
              </div>
            </div>

            {/* Start Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startInterview}
              disabled={loading}
              className="
                w-full py-3.5 rounded-xl text-white font-semibold
                gradient-primary shadow-lg hover:shadow-glow
                disabled:opacity-50 transition-all duration-200
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Begin Interview
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ═══ CHAT STEP ═════════════════════════════════════ */}
      {step === "chat" && (
        <motion.div
          key="chat"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]"
        >
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Question {progress.current} of {progress.total}
              </span>
              <button
                onClick={endEarly}
                className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                <StopCircle size={14} />
                End Early
              </button>
            </div>
            <div className="h-2 bg-brand-100 dark:bg-brand-900/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 mb-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="
              flex-1 overflow-y-auto rounded-2xl
              bg-white dark:bg-[#1a1528]
              border border-brand-100/40 dark:border-brand-800/20
              shadow-card p-5 space-y-4
            "
          >
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%]`}>
                  {m.type === "bot" && m.category && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-brand-500 mb-1 ml-1">
                      {m.category}
                    </span>
                  )}
                  <div
                    className={`
                      px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${
                        m.type === "user"
                          ? "gradient-primary text-white rounded-br-md"
                          : "bg-brand-50 dark:bg-brand-900/20 text-gray-700 dark:text-gray-300 rounded-bl-md"
                      }
                    `}
                  >
                    {m.text}
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mt-4">
            <div className="flex items-end gap-3">
              <textarea
                className="
                  flex-1 bg-white dark:bg-[#1a1528]
                  border border-brand-100/60 dark:border-brand-800/30
                  text-sm text-gray-700 dark:text-gray-300
                  placeholder:text-gray-400
                  rounded-2xl px-5 py-3.5 resize-none
                  focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400
                  shadow-card outline-none transition-all
                  min-h-[52px] max-h-[140px]
                "
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitAnswer();
                  }
                }}
                placeholder="Type your answer..."
                rows={1}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={submitAnswer}
                disabled={!currentInput.trim() || loading}
                className="
                  w-12 h-12 rounded-xl gradient-primary
                  flex items-center justify-center text-white
                  shadow-lg hover:shadow-glow disabled:opacity-40
                  transition-all duration-200 shrink-0
                "
              >
                <Send size={18} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ REVIEW STEP ═══════════════════════════════════ */}
      {step === "review" && (
        <motion.div
          key="review"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Header */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
              <span className="text-2xl font-bold text-white">
                {review?.avgScore ?? "—"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Interview Complete!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {review
                ? `${review.totalQuestions} questions • ${review.duration} min`
                : "Your detailed review is below"}
            </p>
          </div>

          {/* Per-question cards */}
          {review?.results?.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`rounded-2xl border p-5 ${scoreBg(r.score)}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
                  Q{i + 1}: {r.question}
                </h3>
                <span className={`text-lg font-bold ${scoreColor(r.score)}`}>
                  {r.score}%
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-medium">Your answer:</span> {r.userAnswer || "No answer"}
              </p>
              {r.feedback && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {r.feedback}
                </p>
              )}
              {r.suggestions && r.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.suggestions.map((s, si) => (
                    <span key={si} className="text-[11px] px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/20 text-gray-600 dark:text-gray-400">
                      💡 {s}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          {/* If no review data */}
          {!review && (
            <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 p-8 text-center shadow-card">
              <CheckCircle size={40} className="text-brand-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Great job completing the interview! Your detailed review will
                appear here when the backend evaluation is complete.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetInterview}
              className="
                px-6 py-3 rounded-xl text-sm font-semibold
                gradient-primary text-white shadow-lg
                hover:shadow-glow transition-all duration-200
                flex items-center gap-2
              "
            >
              <RotateCcw size={16} />
              New Interview
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/reports")}
              className="
                px-6 py-3 rounded-xl text-sm font-semibold
                border-2 border-brand-300 dark:border-brand-600
                text-brand-600 dark:text-brand-300
                hover:bg-brand-50 dark:hover:bg-brand-900/30
                transition-all duration-200
              "
            >
              View Reports
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
