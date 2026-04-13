import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  to: string;
  gradient: string;
  delay?: number;
}

export default function ActionCard({
  title,
  subtitle,
  icon: Icon,
  to,
  gradient,
  delay = 0,
}: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Link
        to={to}
        className="
          group flex items-center gap-4 p-4 rounded-2xl
          bg-white dark:bg-[#1a1528]
          border border-brand-100/40 dark:border-brand-800/20
          shadow-card hover:shadow-card-hover
          transition-all duration-300
        "
      >
        <div
          className={`
            w-12 h-12 shrink-0 rounded-xl flex items-center justify-center
            ${gradient}
            group-hover:shadow-glow/40 transition-shadow duration-300
          `}
        >
          <Icon size={20} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {subtitle}
          </p>
        </div>

        <ChevronRight
          size={16}
          className="
            shrink-0 text-gray-300 dark:text-gray-600
            group-hover:text-brand-500 group-hover:translate-x-0.5
            transition-all duration-200
          "
        />
      </Link>
    </motion.div>
  );
}
