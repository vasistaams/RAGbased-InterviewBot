import { SignedIn, UserButton, useClerk } from "@clerk/clerk-react";
import {
  Home,
  Mic,
  FileSearch,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "AI Interview", path: "/interview", icon: Mic },
  { label: "ATS Checker", path: "/ats", icon: FileSearch },
  { label: "Reports", path: "/reports", icon: FileSearch },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Navbar() {
  const { signOut } = useClerk();
  const location = useLocation();
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside
        className="
          hidden lg:flex flex-col fixed inset-y-0 left-0 z-40
          w-[260px] border-r border-brand-100/60
          bg-white/70 dark:bg-[#13102a]/80 glass
          transition-colors duration-300
        "
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white text-lg font-bold shadow-glow">
            I
          </div>
          <span className="text-lg font-bold tracking-tight text-brand-800 dark:text-brand-200">
            InterviewBot
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 mt-2 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${
                    active
                      ? "gradient-primary text-white shadow-glow/40"
                      : "text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-300"
                  }
                `}
              >
                <item.icon size={18} className={active ? "text-white" : "text-brand-400 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-5 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <SignedIn>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <UserButton
                afterSignOutUrl="/login"
                appearance={{
                  elements: { avatarBox: "w-8 h-8" },
                }}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">Profile</span>
            </div>
          </SignedIn>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500/80 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ──────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-4 border-b border-brand-100/60 bg-white/80 dark:bg-[#13102a]/90 glass">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-sm font-bold">
            I
          </div>
          <span className="font-bold text-brand-800 dark:text-brand-200">InterviewBot</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
            {dark ? <Sun size={18} className="text-brand-400" /> : <Moon size={18} className="text-brand-400" />}
          </button>
          <SignedIn>
            <UserButton afterSignOutUrl="/login" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
          </SignedIn>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
            <Menu size={20} className="text-brand-600 dark:text-brand-300" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ───────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white dark:bg-[#13102a] border-l border-brand-100/60 p-4 lg:hidden"
            >
              <div className="flex justify-end mb-4">
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "gradient-primary text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                      }`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6">
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500/80 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
