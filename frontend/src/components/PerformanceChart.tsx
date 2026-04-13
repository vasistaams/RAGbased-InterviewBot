import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ChartDataPoint {
  session: string;
  score: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a1528] border border-brand-100/60 dark:border-brand-800/30 rounded-xl px-4 py-3 shadow-card-hover">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-bold text-brand-600 dark:text-brand-400 mt-0.5">
        {payload[0].value}%
      </p>
    </div>
  );
}

export default function PerformanceChart({
  data,
  loading = false,
}: PerformanceChartProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-5 w-44" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="skeleton h-[260px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="
        rounded-2xl bg-white dark:bg-[#1a1528]
        border border-brand-100/40 dark:border-brand-800/20
        p-6 shadow-card
      "
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Performance Overview
        </h3>
        <span className="text-xs font-medium text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full">
          Last {data.length} Sessions
        </span>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="session"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              dy={10}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#scoreGradient)"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "#8b5cf6",
                stroke: "#fff",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "#8b5cf6",
                stroke: "#fff",
                strokeWidth: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
