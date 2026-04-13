import { motion } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import { User, Mail, Globe, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();

  const infoItems = [
    {
      label: "Full Name",
      value: user?.fullName || "—",
      icon: User,
    },
    {
      label: "Email",
      value: user?.primaryEmailAddress?.emailAddress || "—",
      icon: Mail,
    },
    {
      label: "Provider",
      value: user?.externalAccounts?.[0]?.provider || "Email",
      icon: Globe,
    },
    {
      label: "Account ID",
      value: user?.id?.slice(0, 16) + "..." || "—",
      icon: Shield,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white dark:bg-[#1a1528] border border-brand-100/40 dark:border-brand-800/20 shadow-card p-6"
      >
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-brand-100/40 dark:border-brand-800/20">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="avatar"
              className="w-16 h-16 rounded-2xl object-cover shadow-card"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-glow">
              {(user?.firstName?.[0] || "U").toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {user?.fullName || "User"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {infoItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-4 p-3 rounded-xl bg-brand-50/50 dark:bg-brand-900/10"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-gray-400 text-center"
      >
        Profile is managed through Clerk. Click your avatar in the sidebar to
        edit your details.
      </motion.p>
    </div>
  );
}
