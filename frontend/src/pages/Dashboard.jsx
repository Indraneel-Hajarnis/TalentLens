import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useHistory } from "../context/HistoryContext";
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { history, user, loadingHistory, refreshHistory } = useHistory();
  const [activeResult, setActiveResult] = useState(location.state?.result || null);
  const [viewPdf, setViewPdf] = useState(true); // Default to viewing if on detail page

  useEffect(() => {
    if (location.state?.result) {
      setActiveResult(location.state.result);
    } else {
      setActiveResult(null);
    }
  }, [location.state]);

  const handleSelectScan = (item) => {
    if (!item.scores || item.scores.length === 0) return;
    try {
      const result = {
        id: item.id,
        totalScore: item.scores[0].totalScore,
        scoreDetails: JSON.parse(item.scores[0].scoreDetailsJson),
        filename: item.filename,
        jobDescription: item.scores[0].jobDescription,
        createdAt: item.createdAt
      };
      setActiveResult(result);
    } catch (err) {
      console.error("Failed to parse scan details", err);
      alert("Error loading scan details. The data format might be incompatible.");
    }
  };

  const sortedByScore = [...history].sort((a, b) => {
    const scoreA = a.scores?.[0]?.totalScore || 0;
    const scoreB = b.scores?.[0]?.totalScore || 0;
    return scoreB - scoreA;
  });

  if (!activeResult) {
    return (
      <div className="w-full max-w-7xl mx-auto py-8 flex flex-col gap-8 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Welcome, <span className="text-[#8b5cf6]">{user?.name || "User"}</span>
          </h1>
          <p className="text-[#94a3b8] font-medium">Manage your resumes and view their detailed ATS analysis.</p>
        </div>

        <div className="bg-[#131b26] border border-[#1e293b] rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d1624] border-b border-[#1e293b]">
                  <th className="px-6 py-4 text-xs font-bold text-[#64748b] uppercase tracking-wider">Resume Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#64748b] uppercase tracking-wider">ATS Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#64748b] uppercase tracking-wider">Upload Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#64748b] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {loadingHistory ? (
                   <tr><td colSpan="4" className="px-6 py-12 text-center text-[#64748b] italic">Loading your history...</td></tr>
                ) : sortedByScore.length > 0 ? (
                  sortedByScore.map((item) => {
                    const score = item.scores?.[0]?.totalScore || 0;
                    return (
                      <tr key={item.id} className="hover:bg-[#1e293b]/30 transition-colors group cursor-pointer" onClick={() => handleSelectScan(item)}>
                        <td className="px-6 py-4 text-sm font-bold text-white uppercase tracking-tight">{item.filename}</td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            score >= 75 ? "bg-green-500/10 text-green-400" :
                            score >= 50 ? "bg-yellow-500/10 text-yellow-400" :
                            score >= 25 ? "bg-orange-500/10 text-orange-400" :
                            "bg-red-500/10 text-red-400"
                          }`}>
                            {score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#94a3b8]">{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectScan(item);
                              }}
                              className="text-[#8b5cf6] hover:text-[#7c3aed] text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Analyze
                            </button>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this scan?")) {
                                  try {
                                    const res = await fetch(`http://localhost:3000/api/resumes/${item.id}`, {
                                      method: "DELETE",
                                      credentials: "include"
                                    });
                                    if (res.ok) {
                                      refreshHistory();
                                    }
                                  } catch (err) {
                                    console.error("Delete failed", err);
                                  }
                                }
                              }}
                              className="text-red-500/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-[#64748b]">No resumes uploaded yet. <Link to="/" className="text-[#8b5cf6] hover:underline">Start scanning now.</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Analysis Mode
  const result = activeResult;
  const scoreRound = Math.round(result.totalScore);
  const he = result.scoreDetails.heuristicEvaluation;
  const bd = he.breakdown;

  const getScoreColor = (score) => {
    if (score >= 75) return "#10b981";
    if (score >= 50) return "#eab308";
    if (score >= 25) return "#f97316";
    return "#ef4444";
  };
  const scoreColor = getScoreColor(scoreRound);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 flex flex-col gap-8 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Top Section: Resume Sheet and Score side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left: Resume Image Sheet (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center text-[#94a3b8]">
            <h3 className="font-bold flex items-center gap-2">
              <span className="p-1 px-2 rounded-lg bg-[#334155] text-white text-xs uppercase font-black">File</span>
              {result.filename}
            </h3>
            <button onClick={() => setViewPdf(!viewPdf)} className="text-xs font-bold hover:text-white transition-colors">
              {viewPdf ? "Collapse View" : "Expand View"}
            </button>
          </div>
          
          <div className={`w-full overflow-y-auto rounded-3xl border border-[#1e293b] bg-[#0d1624] shadow-2xl transition-all duration-700 ${viewPdf ? "h-[1000px]" : "h-64 cursor-pointer"}`}
               onClick={() => !viewPdf && setViewPdf(true)}>
            {result.id ? (
              <PDFSheet resumeId={result.id} expanded={viewPdf} />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 italic text-[#64748b]">
                No file data available for this scan.
              </div>
            )}
          </div>
        </div>

        {/* Right: Score and Contacts (1/3 width) */}
        <div className="flex flex-col gap-8">
           <div className="relative flex items-center justify-center w-full aspect-square max-w-[320px] mx-auto rounded-full border-[16px] shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-all duration-700 hover:scale-[1.02]"
                style={{ borderColor: scoreColor, boxShadow: `0 0 50px ${scoreColor}33` }}>
              <div className="text-center">
                <span className="text-9xl font-black leading-none" style={{ color: scoreColor }}>{scoreRound}</span>
                <p className="text-sm tracking-[0.3em] text-[#64748b] font-black uppercase mt-4">ATS Score</p>
              </div>
           </div>

           {/* Contacts Section */}
           <Card className="border-[#8b5cf6]/20 bg-[#131b26]/50">
              <h4 className="text-xs font-black text-[#64748b] uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span>
                Contact Information Check
              </h4>
              <div className="space-y-4">
                 <ContactRow label="Email Address" found={he.emailFound} />
                 <ContactRow label="Phone Number" found={he.phoneFound} />
                 <ContactRow label="LinkedIn Profile" found={!!he.contactInfo?.linkedin} />
              </div>
           </Card>

           <Card>
              <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-4">Quick Insights</h4>
              <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 rounded-2xl bg-[#0d1624] border border-[#1e293b]/50">
                    <p className="text-[10px] text-[#64748b] uppercase font-black mb-1">Matching Status</p>
                    <p className={`text-base font-black ${scoreRound >= 75 ? "text-green-400" : "text-yellow-400"}`}>
                      {scoreRound >= 75 ? "Excellent Match" : "Significant Gaps Found"}
                    </p>
                 </div>
                 <div className="p-4 rounded-2xl bg-[#0d1624] border border-[#1e293b]/50">
                    <p className="text-[10px] text-[#64748b] uppercase font-black mb-1">Keywords Identified</p>
                    <p className="text-base font-black text-white">{result.scoreDetails.keywords?.matching?.length || 0} Key Matches</p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      {/* Middle Section: Full-width Suggestions */}
      <Card className="border-yellow-500/20">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="p-2 rounded-xl bg-[#eab308]/10 text-[#eab308]">🚀</span>
          Improvement Suggestions
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-[#94a3b8] text-sm font-semibold leading-relaxed px-2">
          {scoreRound < 80 && (
            <li className="flex gap-3"><span className="text-yellow-500 font-bold">•</span> Prioritize missing technical skills detected in the JD to boost similarity score.</li>
          )}
          {he.keywordStuffingPenalty && (
             <li className="flex gap-3 text-red-400"><span className="font-bold">•</span> Remove redundant keyword clusters to avoid parsing penalties.</li>
          )}
          {he.actionVerbsFound < 8 && (
            <li className="flex gap-3"><span className="text-yellow-500 font-bold">•</span> Replace passive language with strategic action verbs like "Architected" or "Spearheaded".</li>
          )}
          {he.quantifiedAchievements === 0 && (
             <li className="flex gap-3 text-orange-400"><span className="font-bold">•</span> Add data-driven achievements (%, $, #) to validate your impact.</li>
          )}
          {he.sectionsFound.length < 5 && (
            <li className="flex gap-3"><span className="text-yellow-500 font-bold">•</span> Ensure standard headers like 'Summary' and 'Technical Skills' are clearly marked.</li>
          )}
        </ul>
      </Card>

      {/* Bottom Section: Single-Column Detailed Analysis */}
      <div className="flex flex-col gap-12">
        <h2 className="text-3xl font-black text-white tracking-tighter border-b border-[#1e293b] pb-6 flex items-center gap-4">
          Detailed Metric Breakdown
          <span className="text-xs font-bold text-[#64748b] uppercase tracking-widest bg-[#1e293b] px-3 py-1 rounded-full">Single Column View</span>
        </h2>

        <div className="flex flex-col gap-8">
          {/* Detailed Metric Cards in a single long column */}
          <Card>
            <ProgressBar title="Domain Relevance (Keywords)" percentage={Math.round(result.scoreDetails.similarityMatch * 100)} color="#0ab5d0" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <KeywordList title="Matched Keywords" list={result.scoreDetails.keywords?.matching} color="text-green-400" bg="bg-green-400/10" dot="bg-green-400" />
              <KeywordList title="Missing Requirements" list={result.scoreDetails.keywords?.missing} color="text-red-400" bg="bg-red-400/10" dot="bg-red-400" />
            </div>
          </Card>

          <Card>
            <ProgressBar title="Core Skills Alignment" percentage={Math.round(bd.skills * 100)} color="#8b5cf6" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                  <p className="text-xs font-black text-[#64748b] uppercase tracking-widest mb-4">Extracted Competencies:</p>
                  <div className="flex flex-wrap gap-2">
                    {he.skillsDetected.length > 0 ? he.skillsDetected.map((sk, i) => (
                      <span key={i} className="px-4 py-2 rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 text-[#8b5cf6] text-sm font-bold capitalize">{sk}</span>
                    )) : <span className="text-sm text-[#64748b] italic">No technical skills parsed.</span>}
                  </div>
               </div>
               <div>
                  <p className="text-xs font-black text-[#ef4444] uppercase tracking-widest mb-4">Recommended Missing Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {he.missingSkills && he.missingSkills.length > 0 ? he.missingSkills.map((sk, i) => (
                      <span key={i} className="px-4 py-2 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 text-sm font-bold capitalize">{sk}</span>
                    )) : <span className="text-sm text-green-400 font-bold italic">No critical skills missing!</span>}
                  </div>
               </div>
            </div>
          </Card>

          <Card>
            <ProgressBar title="Professional Experience Score" percentage={Math.round(bd.experience * 100)} color="#f97316" />
            <div className="mt-6 p-6 rounded-3xl bg-[#0d1624] border border-[#1e293b] flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mb-1">Detected Tenure</p>
                <span className="text-3xl font-black text-white">{he.yearsOfExperience || 0} Years</span>
              </div>
              <p className="text-sm text-[#94a3b8] italic max-w-md text-center md:text-right">
                Your experience highlights were analyzed for role relevance and chronological consistency.
              </p>
            </div>
          </Card>

          <Card>
            <ProgressBar title="Parse-ability & Layout" percentage={Math.round(bd.formatting * 100)} color="#0ea5e9" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="grid grid-cols-1 gap-4">
                  <StatusTip label="Email Found" pass={he.emailFound} />
                  <StatusTip label="Phone Found" pass={he.phoneFound} />
                  <StatusTip label="LinkedIn Link" pass={!!he.contactInfo?.linkedin} />
               </div>
               <div className="p-6 rounded-3xl bg-[#0d1624] border border-[#1e293b] flex flex-col justify-center">
                  <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mb-4">Summary of Contact Info:</p>
                  <div className="space-y-2 text-sm text-white font-mono break-all">
                     <p><span className="text-[#64748b]">EMAIL:</span> {he.contactInfo?.email || "NOT FOUND"}</p>
                     <p><span className="text-[#64748b]">PHONE:</span> {he.contactInfo?.phone || "NOT FOUND"}</p>
                     <p><span className="text-[#64748b]">URL:</span> {he.contactInfo?.linkedin || "NOT FOUND"}</p>
                  </div>
               </div>
            </div>
          </Card>

          <Card>
            <ProgressBar title="Impact & Verbs" percentage={Math.round(bd.action_verbs * 100)} color="#10b981" />
            <div className="mt-8 flex flex-col md:flex-row gap-8">
               <div className="flex-1 p-8 rounded-[2.5rem] bg-[#0d1624] border border-[#1e293b] text-center shadow-inner">
                  <p className="text-5xl font-black text-white mb-2">{he.actionVerbsFound}</p>
                  <p className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.3em] mt-4">Action Verbs Found</p>
               </div>
               <div className="flex-1 p-8 rounded-[2.5rem] bg-[#0d1624] border border-[#1e293b] text-center shadow-inner">
                  <p className="text-5xl font-black text-white mb-2">{he.quantifiedAchievements}</p>
                  <p className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.3em] mt-4">Quantified Impact Metrics</p>
               </div>
            </div>
          </Card>

          <Card>
            <ProgressBar title="Structure & Organization" percentage={Math.round(bd.structure * 100)} color="#f59e0b" />
            <div className="mt-8 p-6 rounded-3xl bg-[#0d1624] border border-[#1e293b]">
               <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mb-4">Detected Resume Sections:</p>
               <div className="flex flex-wrap gap-3">
                  {he.sectionsFound && he.sectionsFound.length > 0 ? he.sectionsFound.map((section, idx) => (
                    <span key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-tight">
                       {section}
                    </span>
                  )) : <span className="text-sm text-red-500 italic">No clear section headers detected. This significantly hurts ATS parsing.</span>}
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function ContactRow({ label, found }) {
  return (
    <div className="flex items-center justify-between p-3 py-1">
      <span className="text-sm font-bold text-[#94a3b8]">{label}</span>
      {found ? (
        <span className="text-green-400 bg-green-400/10 p-1 rounded-full"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></span>
      ) : (
        <span className="text-red-400 bg-red-400/10 p-1 rounded-full"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></span>
      )}
    </div>
  )
}

function PDFSheet({ resumeId, expanded }) {
  const [pages, setPages] = useState([]);
  const containerRef = useRef();

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: `http://localhost:3000/api/resumes/${resumeId}/file`,
          withCredentials: true
        });
        const pdf = await loadingTask.promise;
        const pageImages = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport }).promise;
          pageImages.push(canvas.toDataURL());
        }
        setPages(pageImages);
      } catch (err) {
        console.error("PDF Render Error", err);
      }
    };
    loadPdf();
  }, [resumeId]);

  return (
    <div className="flex flex-col items-center gap-6 p-12 bg-[#0d1624]">
      {pages.length > 0 ? pages.map((src, i) => (
        <img key={i} src={src} alt={`Page ${i+1}`} className="w-full h-auto shadow-2xl rounded-sm border border-[#334155]" />
      )) : (
        <div className="py-20 animate-pulse text-[#334155] font-black uppercase tracking-[0.3em]">Rendering Document...</div>
      )}
    </div>
  );
}

