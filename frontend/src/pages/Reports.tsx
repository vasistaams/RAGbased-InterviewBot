import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Calendar,
  ChevronRight,
  Inbox,
} from "lucide-react";

import { raw } from "../services/api";

interface Report {
  _id: string;
  date: string;
  overallScore: number;
  questions: string[];
  answers: string[];
  scores: number[];
  detailedEvaluation?: Array<{
    feedback?: string;
    suggestions?: string[];
  }>;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Backend route is GET /reports (root-level, not /api/reports)
        const res = await raw.get("/reports");
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

  /* ── Detail View ──────────────────────────────────────── */
  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" />
          Back to Reports
        </button>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Interview Report
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(selected.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-xl text-lg font-bold ${scoreColor(selected.overallScore)} ${scoreBg(selected.overallScore)}`}
            >
              {selected.overallScore}%
            </div>
          </div>

          <div className="space-y-4">
            {selected.questions.map((q, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100/40 dark:border-brand-800/20"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Q{i + 1}: {q}
                  </h4>
                  <span className={`text-sm font-bold shrink-0 ${scoreColor(selected.scores?.[i] ?? 0)}`}>
                    {selected.scores?.[i] ?? 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="font-medium">Answer:</span>{" "}
                  {selected.answers[i] || "No answer provided"}
                </p>
                {selected.detailedEvaluation?.[i]?.feedback && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                    {selected.detailedEvaluation[i].feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
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
