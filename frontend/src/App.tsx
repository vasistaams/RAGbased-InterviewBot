import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { useEffect } from "react";

import { setTokenProvider } from "./services/api";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import ATS from "./pages/ATS";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";

/**
 * Invisible component that bridges Clerk's `getToken` into the Axios
 * interceptor so every API request is automatically authenticated.
 */
function AuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenProvider(() => getToken());
  }, [getToken]);
  return null;
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] transition-colors">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-3xl bg-white/80 dark:bg-[#1a1528]/80 glass border border-brand-100/40 dark:border-brand-800/20 shadow-card-hover p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
              <span className="text-2xl font-bold text-white">I</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              InterviewBot
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI-Powered Mock Interview Platform
            </p>
          </div>

          {/* Clerk Sign In */}
          <SignIn
            routing="path"
            path="/login"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-none border-0 p-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all rounded-xl",
                formButtonPrimary:
                  "bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-600 hover:to-indigo-600 rounded-xl shadow-lg",
                formFieldInput:
                  "rounded-xl border-brand-200 dark:border-brand-800 focus:ring-brand-400 dark:bg-brand-900/20",
                footerActionLink: "text-brand-500 hover:text-brand-600",
              },
            }}
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by AI • Built for success
        </p>
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Bridge Clerk auth into Axios interceptor — must be inside BrowserRouter + ClerkProvider */}
      <AuthBridge />

      <Routes>
        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <DashboardLayout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/interview" element={<Interview />} />
                    <Route path="/ats" element={<ATS />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/login" replace />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
