import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Target,
  Mic,
  FileSearch,
  Settings,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

import api from "../services/api";
import StatCard from "../components/StatCard";
import ActionCard from "../components/ActionCard";
import PerformanceChart from "../components/PerformanceChart";

interface DashboardData {
  name: string;
  interviewsTaken: number;
  interviewHistory: Array<{ score: number; questionsAsked: number; date: string }>;
  resumeName: string | null;
  theme: string;
  avatar: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Dashboard() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get("/user/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Compute average score from history
  const history = data?.interviewHistory || [];
  const avgScore =
    history.length > 0
      ? Math.round(history.reduce((s, h) => s + (h.score || 0), 0) / history.length)
      : 0;

  // Chart data from last 10 sessions
  const chartData = history.slice(-10).map((h, i) => ({
    session: `#${i + 1}`,
    score: h.score || 0,
  }));

  // Fallback chart data if no history
  const fallbackChart = [
    { session: "#1", score: 65 },
    { session: "#2", score: 72 },
    { session: "#3", score: 58 },
    { session: "#4", score: 80 },
    { session: "#5", score: 75 },
    { session: "#6", score: 88 },
    { session: "#7", score: 82 },
    { session: "#8", score: 90 },
    { session: "#9", score: 85 },
    { session: "#10", score: 92 },
  ];

  const displayName = data?.name || user?.firstName || "User";

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {getGreeting()},{" "}
            <span className="text-gradient">{displayName}</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your progress and continue practicing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/ats"
            className="
              px-5 py-2.5 rounded-xl text-sm font-semibold
              border-2 border-brand-300 dark:border-brand-600
              text-brand-600 dark:text-brand-300
              hover:bg-brand-50 dark:hover:bg-brand-900/30
              transition-all duration-200
            "
          >
            <span className="flex items-center gap-2">
              <Target size={16} />
              ATS Score
            </span>
          </Link>
          <Link
            to="/interview"
            className="
              px-5 py-2.5 rounded-xl text-sm font-semibold text-white
              gradient-primary shadow-lg hover:shadow-glow
              transition-all duration-200
            "
          >
            <span className="flex items-center gap-2">
              <Sparkles size={16} />
              Start Interview
            </span>
          </Link>
        </div>
      </motion.div>

      {/* ── Error banner ──────────────────────────────── */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-5 py-4 flex items-center gap-3"
        >
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load dashboard data. Make sure the backend is running on port 3000.
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); loadDashboard(); }}
            className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* ── Stat Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard
          label="Total Sessions"
          value={loading ? "—" : data?.interviewsTaken || 0}
          icon={BarChart3}
          gradient="gradient-primary"
          iconColor="text-white"
          delay={0.1}
          loading={loading}
        />
        <StatCard
          label="Avg Score"
          value={loading ? "—" : `${avgScore}%`}
          icon={TrendingUp}
          gradient="gradient-success"
          iconColor="text-white"
          delay={0.2}
          loading={loading}
        />
      </div>

      {/* ── Main Grid: Chart + Actions ─────────────────  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart: spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <PerformanceChart
            data={chartData.length > 0 ? chartData : fallbackChart}
            loading={loading}
          />
        </div>

        {/* Action cards: right column */}
        <div className="space-y-4">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            Quick Actions
          </motion.h3>

          <ActionCard
            title="Mock Interview"
            subtitle="AI-powered practice session"
            icon={Mic}
            to="/interview"
            gradient="gradient-primary"
            delay={0.5}
          />
          <ActionCard
            title="Resume Check"
            subtitle="ATS compatibility analyzer"
            icon={FileSearch}
            to="/ats"
            gradient="gradient-success"
            delay={0.6}
          />
          <ActionCard
            title="Settings"
            subtitle="Profile & preferences"
            icon={Settings}
            to="/settings"
            gradient="gradient-accent"
            delay={0.7}
          />
        </div>
      </div>
    </div>
  );
}
