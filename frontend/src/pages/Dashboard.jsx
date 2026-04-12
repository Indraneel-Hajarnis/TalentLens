import { useState, useEffect, useRef } from "react";

const NLP_ENGINE = "http://localhost:8000";

// ─── Colour helpers ──────────────────────────────────────────────────────────
const scoreColor = (s) => {
  if (s >= 75) return "#22c55e";
  if (s >= 50) return "#f59e0b";
  if (s >= 30) return "#f97316";
  return "#ef4444";
};
const scoreBg = (s) => {
  if (s >= 75) return "rgba(34,197,94,.12)";
  if (s >= 50) return "rgba(245,158,11,.12)";
  if (s >= 30) return "rgba(249,115,22,.12)";
  return "rgba(239,68,68,.12)";
};
const scoreLabel = (s) => {
  if (s >= 75) return "Strong Match";
  if (s >= 50) return "Good Match";
  if (s >= 30) return "Partial Match";
  return "Weak Match";
};

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;
    const step = end / 40;
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(Math.round(start * 10) / 10);
      if (start >= end) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}{suffix}</>;
}

// ─── Circular Score Ring ─────────────────────────────────────────────────────
function ScoreRing({ score, size = 140, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: size * 0.2, fontWeight: 700, fontFamily: "monospace", transform: "rotate(90deg)", transformOrigin: "50% 50%" }}
      >
        {score}%
      </text>
      <text
        x="50%" y="65%"
        dominantBaseline="middle" textAnchor="middle"
        style={{ fill: "rgba(255,255,255,.5)", fontSize: size * 0.1, transform: "rotate(90deg)", transformOrigin: "50% 50%" }}
      >
        ATS Score
      </text>
    </svg>
  );
}

