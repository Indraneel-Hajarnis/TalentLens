import { useHistory } from "../context/HistoryContext";
import { useNavigate, useLocation } from "react-router-dom";

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

  return (
    <aside className="w-72 bg-[#131b26] border-r border-[#1e293b] flex flex-col h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-[#1e293b] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#8b5cf6] flex items-center justify-center font-bold text-white shadow-lg">
          ATS
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Analyzer</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <h3 className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em] mb-4 px-2">
          Recent Scans
        </h3>
        
        <div className="flex flex-col gap-2">
          {loadingHistory ? (
            <div className="p-4 text-xs text-[#64748b] italic text-center">Loading history...</div>
          ) : uniqueHistory.length > 0 ? (
            uniqueHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectScan(item)}
                className={`text-left p-3 rounded-xl border transition-all group relative overflow-hidden ${
                  activeId === item.id 
                  ? "bg-[#0ab5d0]/10 border-[#0ab5d0] text-white" 
                  : "bg-[#0d1624] border-transparent text-[#94a3b8] hover:border-[#1e293b] hover:text-white hover:bg-[#131b26]"
                }`}
              >
                <div className="relative z-10">
                  <p className="text-xs font-bold truncate pr-4">{item.filename}</p>
                  <p className="text-[10px] opacity-60 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                {activeId === item.id && (
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#0ab5d0] shadow-[0_0_8px_rgba(10,181,208,0.8)]"></div>
                )}
              </button>
            ))
          ) : (
            <div className="p-8 bg-[#0d1624] border border-dashed border-[#1e293b] rounded-2xl text-xs text-[#64748b] text-center flex flex-col gap-2">
              <span className="text-2xl opacity-20">📂</span>
              No previous scans found.
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[#1e293b]">
        <button 
           onClick={() => navigate("/")}
           className="w-full py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_15px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
        >
          <span>+</span> New Scan
        </button>
      </div>
    </aside>
  );
}
