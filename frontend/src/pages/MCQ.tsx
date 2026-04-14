import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Target,
  Sparkles,
  Trophy,
} from "lucide-react";
import api from "../services/api";

/* ── Types ──────────────────────────────────────────────── */
interface MCQOption {
  label: string;
  text: string;
}

interface MCQQuestion {
  question: string;
  options: MCQOption[];
  answer: string; // correct label: "A" | "B" | "C" | "D"
  explanation?: string;
  topic?: string;
  difficulty?: string;
}

interface MCQResult {
  question: string;
  options: MCQOption[];
  answer: string;
  userAnswer: string;
  correct: boolean;
  explanation?: string;
}

const TOPICS = ["DSA", "DBMS", "OS", "CN", "OOPS", "ML", "SQL", "JavaScript"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const QUESTION_COUNTS = [5, 10, 15, 20];

/* ── Helpers ─────────────────────────────────────────────── */
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}
function scoreRing(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

/* ── Component ──────────────────────────────────────────── */
export default function MCQ() {
  const [step, setStep] = useState<"config" | "quiz" | "result">("config");

  // Config
  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);

  // Quiz
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [results, setResults] = useState<MCQResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Start quiz ──────────────────────────────────────── */
  const startQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/mcq/start", {
        topic,
        difficulty,
        numberOfQuestions: count,
      });
      const raw = res.data?.data?.questions || res.data?.questions || [];
      const qs: MCQQuestion[] = raw.map((q: any) => ({
        question: q.question,
        options: q.options || [
          { label: "A", text: q.option_a || q.A || "" },
          { label: "B", text: q.option_b || q.B || "" },
          { label: "C", text: q.option_c || q.C || "" },
          { label: "D", text: q.option_d || q.D || "" },
        ],
        answer: (q.answer || q.correct || "A").toUpperCase().replace(/[^ABCD]/g, "A"),
        explanation: q.explanation || "",
        topic: q.topic,
        difficulty: q.difficulty,
      }));
      if (qs.length === 0) throw new Error("No questions returned");
      setQuestions(qs);
      setCurrent(0);
      setSelected(null);
      setConfirmed(false);
      setResults([]);
      setStep("quiz");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load questions. Try again.");
      console.error("[MCQ] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Confirm answer ─────────────────────────────────── */
  const confirmAnswer = () => {
    if (!selected) return;
    const q = questions[current];
    setResults((prev) => [
      ...prev,
      {
        question: q.question,
        options: q.options,
        answer: q.answer,
        userAnswer: selected,
        correct: selected === q.answer,
        explanation: q.explanation,
      },
    ]);
    setConfirmed(true);
  };

  /* ── Next question ──────────────────────────────────── */
  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      setStep("result");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setConfirmed(false);
    }
  };

  /* ── Reset ──────────────────────────────────────────── */
  const reset = () => {
    setStep("config");
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setResults([]);
    setError(null);
  };

  const correctCount = results.filter((r) => r.correct).length;
  const scorePercent = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  /* ── CONFIG ─────────────────────────────────────────── */
  if (step === "config") {
    return (
      <motion.div
        key="config"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCQ Practice</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Test your knowledge with topic-specific questions
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6 space-y-6">
          {/* Topic */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Topic</label>
            <div className="grid grid-cols-4 gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200 ${
                    topic === t
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => {
                const colors: Record<string, string> = { easy: "bg-emerald-500", medium: "bg-amber-500", hard: "bg-red-500" };
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 capitalize ${
                      difficulty === d
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-300"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${colors[d]} mx-auto mb-1`} />
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Number of Questions</label>
            <div className="grid grid-cols-4 gap-2">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                    count === n
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startQuiz}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-semibold gradient-primary shadow-lg hover:shadow-glow disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading Questions...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Start Practice
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  /* ── QUIZ ────────────────────────────────────────────── */
  if (step === "quiz") {
    const q = questions[current];
    const progress = ((current + (confirmed ? 1 : 0)) / questions.length) * 100;

    return (
      <motion.div
        key="quiz"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-5"
      >
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Question {current + 1} of {questions.length}
            </span>
            <span className="text-xs font-medium text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full capitalize">
              {q.topic || topic} · {q.difficulty || difficulty}
            </span>
          </div>
          <div className="h-2 bg-brand-100 dark:bg-brand-900/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6 space-y-5">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
            {q.question}
          </p>

          {/* Options */}
          <div className="space-y-3">
            <AnimatePresence>
              {q.options.map((opt) => {
                let stateClass =
                  "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20";
                if (confirmed) {
                  if (opt.label === q.answer) {
                    stateClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300";
                  } else if (opt.label === selected && selected !== q.answer) {
                    stateClass = "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400";
                  } else {
                    stateClass = "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60";
                  }
                } else if (selected === opt.label) {
                  stateClass = "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300";
                }

                return (
                  <motion.button
                    key={opt.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => !confirmed && setSelected(opt.label)}
                    disabled={confirmed}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 ${stateClass}`}
                  >
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-current/10 text-sm font-bold shrink-0">
                      {opt.label}
                    </span>
                    <span className="text-sm flex-1">{opt.text}</span>
                    {confirmed && opt.label === q.answer && (
                      <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                    )}
                    {confirmed && opt.label === selected && selected !== q.answer && (
                      <XCircle size={18} className="text-red-500 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {confirmed && q.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100/60 dark:border-brand-800/30 px-4 py-3"
              >
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">Explanation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{q.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-3">
            {!confirmed ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmAnswer}
                disabled={!selected}
                className="flex-1 py-3 rounded-xl text-white font-semibold gradient-primary shadow-lg disabled:opacity-40 transition-all duration-200"
              >
                Confirm Answer
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextQuestion}
                className="flex-1 py-3 rounded-xl text-white font-semibold gradient-primary shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {current + 1 >= questions.length ? (
                  <><Trophy size={16} /> See Results</>
                ) : (
                  <><ChevronRight size={16} /> Next Question</>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── RESULT ──────────────────────────────────────────── */
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Score summary */}
      <div className="text-center">
        <div className="relative w-28 h-28 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-brand-100 dark:stroke-brand-900/30" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={scoreRing(scorePercent)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(scorePercent / 100) * 264} 264`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor(scorePercent)}`}>{scorePercent}%</span>
            <span className="text-xs text-gray-400">Score</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Complete!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {correctCount} / {results.length} correct · {topic} · {difficulty}
        </p>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-4">
        {results.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`rounded-2xl border p-5 ${
              r.correct
                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30"
                : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30"
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              {r.correct ? (
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              )}
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
                Q{i + 1}: {r.question}
              </p>
            </div>
            <div className="ml-7 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">Your answer:</span>{" "}
                <span className={r.correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                  {r.userAnswer} — {r.options.find((o) => o.label === r.userAnswer)?.text || "—"}
                </span>
              </p>
              {!r.correct && (
                <p>
                  <span className="font-medium">Correct:</span>{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {r.answer} — {r.options.find((o) => o.label === r.answer)?.text || "—"}
                  </span>
                </p>
              )}
              {r.explanation && (
                <p className="mt-1 italic text-gray-500 dark:text-gray-500">{r.explanation}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={reset}
          className="px-6 py-3 rounded-xl text-sm font-semibold gradient-primary text-white shadow-lg hover:shadow-glow transition-all duration-200 flex items-center gap-2"
        >
          <RotateCcw size={16} />
          New Practice
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setDifficulty("medium"); startQuiz(); }}
          className="px-6 py-3 rounded-xl text-sm font-semibold border-2 border-brand-300 dark:border-brand-600 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all duration-200 flex items-center gap-2"
        >
          <Target size={16} />
          Retry Same Set
        </motion.button>
      </div>
    </motion.div>
  );
}
