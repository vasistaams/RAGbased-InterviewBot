import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Calendar,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { api } from "../services/api";

interface DetailedResult {
  question?: string;
  userAnswer?: string;
  category?: string;
  difficulty?: string;
  score?: number;
  feedback?: string;
  suggestions?: string[];
  modelAnswer?: string;
}

interface Report {
  _id: string;
  date: string;
  overallScore: number;
  questions: string[];
  answers: string[];
  scores: number[];
  detailedEvaluation?: DetailedResult[];
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Backend route is GET /api/reports
        const res = await api.get("/reports");
        setReports(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load reports", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-red-500";
  const scoreBg = (s: number) =>
    s >= 80
      ? "bg-emerald-50 dark:bg-emerald-900/20"
      : s >= 60
        ? "bg-amber-50 dark:bg-amber-900/20"
        : "bg-red-50 dark:bg-red-900/20";
  const scoreRingColor = (s: number) =>
    s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";

  /* ── Detail View ──────────────────────────────────────── */
  if (selected) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" />
          Back to Reports
        </button>

        {/* ── Header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6"
        >
          <div className="flex items-center gap-5">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-glow ${scoreRingColor(selected.overallScore)}`}
            >
              <span className="text-2xl font-bold text-white">
                {selected.overallScore}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Interview Report
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(selected.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {" • "}
                {selected.questions.length} questions
                {" • "}
                Overall Score: {selected.overallScore}%
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Score Breakdown Chart ──────────────────────── */}
        {selected.scores && selected.scores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-5"
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Question-wise Score Breakdown
            </h3>
            <div className="flex items-end gap-2">
              {selected.scores.map((score, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span
                    className={`text-xs font-bold ${scoreColor(score)}`}
                  >
                    {score}
                  </span>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-20 relative overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${score}%` }}
                      transition={{ duration: 0.6, delay: 0.15 * i }}
                      className={`absolute bottom-0 left-0 right-0 rounded-full ${
                        score >= 80
                          ? "bg-emerald-500"
                          : score >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Q{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Per-question Cards ─────────────────────────── */}
        <div className="space-y-4">
          {selected.questions.map((q, i) => {
            const detail = selected.detailedEvaluation?.[i];
            const qScore = selected.scores?.[i] ?? 0;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.2 }}
                className={`p-5 rounded-2xl border ${
                  qScore >= 80
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30"
                    : qScore >= 60
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
                }`}
              >
                {/* Question header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      {detail?.category && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">
                          {detail.category}
                        </span>
                      )}
                      {detail?.difficulty && (
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {detail.difficulty}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Q{i + 1}: {q}
                    </h4>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-xl text-lg font-bold shrink-0 ${scoreColor(qScore)} ${
                      qScore >= 80
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : qScore >= 60
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {qScore}%
                  </div>
                </div>

                {/* Detail sections */}
                <div className="space-y-3 mt-3">
                  {/* Your Answer */}
                  <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Your Answer
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selected.answers[i] || "No answer provided"}
                    </p>
                  </div>

                  {/* Model / Expected Answer */}
                  {detail?.modelAnswer && (
                    <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                        ✅ Expected Answer
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {detail.modelAnswer}
                      </p>
                    </div>
                  )}

                  {/* Feedback */}
                  {detail?.feedback && (
                    <div className="rounded-xl bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                        💬 Feedback
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {detail.feedback}
                      </p>
                    </div>
                  )}

                  {/* Suggestions */}
                  {detail?.suggestions && detail.suggestions.length > 0 && (
                    <div className="rounded-xl bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/20 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                        💡 Improvement Tips
                      </p>
                      <ul className="space-y-1">
                        {detail.suggestions.map((s, si) => (
                          <li
                            key={si}
                            className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5"
                          >
                            <span className="text-amber-500 mt-0.5">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── List View ────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Interview Reports
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review your past interview performance
        </p>
      </motion.div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-5 py-4 text-sm text-red-600 dark:text-red-400">
          Failed to load reports. Make sure the backend is running.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-8 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
            <Inbox size={24} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No Reports Yet
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            Complete your first interview to see your reports here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => (
            <motion.button
              key={report._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelected(report)}
              className="
                w-full flex items-center gap-4 p-5 rounded-2xl text-left
                bg-white dark:bg-[#1a1528]
                border border-brand-100/40 dark:border-brand-800/20
                shadow-card hover:shadow-card-hover
                transition-all duration-200
              "
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <FileText size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  Interview • {report.questions.length} questions
                </p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(report.date).toLocaleDateString()}
                </p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${scoreColor(report.overallScore)} ${scoreBg(report.overallScore)}`}
              >
                {report.overallScore}%
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
