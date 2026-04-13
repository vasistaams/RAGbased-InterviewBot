import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  delay?: number;
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  iconColor,
  delay = 0,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-16" />
          </div>
          <div className="skeleton h-12 w-12 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="
        group relative rounded-2xl
        bg-white dark:bg-[#1a1528]
        border border-brand-100/40 dark:border-brand-800/20
        p-6 shadow-card hover:shadow-card-hover
        transition-shadow duration-300 cursor-default overflow-hidden
      "
    >
      {/* Subtle gradient glow on hover */}
      <div
        className={`
          absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0
          group-hover:opacity-20 transition-opacity duration-500 blur-2xl
          ${gradient}
        `}
      />

      <div className="relative flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
        </div>
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${gradient} shadow-lg
          `}
        >
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </motion.div>
  );
}
