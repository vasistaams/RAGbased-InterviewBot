import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";

import api from "../services/api";

interface ATSResult {
  score: number;
  grade: string;
  matches: string[];
  missing: string[];
  suggestions?: string[];
  feedback?: string;
  source?: string;
}

export default function ATS() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResults(null);
    setError(null);
    setUploading(true);

    try {
      // Upload immediately so the backend has the file stored for ATS scoring
      const formData = new FormData();
      formData.append("resume", selected);
      await api.post("/interview/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload resume. Please try again.");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const removeResume = async () => {
    try {
      await api.delete("/interview/resume");
    } catch {
      // Non-critical — file may not exist on server
    }
    setFile(null);
    setResults(null);
  };

  const runAnalysis = async () => {
    if (!file || !jobDesc.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const res = await api.post("/ats/score", {
        jobDescription: jobDesc.trim(),
      });

      const data = res.data;
      setResults({
        score: data.score ?? data.overallScore ?? 0,
        grade: data.grade ?? "N/A",
        matches: data.matches ?? data.matchedKeywords ?? [],
        missing: data.missing ?? data.missingKeywords ?? [],
        suggestions: data.suggestions ?? [],
        feedback: data.feedback ?? data.summary ?? "",
        source: data.source,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "ATS analysis failed. Make sure Ollama is running.";
      setError(msg);
      console.error("ATS error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  /* Score ring color */
  const ringColor = (s: number) =>
    s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          ATS Resume Checker
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Optimize your resume for applicant tracking systems
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-5 py-4 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Panel: Inputs ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-5"
        >
          {/* Resume upload card */}
          <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Your Resume
              </h3>
            </div>

            {!file ? (
              <button
                onClick={() => document.getElementById("ats-file-input")?.click()}
                disabled={uploading}
                className="
                  w-full py-10 rounded-xl border-2 border-dashed
                  border-brand-200 dark:border-brand-800/40
                  hover:border-brand-400 dark:hover:border-brand-600
                  bg-brand-50/50 dark:bg-brand-900/10
                  flex flex-col items-center gap-3 transition-all duration-200
                  group cursor-pointer disabled:opacity-50
                "
              >
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload size={22} className="text-brand-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Upload PDF Resume
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Max 5MB</p>
                </div>
                <input
                  type="file"
                  id="ats-file-input"
                  hidden
                  accept=".pdf"
                  onChange={handleFileUpload}
                />
              </button>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100/60 dark:border-brand-800/30">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {uploading ? "Uploading..." : "Ready for analysis"}
                  </p>
                </div>
                <button
                  onClick={removeResume}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Job description card */}
          <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search size={18} className="text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Job Description
              </h3>
            </div>
            <textarea
              className="
                w-full h-40 bg-brand-50/50 dark:bg-brand-900/10
                border border-brand-100/60 dark:border-brand-800/30
                rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300
                placeholder:text-gray-400 resize-none
                focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400
                outline-none transition-all
              "
              placeholder="Paste the job description here..."
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>

          {/* Analyze button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runAnalysis}
            disabled={!file || !jobDesc.trim() || analyzing || uploading}
            className="
              w-full py-3.5 rounded-xl text-white font-semibold
              gradient-primary shadow-lg hover:shadow-glow
              disabled:opacity-40 transition-all duration-200
              flex items-center justify-center gap-2
            "
          >
            {analyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search size={18} />
                Score My Resume
              </>
            )}
          </motion.button>
        </motion.div>

        {/* ── Right Panel: Results ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {results ? (
            <div className="space-y-5">
              {/* Score card */}
              <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6 flex items-center gap-6">
                {/* Score ring */}
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-brand-100 dark:text-brand-900/30"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={ringColor(results.score)}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(results.score / 100) * 264} 264`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {results.score}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-bold text-white"
                      style={{ background: ringColor(results.score) }}
                    >
                      {results.grade}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Overall Match
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">ATS Compatibility Score</p>
                  {results.source && (
                    <p className="text-[10px] text-brand-400 mt-1">via {results.source}</p>
                  )}
                </div>
              </div>

              {/* Keywords */}
              <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Keyword Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                      <CheckCircle size={12} /> Matched
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {results.matches.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/30"
                        >
                          {m}
                        </span>
                      ))}
                      {results.matches.length === 0 && (
                        <span className="text-xs text-gray-400">None found</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-2 flex items-center gap-1">
                      <XCircle size={12} /> Missing
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {results.missing.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/30"
                        >
                          {m}
                        </span>
                      ))}
                      {results.missing.length === 0 && (
                        <span className="text-xs text-gray-400">All covered!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {results.feedback && (
                <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Expert Feedback
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {results.feedback}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Placeholder */
            <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
                <Search size={28} className="text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Ready to Analyze
              </h3>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">
                Upload your resume and paste a job description to see how you rank against ATS systems.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