// ─── Search Trace Visualizer ─────────────────────────────────────────────────
function SearchTracePanel({ trace, stats, allNodes }) {
  const [expanded, setExpanded] = useState(false);
  if (!trace || trace.length === 0) return null;

  const maxH = Math.max(...trace.map((s) => s.heuristic), 1);

  return (
    <div style={{
      background: "rgba(15,15,25,.95)",
      border: "1px solid rgba(139,92,246,.3)",
      borderRadius: 16, padding: 24, marginTop: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              background: "rgba(139,92,246,.2)", border: "1px solid rgba(139,92,246,.5)",
              color: "#a78bfa", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontFamily: "monospace"
            }}>
              ALGORITHM
            </span>
            <h3 style={{ color: "#e2e8f0", margin: 0, fontSize: 16, fontWeight: 700 }}>
              Best-First Search — Skill Matching Trace
            </h3>
          </div>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: "6px 0 0", fontFamily: "monospace" }}>
            Frontier explored {stats?.nodes_explored} nodes · max depth {stats?.max_depth_reached} · greedy h(n) ordering
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "rgba(139,92,246,.15)", border: "1px solid rgba(139,92,246,.4)",
            color: "#a78bfa", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12,
          }}
        >
          {expanded ? "Collapse ▲" : "Expand ▼"}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Nodes Explored", value: stats?.nodes_explored },
          { label: "Max Depth", value: stats?.max_depth_reached },
          { label: "JD Skills", value: stats?.total_jd_skills },
          { label: "Resume Skills", value: stats?.total_resume_skills },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)",
            borderRadius: 10, padding: "8px 16px", textAlign: "center", minWidth: 90,
          }}>
            <div style={{ color: "#a78bfa", fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{value ?? "—"}</div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Mini bar chart of h(n) per step */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginBottom: 8, fontFamily: "monospace" }}>
          h(n) HEURISTIC VALUE PER SEARCH STEP
        </p>
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 50 }}>
          {trace.slice(0, 30).map((step, i) => {
            const h = step.heuristic / maxH;
            const col = scoreColor(step.heuristic);
            return (
              <div
                key={i}
                title={`Step ${step.step}: h=${step.heuristic} | +${step.added_skill}`}
                style={{
                  flex: 1, background: col, opacity: 0.7, borderRadius: "3px 3px 0 0",
                  height: `${Math.max(h * 100, 4)}%`,
                  transition: "height .3s ease",
                  cursor: "pointer",
                  minWidth: 4,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Expanded step table */}
      {expanded && (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                {["Step", "Depth", "Added Skill", "h(n)", "Matched Skills"].map((h) => (
                  <th key={h} style={{ color: "rgba(255,255,255,.45)", padding: "6px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trace.map((step, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                  <td style={{ color: "rgba(255,255,255,.4)", padding: "5px 10px" }}>{step.step}</td>
                  <td style={{ color: "#a78bfa", padding: "5px 10px" }}>{step.depth}</td>
                  <td style={{ color: "#34d399", padding: "5px 10px" }}>{step.added_skill ?? "—"}</td>
                  <td style={{ padding: "5px 10px" }}>
                    <span style={{ color: scoreColor(step.heuristic), fontWeight: 700 }}>{step.heuristic}</span>
                  </td>
                  <td style={{ color: "rgba(255,255,255,.6)", padding: "5px 10px" }}>
                    {step.matched_skills?.slice(0, 5).join(", ")}{step.matched_skills?.length > 5 ? ` +${step.matched_skills.length - 5}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top nodes from search */}
      {allNodes && allNodes.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginBottom: 10, fontFamily: "monospace" }}>
            TOP NODES BY HEURISTIC SCORE
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allNodes.slice(0, 6).map((node, i) => (
              <div key={i} style={{
                background: i === 0 ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.04)",
                border: `1px solid ${i === 0 ? "rgba(34,197,94,.4)" : "rgba(255,255,255,.1)"}`,
                borderRadius: 10, padding: "8px 14px", minWidth: 140,
              }}>
                {i === 0 && <div style={{ color: "#22c55e", fontSize: 10, marginBottom: 4 }}>★ BEST NODE</div>}
                <div style={{ color: scoreColor(node.heuristic), fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>
                  {node.heuristic}%
                </div>
                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>depth {node.depth}</div>
                <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, marginTop: 4 }}>
                  {node.matched?.slice(0, 3).join(", ")}
                  {node.matched?.length > 3 ? ` +${node.matched.length - 3}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Score Breakdown Card ─────────────────────────────────────────────────────
function BreakdownCard({ breakdown }) {
  if (!breakdown) return null;
  const items = Object.entries(breakdown).map(([key, val]) => ({
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: val.score,
    weight: Math.round(val.weight * 100),
  }));
  return (
    <div style={{
      background: "rgba(15,15,25,.95)", border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 16, padding: 24,
    }}>
      <h3 style={{ color: "#e2e8f0", margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Score Breakdown</h3>
      {items.map(({ label, score, weight }) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>{label}</span>
            <span style={{ color: scoreColor(score), fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
              {score}% <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>× {weight}%</span>
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden" }}>
            <div style={{
              width: `${score}%`, height: "100%",
              background: scoreColor(score), borderRadius: 999,
              transition: "width 1s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skills Panel ─────────────────────────────────────────────────────────────
function SkillsPanel({ matched, missing }) {
  return (
    <div style={{
      background: "rgba(15,15,25,.95)", border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 16, padding: 24,
    }}>
      <h3 style={{ color: "#e2e8f0", margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Skill Gap Analysis</h3>
      {matched?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#22c55e", fontSize: 12, margin: "0 0 8px", fontWeight: 600 }}>
            ✓ Matched ({matched.length})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {matched.map((s) => (
              <span key={s} style={{
                background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.3)",
                color: "#4ade80", borderRadius: 8, padding: "3px 10px", fontSize: 12,
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {missing?.length > 0 && (
        <div>
          <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 8px", fontWeight: 600 }}>
            ✗ Missing ({missing.length})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {missing.map((s) => (
              <span key={s} style={{
                background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)",
                color: "#f87171", borderRadius: 8, padding: "3px 10px", fontSize: 12,
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {!matched?.length && !missing?.length && (
        <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>No JD provided — skill gap analysis unavailable.</p>
      )}
    </div>
  );
}

// ─── Details chips ────────────────────────────────────────────────────────────
function DetailChip({ label, value, ok }) {
  const col = ok ? "#34d399" : "#f87171";
  return (
    <div style={{
      background: ok ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)",
      border: `1px solid ${ok ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}`,
      borderRadius: 10, padding: "8px 14px",
    }}>
      <div style={{ color: col, fontSize: 13, fontWeight: 600 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>{label}</div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("score");
  const [pdfFile, setPdfFile] = useState(null);
  const fileRef = useRef();

  // ── PDF extraction via PDF.js (client-side) ──────────────────────────────
  const extractPdfText = async (file) => {
    try {
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      if (!pdfjsLib) throw new Error("PDF.js not loaded");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }
      return text;
    } catch {
      // Fallback: send raw PDF to server
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setError("");
    const text = await extractPdfText(file);
    if (text) setResumeText(text);
  };

  // ── Run Analysis ──────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!resumeText.trim() && !pdfFile) {
      setError("Please paste resume text or upload a PDF.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let data;

      if (pdfFile && !resumeText) {
        // Server-side PDF extraction + analysis
        const form = new FormData();
        form.append("resume", pdfFile);
        form.append("jd_text", jdText);
        const res = await fetch(`${NLP_ENGINE}/analyze/pdf`, { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        data = await res.json();
        if (data.resume_text) setResumeText(data.resume_text);
      } else {
        // Client already has text
        const res = await fetch(`${NLP_ENGINE}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: resumeText, jd_text: jdText }),
        });
        if (!res.ok) throw new Error(await res.text());
        data = await res.json();
      }

      setResult(data);
      setTab("score");
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const score     = result?.score ?? 0;
  const composite = result?.search?.composite_score ?? {};
  const search    = result?.search ?? {};
  const bestMatch = search?.best_match ?? {};
  const details   = composite?.details ?? {};
  const fmt       = details?.formatting ?? {};
  const av        = details?.action_verbs ?? {};
  const qa        = details?.achievements ?? {};
  const st        = details?.structure ?? {};

  const TABS = [
    { id: "score",    label: "Score" },
    { id: "search",   label: "🔍 Search Trace" },
    { id: "skills",   label: "Skills" },
    { id: "keywords", label: "Keywords" },
    { id: "tips",     label: "Tips" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a14 0%, #0d0d1e 50%, #0a0a14 100%)",
      color: "#e2e8f0",
      fontFamily: "'Inter', sans-serif",
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.3)",
            borderRadius: 999, padding: "6px 18px", marginBottom: 16,
          }}>
            <span style={{ color: "#a78bfa", fontSize: 12, fontFamily: "monospace" }}>
              ALGORITHM: BEST-FIRST SEARCH
            </span>
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, margin: 0,
            background: "linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            TalentLens
          </h1>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, marginTop: 6 }}>
            Heuristic-Powered ATS Resume Analyzer
          </p>
        </div>

        {/* Input Section */}
        <div style={{
          background: "rgba(15,15,25,.95)", border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 20, padding: 28, marginBottom: 24,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Resume Input */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600 }}>
                  Resume
                </label>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    background: "rgba(139,92,246,.15)", border: "1px solid rgba(139,92,246,.3)",
                    color: "#a78bfa", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 12,
                  }}
                >
                  Upload PDF
                </button>
              </div>
              <input type="file" accept=".pdf" ref={fileRef} onChange={handleFileChange} style={{ display: "none" }} />
              {pdfFile && (
                <div style={{
                  background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)",
                  borderRadius: 8, padding: "6px 12px", marginBottom: 8, fontSize: 12, color: "#a78bfa",
                }}>
                  📄 {pdfFile.name}
                </div>
              )}
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste resume text here, or upload a PDF above…"
                rows={10}
                style={{
                  width: "100%", background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.1)", borderRadius: 12,
                  color: "#e2e8f0", fontSize: 13, padding: 14, resize: "vertical",
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>

            {/* JD Input */}
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Job Description <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here for targeted matching…"
                rows={10}
                style={{
                  width: "100%", background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.1)", borderRadius: 12,
                  color: "#e2e8f0", fontSize: 13, padding: 14, resize: "vertical",
                  outline: "none", boxSizing: "border-box", marginTop: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
              borderRadius: 10, padding: "10px 16px", marginTop: 12, color: "#f87171", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={loading}
            style={{
              marginTop: 20, width: "100%", padding: "14px 0",
              background: loading ? "rgba(139,92,246,.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .2s",
              boxShadow: loading ? "none" : "0 4px 24px rgba(124,58,237,.4)",
            }}
          >
            {loading ? "Running Best-First Search…" : "Analyze Resume"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div>
            {/* Score Hero */}
            <div style={{
              background: "rgba(15,15,25,.95)", border: `1px solid ${scoreColor(score)}40`,
              borderRadius: 20, padding: 28, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap",
            }}>
              <ScoreRing score={score} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(score), marginBottom: 4 }}>
                  <AnimatedNumber value={score} suffix="%" />
                </div>
                <div style={{ color: scoreColor(score), fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  {scoreLabel(score)}
                </div>
                <div style={{ color: "rgba(255,255,255,.45)", fontSize: 13, maxWidth: 400 }}>
                  Best-First Search explored <strong style={{ color: "#a78bfa" }}>{search.stats?.nodes_explored}</strong> nodes,
                  matched <strong style={{ color: "#34d399" }}>{bestMatch.match_rate}%</strong> of JD skills
                  {composite.penalty > 0 && (
                    <span style={{ color: "#f87171" }}> (−{composite.penalty}% stuffing penalty)</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <DetailChip label="Email" value={fmt.has_email ? "✓ Found" : "✗ Missing"} ok={fmt.has_email} />
                <DetailChip label="Phone" value={fmt.has_phone ? "✓ Found" : "✗ Missing"} ok={fmt.has_phone} />
                <DetailChip label="Action Verbs" value={av.count ?? 0} ok={av.count >= 5} />
                <DetailChip label="Achievements" value={qa.achievement_count ?? 0} ok={qa.achievement_count >= 3} />
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    padding: "8px 18px", borderRadius: 10, cursor: "pointer",
                    fontSize: 13, fontWeight: 600, border: "none",
                    background: tab === id ? "rgba(139,92,246,.25)" : "rgba(255,255,255,.05)",
                    color: tab === id ? "#a78bfa" : "rgba(255,255,255,.5)",
                    outline: tab === id ? "1px solid rgba(139,92,246,.4)" : "none",
                    transition: "all .15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === "score"   && <BreakdownCard breakdown={composite.breakdown} />}
            {tab === "search"  && (
              <SearchTracePanel
                trace={search.search_trace}
                stats={search.stats}
                allNodes={search.all_nodes}
              />
            )}
            {tab === "skills"  && (
              <SkillsPanel
                matched={bestMatch.matched_skills}
                missing={bestMatch.missing_skills}
              />
            )}
            {tab === "keywords" && (
              <div style={{
                background: "rgba(15,15,25,.95)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 16, padding: 24,
              }}>
                <h3 style={{ color: "#e2e8f0", margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Keyword Match</h3>
                {details?.keyword?.matched_keywords?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ color: "#22c55e", fontSize: 12, margin: "0 0 8px" }}>Matched Keywords</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {details.keyword.matched_keywords.map((k) => (
                        <span key={k} style={{
                          background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)",
                          color: "#4ade80", borderRadius: 8, padding: "3px 10px", fontSize: 12,
                        }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {details?.keyword?.missing_keywords?.length > 0 && (
                  <div>
                    <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 8px" }}>Missing Keywords</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {details.keyword.missing_keywords.map((k) => (
                        <span key={k} style={{
                          background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                          color: "#f87171", borderRadius: 8, padding: "3px 10px", fontSize: 12,
                        }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                  Cosine similarity: {result?.similarity?.cosine_score ?? "—"} ·
                  Matched terms: {result?.similarity?.matched_terms?.join(", ")}
                </div>
              </div>
            )}
            {tab === "tips" && (
              <div style={{
                background: "rgba(15,15,25,.95)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 16, padding: 24,
              }}>
                <h3 style={{ color: "#e2e8f0", margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>
                  Improvement Tips
                </h3>
                {[
                  !fmt.has_email && "Add a professional email address.",
                  !fmt.has_phone && "Include a phone number.",
                  !fmt.has_linkedin && "Add your LinkedIn profile URL.",
                  (av.count ?? 0) < 5 && `Use more action verbs (found ${av.count ?? 0}, target ≥5): built, developed, optimized…`,
                  (qa.achievement_count ?? 0) < 3 && "Add quantified achievements (%, $, ×) to demonstrate impact.",
                  bestMatch.missing_skills?.length > 0 && `Add missing skills to resume: ${bestMatch.missing_skills?.slice(0, 5).join(", ")}.`,
                  details?.stuffing?.stuffed && "Reduce keyword repetition — stuffing penalty applied.",
                  st.missing_sections?.includes("summary") && "Add a professional summary section.",
                  st.missing_sections?.includes("projects") && "Add a Projects section to showcase work.",
                ].filter(Boolean).map((tip, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)",
                  }}>
                    <span style={{ color: "#f59e0b", fontSize: 14, marginTop: 1 }}>⚡</span>
                    <span style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}