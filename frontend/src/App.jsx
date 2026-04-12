import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
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
      <div className="min-h-screen flex bg-[#0f0f13]">
        {!isAuthPage && <Sidebar />}
        
        <div className={`flex-1 flex flex-col min-w-0 ${!isAuthPage ? "ml-72" : ""}`}>
          {/* Navbar */}
          {!isAuthPage && (
            <nav className="glass-panel m-4 py-4 px-6 flex justify-between items-center sticky top-4 z-50">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-[var(--color-text-muted)]">
                  Welcome back to your workspace
                </div>
              </div>
              <div className="flex gap-6 items-center">
                <Link to="/dashboard" className="text-sm font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
                <Link to="/" className="text-sm font-medium bg-[var(--color-primary)] text-white px-4 py-2 rounded-full hover:bg-[var(--color-primary-dark)] transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                  New Scan
                </Link>
              </div>
            </nav>
          )}

          {/* Main Content */}
          <main className="flex-1 p-4 flex flex-col max-w-6xl w-full mx-auto">
            <Routes>
              <Route path="/" element={<Upload />} />
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
