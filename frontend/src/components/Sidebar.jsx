import { useHistory } from "../context/HistoryContext";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, History, ChevronRight, FileText, Plus, DatabaseBackup, Loader2 } from "lucide-react";

export default function Sidebar() {
  const { history, loadingHistory } = useHistory();
  const navigate = useNavigate();
  const location = useLocation();

  const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Filter out duplicates with the same filename, keeping only the most recent scan
  const seenFilenames = new Set();
  const uniqueHistory = sortedHistory.filter(item => {
    if (seenFilenames.has(item.filename)) return false;
    seenFilenames.add(item.filename);
    return true;
  });

  // Use the unique resume ID to determine the active scan (prevents multi-selection on same filename)
  const activeId = location.state?.result?.id || location.state?.id;

  const handleSelectScan = (item) => {
    if (!item.scores || item.scores.length === 0) return;
    
    const result = {
      id: item.id, // Important for viewing the file later
      totalScore: item.scores[0].totalScore,
      scoreDetails: JSON.parse(item.scores[0].scoreDetailsJson),
      filename: item.filename,
      jobDescription: item.scores[0].jobDescription,
      createdAt: item.createdAt
    };

    navigate("/dashboard", { state: { result } });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <aside className="w-72 glass-panel border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-40 rounded-none backdrop-blur-2xl bg-[#0b0b0e]/80 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-4 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-primary-dark)] to-[var(--color-primary)] flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            TalentLens
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--color-primary)]">Analyzer</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar relative z-10">
        <div className="flex items-center gap-2 mb-4 px-2">
          <History className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            Recent Scans
          </h3>
        </div>
        
        <div className="flex flex-col gap-2">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3 text-[var(--color-text-muted)] opacity-70">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
              <span className="text-xs font-medium">Loading history...</span>
            </div>
          ) : uniqueHistory.length > 0 ? (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-1.5">
              {uniqueHistory.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <motion.button
                    variants={itemVariants}
                    key={item.id}
                    onClick={() => handleSelectScan(item)}
                    className={`group flex flex-col text-left p-3 rounded-xl transition-all duration-300 relative overflow-hidden focus:outline-none ${
                      isActive 
                      ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-white shadow-[0_4px_20px_rgba(139,92,246,0.05)]" 
                      : "bg-white/5 border border-transparent text-[var(--color-text-muted)] hover:bg-white/10 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between relative z-10 w-full gap-2">
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <FileText className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)] group-hover:text-white/70"}`} />
                        <p className="text-[13px] font-semibold truncate leading-tight">{item.filename}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? "text-[var(--color-primary)] translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:opacity-50 group-hover:translate-x-0"}`} />
                    </div>
                    <div className="flex justify-between items-center w-full mt-2 pl-6 relative z-10">
                      <p className="text-[10px] font-medium opacity-50 tracking-wide uppercase">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {item.scores && item.scores.length > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-white/5 text-white/50 group-hover:bg-white/10'}`}>
                          {item.scores[0].totalScore}%
                        </span>
                      )}
                    </div>
                    
                    {/* Active state animated indicator */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeSidebarIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)] shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[var(--color-text-muted)] text-center flex flex-col items-center gap-4 hover:border-white/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <DatabaseBackup className="w-5 h-5 opacity-40" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-white/80">Empty History</span>
                <span className="text-xs">Your past scans will appear here automatically.</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-5 border-t border-white/5 bg-gradient-to-t from-[var(--color-background)] to-transparent relative z-10">
        <button 
           onClick={() => navigate("/")}
           className="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] hover:shadow-[0_8px_25px_rgba(139,92,246,0.35)] hover:-translate-y-0.5 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
        >
          {/* Button inner glow effect */}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>Start New Scan</span>
        </button>
      </div>
    </aside>
  );
}