function KeywordList({ title, list, color, bg, dot }) {
  return (
    <div>
      <p className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${color}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`}></span>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {list?.length > 0 ? list.map((kw, i) => (
          <span key={i} className={`px-3 py-1.5 rounded-xl border border-white/5 ${bg} ${color} text-xs font-mono font-bold tracking-tight`}>{kw}</span>
        )) : <span className="text-xs text-[#64748b] italic">No items found.</span>}
      </div>
    </div>
  );
}

function StatusTip({ label, pass }) {
  return (
    <div className={`p-4 rounded-2xl flex items-center justify-between font-bold text-xs ${pass ? "bg-green-500/5 text-green-400 border border-green-500/10" : "bg-red-500/5 text-red-500 border border-red-500/10"}`}>
       <span>{label}</span>
       <span>{pass ? "PASS" : "FAIL"}</span>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-[#131b26] border border-[#1e293b] rounded-[2rem] p-8 shadow-2xl transition-all hover:border-[#334155] ${className}`}>
      {children}
    </div>
  )
}

function ProgressBar({ title, percentage, color }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black text-[#64748b] uppercase tracking-widest">{title}</h3>
        <span className="text-2xl font-black" style={{ color }}>{percentage}%</span>
      </div>
      <div className="w-full bg-[#0d1624] rounded-full h-4 overflow-hidden border border-[#1e293b]">
        <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
             style={{ width: `${percentage}%`, backgroundColor: color }}></div>
      </div>
    </div>
  )
}
