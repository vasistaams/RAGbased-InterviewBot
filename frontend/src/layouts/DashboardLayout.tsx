import Navbar from "../components/Navbar";
import FloatingChatButton from "../components/FloatingChatButton";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] transition-colors duration-300">
      <Navbar />

      {/* Main content: offset by sidebar on desktop, top bar on mobile */}
      <main className="lg:ml-[260px] pt-20 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <FloatingChatButton />
    </div>
  );
}
