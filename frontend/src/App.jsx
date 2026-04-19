import { Routes, Route, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, LogOut, Plus, Sparkles } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Sidebar from "./components/Sidebar";
import { HistoryProvider } from "./context/HistoryContext";

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/sign-out", { 
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/auth";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <HistoryProvider>
      <div className="relative min-h-screen flex text-[var(--color-text)] overflow-hidden bg-[var(--color-background)]">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-[var(--color-secondary)] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[30rem] h-[30rem] bg-[#ec4899] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        {/* Sidebar */}
        {!isAuthPage && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="z-40"
          >
            <Sidebar />
          </motion.div>
        )}
        
        <div className={`relative z-10 flex-1 flex flex-col min-w-0 transition-all duration-300 ${!isAuthPage ? "ml-72" : ""}`}>
          {/* Navbar */}
          {!isAuthPage && (
            <motion.nav 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 25 }}
              className="glass-panel m-4 py-3 px-6 flex justify-between items-center sticky top-4 z-50 rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  Workspace
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <Link to="/" className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white px-5 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transform hover:-translate-y-0.5 transition-all">
                  <Plus className="w-4 h-4" />
                  New Scan
                </Link>
              </div>
            </motion.nav>
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-4 flex flex-col max-w-7xl w-full mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auth" element={<Auth />} />
            </Routes>
          </main>
        </div>
      </div>
    </HistoryProvider>
  );
}

export default App;
