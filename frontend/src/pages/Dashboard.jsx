import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Upload, Sparkles, Target, Zap, Cpu, Award, 
  CheckCircle, PlusCircle, AlertCircle, FileSearch, 
  Lightbulb, Activity, Check, X, ShieldAlert 
} from "lucide-react";

const NLP_ENGINE = "http://localhost:8000";

// ─── Colour helpers ──────────────────────────────────────────────────────────
const scoreColor = (s) => {
  if (s >= 75) return "#10b981"; // success green
  if (s >= 50) return "#f59e0b"; // warning amber
  if (s >= 30) return "#f97316"; // orange
  return "#ef4444"; // danger red
};

const scoreLabel = (s) => {
  if (s >= 75) return "Strong Match";
  if (s >= 50) return "Good Match";
  if (s >= 30) return "Partial Match";
  return "Weak Match";
};

// ─── Framer Motion Variants ──────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
function ScoreRing({ score, size = 160, stroke = 12 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} className="drop-shadow-2xl">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.5 }}
          className="text-4xl font-black tabular-nums tracking-tighter" style={{ color }}
        >
          <AnimatedNumber value={score} />%
        </motion.span>
        <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest mt-1">
          Match Score
        </span>
      </div>
    </div>
  );
}

// ─── Heuristic SVG Chart ─────────────────────────────────────────────────────
function HeuristicChart({ trace, maxH }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const pathRef = useRef(null);

  const W = 800, H = 200;
  const PAD = { top: 28, right: 24, bottom: 38, left: 48 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const displayTrace = trace.slice(0, 60);
  const n = displayTrace.length;

  const xOf = (i) => PAD.left + (n <= 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yOf = (h) => PAD.top + iH - (h / (maxH || 1)) * iH;

  const linePts = displayTrace.map((s, i) => `${xOf(i)},${yOf(s.heuristic)}`).join(" L ");
  const areaPath = `M ${xOf(0)},${PAD.top + iH} L ${linePts} L ${xOf(n - 1)},${PAD.top + iH} Z`;
  const linePath = `M ${linePts}`;

  const yTicks = [0, 25, 50, 75, 100];
  const peakIdx = displayTrace.reduce((b, s, i) =>
    s.heuristic > displayTrace[b].heuristic ? i : b, 0);

  const hovered = hoveredIdx !== null ? displayTrace[hoveredIdx] : null;
  const hoveredPrev = hoveredIdx > 0 ? displayTrace[hoveredIdx - 1] : null;
  const delta = hovered && hoveredPrev
    ? (hovered.heuristic - hoveredPrev.heuristic).toFixed(2)
    : null;
  const netDelta = displayTrace.length > 1
    ? (displayTrace[displayTrace.length - 1].heuristic - displayTrace[0].heuristic).toFixed(2)
    : 0;

  return (
    <div className="mb-6">
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-3 h-3" /> Heuristic Value History — h(n) per Search Step
        </p>
        <div className="flex items-center gap-4 text-[10px] font-mono text-white/35">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full bg-[#10b981]" />Improving
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full bg-[#ef4444]" />Declining
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />Peak
          </span>
        </div>
      </div>

      {/* Hover tooltip bar */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 flex flex-wrap items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono"
          >
            <span className="text-white/40">Step <span className="text-white font-bold">{hovered.step}</span></span>
            <span className="text-white/20">·</span>
            <span className="text-white/40">Depth <span className="text-[var(--color-primary)] font-bold">{hovered.depth}</span></span>
            <span className="text-white/20">·</span>
            <span className="text-white/40">h(n) = <span className="font-bold" style={{ color: scoreColor(hovered.heuristic) }}>{hovered.heuristic}</span></span>
            {delta !== null && (
              <>
                <span className="text-white/20">·</span>
                <span className="font-bold" style={{ color: Number(delta) >= 0 ? "#10b981" : "#ef4444" }}>
                  {Number(delta) >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs prev
                </span>
              </>
            )}
            {hovered.added_skill && (
              <>
                <span className="text-white/20">·</span>
                <span className="px-2 py-0.5 rounded-lg bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/25 text-[11px]">
                  +{hovered.added_skill}
                </span>
              </>
            )}
            {hovered.matched_skills?.length > 0 && (
              <span className="text-white/30 truncate max-w-xs">
                [{hovered.matched_skills.slice(0, 4).join(", ")}{hovered.matched_skills.length > 4 ? ` +${hovered.matched_skills.length - 4}` : ""}]
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG chart */}
      <div className="w-full rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: "220px" }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="hcAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.01" />
            </linearGradient>
            <filter id="hcGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="hcClip">
              <rect x={PAD.left} y={PAD.top} width={iW} height={iH} />
            </clipPath>
          </defs>

          {/* Y-axis gridlines + labels */}
          {yTicks.map((tick) => {
            const y = yOf((tick / 100) * maxH);
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={PAD.left + iW} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                  strokeDasharray={tick === 0 ? "none" : "4 4"} />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end"
                  fill="rgba(255,255,255,0.28)" fontSize="9" fontFamily="monospace">
                  {tick}
                </text>
              </g>
            );
          })}

          {/* X-axis step labels (every 5 steps) */}
          {displayTrace.map((s, i) => {
            if (i === 0 || (i + 1) % 5 !== 0) return null;
            return (
              <text key={i} x={xOf(i)} y={PAD.top + iH + 14}
                textAnchor="middle" fill="rgba(255,255,255,0.22)" fontSize="9" fontFamily="monospace">
                {s.step}
              </text>
            );
          })}
          {/* Axis labels */}
          <text x={PAD.left + iW / 2} y={H - 2} textAnchor="middle"
            fill="rgba(255,255,255,0.18)" fontSize="8" fontFamily="monospace">STEP</text>
          <text x={12} y={PAD.top + iH / 2} textAnchor="middle"
            fill="rgba(255,255,255,0.18)" fontSize="8" fontFamily="monospace"
            transform={`rotate(-90, 12, ${PAD.top + iH / 2})`}>h(n)</text>

          {/* Area fill */}
          <path d={areaPath} fill="url(#hcAreaGrad)" clipPath="url(#hcClip)" />

          {/* Per-segment coloured line (green=rise, red=fall) */}
          {displayTrace.slice(1).map((s, i) => {
            const prev = displayTrace[i];
            const col = s.heuristic >= prev.heuristic ? "#10b981" : "#ef4444";
            return (
              <line key={i}
                x1={xOf(i)} y1={yOf(prev.heuristic)}
                x2={xOf(i + 1)} y2={yOf(s.heuristic)}
                stroke={col} strokeWidth="2.5" strokeLinecap="round"
                filter="url(#hcGlow)" clipPath="url(#hcClip)" />
            );
          })}

          {/* Entrance animation overlay */}
          <motion.path
            ref={pathRef}
            d={linePath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            clipPath="url(#hcClip)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />

          {/* Peak marker */}
          <g>
            <line x1={xOf(peakIdx)} y1={PAD.top}
              x2={xOf(peakIdx)} y2={PAD.top + iH}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
            <circle cx={xOf(peakIdx)} cy={yOf(displayTrace[peakIdx].heuristic)}
              r="5" fill="#f59e0b" filter="url(#hcGlow)" />
            <text x={xOf(peakIdx)} y={PAD.top + 13} textAnchor="middle"
              fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ▲ {displayTrace[peakIdx].heuristic}
            </text>
          </g>

          {/* Interactive dots with hover hit targets */}
          {displayTrace.map((s, i) => {
            const isHov = hoveredIdx === i;
            const col = scoreColor(s.heuristic);
            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} style={{ cursor: "crosshair" }}>
                <circle cx={xOf(i)} cy={yOf(s.heuristic)} r="12" fill="transparent" />
                <motion.circle
                  cx={xOf(i)} cy={yOf(s.heuristic)}
                  fill={col}
                  stroke={isHov ? "white" : "transparent"}
                  strokeWidth="1.5"
                  filter={isHov ? "url(#hcGlow)" : undefined}
                  animate={{ r: isHov ? 5 : i === peakIdx ? 4 : 2.5 }}
                  transition={{ duration: 0.12 }}
                />
                {isHov && (
                  <line x1={xOf(i)} y1={PAD.top} x2={xOf(i)} y2={PAD.top + iH}
                    stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mini stat row */}
      <div className="flex flex-wrap items-center gap-5 mt-3 text-[10px] font-mono text-white/40">
        <span>Peak h(n): <span className="text-[#f59e0b] font-bold">{maxH}</span></span>
        <span>Start: <span className="text-white/60 font-bold">{displayTrace[0]?.heuristic ?? "—"}</span></span>
        <span>Final: <span className="text-white/60 font-bold">{displayTrace[displayTrace.length - 1]?.heuristic ?? "—"}</span></span>
        {displayTrace.length > 1 && (
          <span>Net Δ: <span className="font-bold" style={{ color: Number(netDelta) >= 0 ? "#10b981" : "#ef4444" }}>
            {Number(netDelta) >= 0 ? "+" : ""}{netDelta}
          </span></span>
        )}
        <span className="ml-auto opacity-60">Showing {displayTrace.length} / {trace.length} steps · hover dots for detail</span>
      </div>
    </div>
  );
}

// ─── Search Trace Visualizer ─────────────────────────────────────────────────
function SearchTracePanel({ trace, stats, allNodes }) {
  const [expanded, setExpanded] = useState(false);
  if (!trace || trace.length === 0) return null;

  const maxH = Math.max(...trace.map((s) => s.heuristic), 1);

  return (
    <motion.div variants={itemVariants} className="glass-panel p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4 items-center">
          <div className="p-2.5 bg-[var(--color-primary)]/20 rounded-xl border border-[var(--color-primary)]/30">
            <Cpu className="w-6 h-6 text-[var(--color-primary)] animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Best-First Search Trace
            </h3>
            <p className="text-xs text-white/50 font-mono mt-1">
              Frontier explored <span className="text-[var(--color-primary)] font-bold">{stats?.nodes_explored}</span> nodes · max depth <span className="text-[var(--color-primary)] font-bold">{stats?.max_depth_reached}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 rounded-xl text-xs font-semibold text-[var(--color-primary)] transition-colors"
        >
          {expanded ? "Collapse Details" : "View Traces"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Nodes Explored", value: stats?.nodes_explored, icon: Activity },
          { label: "Max Depth", value: stats?.max_depth_reached, icon: Target },
          { label: "JD Skills", value: stats?.total_jd_skills, icon: FileSearch },
          { label: "Resume Skills", value: stats?.total_resume_skills, icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors">
            <Icon className="w-5 h-5 text-[var(--color-primary)] mb-2 opacity-80" />
            <div className="text-2xl font-black font-mono text-white/90">{value ?? "—"}</div>
            <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Rich heuristic chart */}
      <HeuristicChart trace={trace} maxH={maxH} />

      {/* Expanded step table */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-x-auto mt-6 border border-white/10 rounded-xl"
          >
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-white/50 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Step</th>
                  <th className="px-4 py-3 font-semibold">Depth</th>
                  <th className="px-4 py-3 font-semibold">Added Skill</th>
                  <th className="px-4 py-3 font-semibold">h(n)</th>
                  <th className="px-4 py-3 font-semibold">Δh</th>
                  <th className="px-4 py-3 font-semibold">Matched State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trace.map((step, i) => {
                  const d = i === 0 ? 0 : step.heuristic - trace[i - 1].heuristic;
                  const dStr = d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2);
                  const dCol = d > 0 ? "#10b981" : d < 0 ? "#ef4444" : "#6b7280";
                  return (
                    <tr key={i} className="hover:bg-white/5 transition-colors font-mono">
                      <td className="px-4 py-2.5 text-white/40">{step.step}</td>
                      <td className="px-4 py-2.5 text-[var(--color-primary)]">{step.depth}</td>
                      <td className="px-4 py-2.5 text-[#34d399]">{step.added_skill ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-1 rounded-md font-bold" style={{ color: scoreColor(step.heuristic), background: `${scoreColor(step.heuristic)}20` }}>
                          {step.heuristic}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: dCol }}>{i === 0 ? "—" : dStr}</td>
                      <td className="px-4 py-2.5 text-white/50 truncate max-w-[200px]">
                        {step.matched_skills?.slice(0, 3).join(", ")}{step.matched_skills?.length > 3 ? ` +${step.matched_skills.length - 3}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Score Breakdown Card ─────────────────────────────────────────────────────
function BreakdownCard({ breakdown }) {
  if (!breakdown) return null;
  const items = Object.entries(breakdown)
    .sort((a,b) => b[1].weight - a[1].weight) // sort by weight descending
    .map(([key, val]) => ({
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      score: val.score,
      weight: Math.round(val.weight * 100),
    }));

  return (
    <motion.div variants={itemVariants} className="glass-panel p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Target className="w-5 h-5 text-[var(--color-primary)]" />
        Scoring Breakdown
      </h3>
      <div className="flex flex-col gap-5">
        {items.map(({ label, score, weight }, i) => (
          <motion.div key={label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-white/80">{label}</span>
              <span className="text-sm font-mono font-bold" style={{ color: scoreColor(score) }}>
                {score}% <span className="text-white/30 font-medium text-xs ml-1">× {weight}% wt</span>
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: scoreColor(score), boxShadow: `0 0 10px ${scoreColor(score)}` }} 
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Skills Panel ─────────────────────────────────────────────────────────────
function SkillsPanel({ matched, missing }) {
  return (
    <motion.div variants={itemVariants} className="glass-panel p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Zap className="w-5 h-5 text-[var(--color-primary)]" />
        Skill Gap Analysis
      </h3>
      
      {matched?.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider mb-3 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Matched ({matched.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {matched.map((s, i) => (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                key={s} 
                className="px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.1)]"
              >
                {s}
              </motion.span>
            ))}
          </div>
        </div>
      )}
      
      {missing?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Missing ({missing.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map((s, i) => (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (matched?.length || 0)*0.03 + i * 0.03 }}
                key={s} 
                className="px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              >
                {s}
              </motion.span>
            ))}
          </div>
        </div>
      )}
      
      {!matched?.length && !missing?.length && (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
          <FileSearch className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-white/50">No Job Description provided.</p>
          <p className="text-xs text-white/30 mt-1">Skill gap analysis is unavailable without a target JD.</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Details chips ────────────────────────────────────────────────────────────
function DetailChip({ label, value, ok, icon: Icon }) {
  const col = ok ? "#10b981" : "#ef4444";
  return (
    <div className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all hover:-translate-y-1 ${ok ? "bg-[#10b981]/10 border-[#10b981]/20 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]" : "bg-[#ef4444]/10 border-[#ef4444]/20 hover:shadow-[0_4px_20px_rgba(239,68,68,0.15)]"}`}>
      <div className="flex items-center gap-2 mb-1" style={{ color: col }}>
        {Icon ? <Icon className="w-4 h-4" /> : (ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />)}
        <span className="text-sm font-bold tracking-tight">{value}</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
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
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError("");
      const text = await extractPdfText(file);
      if (text) setResumeText(text);
    } else {
      setError("Please drop a valid PDF file.");
    }
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
        const form = new FormData();
        form.append("resume", pdfFile);
        form.append("jd_text", jdText);
        const res = await fetch(`${NLP_ENGINE}/analyze/pdf`, { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        data = await res.json();
        if (data.resume_text) setResumeText(data.resume_text);
      } else {
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
  const score      = result?.score ?? 0;
  const composite  = result?.search?.composite_score ?? {};
  const search     = result?.search ?? {};
  const bestMatch  = search?.best_match ?? {};
  const details    = composite?.details ?? {};
  const fmt        = details?.formatting ?? {};
  const av         = details?.action_verbs ?? {};
  const qa         = details?.achievements ?? {};
  const st         = details?.structure ?? {};
  const ed         = details?.education ?? {};
  // Structured report fields from backend
  const verdict    = result?.verdict ?? "";
  const strengths  = result?.strengths ?? [];
  const reportGaps = result?.gaps ?? [];
  const suggestions = result?.suggestions ?? [];

  const TABS = [
    { id: "score",    label: "Score", icon: Target },
    { id: "search",   label: "Search Trace", icon: Activity },
    { id: "skills",   label: "Skills Matrix", icon: Zap },
    { id: "keywords", label: "Keywords", icon: FileSearch },
    { id: "tips",     label: "Insights", icon: Lightbulb },
  ];

  return (
    <div className="w-full relative py-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Resume Input Area */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-primary)]" /> Target Resume
                </label>
                {pdfFile && (
                  <span className="text-[10px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-1 rounded font-mono truncate max-w-[150px]">
                    {pdfFile.name}
                  </span>
                )}
              </div>
              
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full relative rounded-2xl overflow-hidden transition-all duration-300 ${isDragging ? "ring-2 ring-[var(--color-primary)] scale-[1.02]" : ""}`}
              >
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste raw resume text, or drop a PDF here..."
                  className="w-full h-[240px] glass-input p-5 text-sm resize-none rounded-2xl font-mono leading-relaxed placeholder:text-white/20 custom-scrollbar relative z-10"
                />
                
                {/* Visual drop overlay when empty */}
                {!resumeText && !pdfFile && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-white/30" />
                    </div>
                    <span className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                      Drag & Drop PDF
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2.5 mt-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/70 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" /> Upload PDF Instead
              </button>
              <input type="file" accept=".pdf" ref={fileRef} onChange={handleFileChange} className="hidden" />
            </div>

            {/* JD Input Area */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--color-secondary)]" /> Job Description
                <span className="text-[10px] font-normal uppercase text-white/30 ml-2 bg-white/5 px-2 py-0.5 rounded">Optional</span>
              </label>
              
              <div className="w-full relative rounded-2xl overflow-hidden">
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the target job description to enable comprehensive skill gap analysis..."
                  className="w-full h-[240px] glass-input p-5 text-sm resize-none rounded-2xl font-mono leading-relaxed placeholder:text-white/20 custom-scrollbar"
                />
              </div>
            </div>
            
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500/90 text-sm font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Action Button */}
          <button
            onClick={analyze}
            disabled={loading}
            className={`mt-6 w-full py-4 rounded-xl text-[15px] font-bold text-white transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${
              loading 
              ? "bg-white/5 border border-white/10 cursor-not-allowed" 
              : "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(139,92,246,0.5)]"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-shimmer absolute inset-0"></div>
                <Sparkles className="w-5 h-5 animate-spin relative z-10 text-[var(--color-primary)]" />
                <span className="relative z-10 text-white/70">Agentic Engine Searching...</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Cpu className="w-5 h-5" /> Execute Agentic Scan
              </>
            )}
          </button>
        </motion.div>

        {/* Results Section */}
        {result && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-20">
            
            {/* Score Hero Panel */}
            <motion.div variants={itemVariants} className="glass-panel-active p-8 relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-[var(--color-primary)]/20 transition-colors duration-1000"></div>
              
              <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <ScoreRing score={score} />
                
                <div className="flex-1 text-center md:text-left space-y-4">
                  <div>
                    <h2 className="text-3xl font-black mb-1" style={{ color: scoreColor(score) }}>
                      {scoreLabel(score)}
                    </h2>
                    <p className="text-sm text-white/60 font-medium">
                      Agentic search explored <span className="text-[var(--color-primary)] font-bold">{search.stats?.nodes_explored}</span> nodes to find <span className="text-[#10b981] font-bold">{bestMatch.matched_skills?.length || 0}</span> matching JD skills.
                      {composite.penalty > 0 && <span className="text-[#ef4444] ml-1">(−{composite.penalty}% penalty)</span>}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/5">
                    <DetailChip label="Email ID" value="Found" ok={fmt.has_email} />
                    <DetailChip label="Phone No" value="Found" ok={fmt.has_phone} />
                    <DetailChip label="Action Verbs" value={av.count ?? 0} ok={av.count >= 5} icon={Activity} />
                    <DetailChip label="Core Metrics" value={qa.achievement_count ?? 0} ok={qa.achievement_count >= 3} icon={Award} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Smart Navigation Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 w-fit">
              {TABS.map((t) => {
                const isActive = tab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 focus:outline-none ${
                      isActive ? "text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 rounded-xl overflow-hidden" 
                      />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Views */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={tab}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                {tab === "score" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BreakdownCard breakdown={composite.breakdown} />
                    
                    {/* Structured Analysis Report */}
                    <motion.div variants={itemVariants} className="glass-panel p-6">
                      <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-[var(--color-primary)]" />
                        Analysis Report
                      </h3>

                      {/* Verdict badge */}
                      {verdict && (
                        <div
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mb-5 border"
                          style={{
                            color: scoreColor(score),
                            background: `${scoreColor(score)}18`,
                            borderColor: `${scoreColor(score)}40`,
                          }}
                        >
                          <Sparkles className="w-4 h-4" />
                          {verdict} — {score}%
                        </div>
                      )}

                      {/* Strengths */}
                      {strengths.length > 0 && (
                        <div className="mb-5">
                          <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest mb-2 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Strengths
                          </p>
                          <div className="flex flex-col gap-2">
                            {strengths.map((s, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-center gap-2 text-sm text-white/80"
                              >
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#10b981]/20 text-[#10b981] text-xs font-bold shrink-0">✓</span>
                                {s}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Critical Gaps */}
                      {reportGaps.length > 0 && (
                        <div className="mb-5">
                          <p className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Critical Gaps
                          </p>
                          <div className="flex flex-col gap-2">
                            {reportGaps.map((g, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-center gap-2 text-sm text-white/70"
                              >
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#ef4444]/20 text-[#ef4444] text-xs font-bold shrink-0">✗</span>
                                {g}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {suggestions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-[var(--color-warning)] uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5" /> Recommendations
                          </p>
                          <div className="flex flex-col gap-2">
                            {suggestions.map((tip, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="flex gap-2 items-start text-xs text-white/65 leading-relaxed"
                              >
                                <span className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] text-[10px] font-bold">{i + 1}</span>
                                {tip}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback: raw text if no structured data */}
                      {!verdict && result?.explanationText && (
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 font-mono text-xs text-white/60 leading-relaxed">
                          {result.explanationText}
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}

                {tab === "search" && (
                  <SearchTracePanel trace={search.search_trace} stats={search.stats} allNodes={search.all_nodes} />
                )}

                {tab === "skills" && (
                  <SkillsPanel matched={bestMatch.matched_skills} missing={bestMatch.missing_skills} />
                )}

                {tab === "keywords" && (
                  <motion.div variants={itemVariants} className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <FileSearch className="w-5 h-5 text-[var(--color-primary)]" /> Contextual Keywords
                    </h3>
                    
                    {details?.keyword?.matched_keywords?.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-[#10b981] uppercase tracking-wider mb-3 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Matched Context
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {details.keyword.matched_keywords.map((k) => (
                            <span key={k} className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/80 rounded-lg text-xs font-mono">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {details?.keyword?.missing_keywords?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Target className="w-4 h-4" /> Target Keywords
                        </p>
                        <div className="flex flex-wrap gap-2 cursor-pointer">
                          {details.keyword.missing_keywords.map((k) => (
                            <span key={k} className="px-3 py-1.5 bg-white/5 border border-dashed border-white/10 text-white/40 rounded-lg text-xs font-mono hover:bg-white/10">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-8 pt-4 border-t border-white/5 flex items-center flex-wrap gap-4 text-xs font-mono text-white/40">
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <Activity className="w-3 h-3 text-[var(--color-primary)]" />
                        Cosine Diff: <span className="text-white/80 font-bold">{result?.similarity?.cosine_score ?? "—"}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {tab === "tips" && (
                  <motion.div variants={itemVariants} className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-[var(--color-warning)]" /> Actionable Insights
                    </h3>
                    <div className="grid gap-3">
                      {[
                        !fmt.has_email && "Resume requires a professional email address.",
                        !fmt.has_phone && "Include a direct contact phone number.",
                        !fmt.has_linkedin && "Add your LinkedIn profile URL to boost visibility.",
                        (av.count ?? 0) < 5 && `Increase verb density: Use strong action verbs (found ${av.count ?? 0}/5). e.g., 'Implemented', 'Led'.`,
                        (qa.achievement_count ?? 0) < 3 && "Quantify achievements with metrics (%, $, x) to demonstrate measurable impact.",
                        bestMatch.missing_skills?.length > 0 && `High Priority Gap: Integrate skills like ${bestMatch.missing_skills?.slice(0, 3).join(", ")}.`,
                        details?.stuffing?.stuffed && "Warning: Detected unnatural keyword density. Reduce repetition to avoid ATS down-ranking.",
                        st.missing_sections?.includes("summary") && "Include a professional summary outlining your core value proposition.",
                        st.missing_sections?.includes("projects") && "Highlight practical experience lacking an explicit Projects/Portfolio section.",
                      ].filter(Boolean).map((tip, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          key={i} 
                          className="flex gap-3 items-start p-4 bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 rounded-xl"
                        >
                          <Lightbulb className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-white/80">{tip}</span>
                        </motion.div>
                      ))}
                      {/* Placeholder if perfect */}
                      {([!fmt.has_email, !fmt.has_phone, !fmt.has_linkedin, (av.count ?? 0) < 5, (qa.achievement_count ?? 0) < 3, bestMatch.missing_skills?.length > 0, details?.stuffing?.stuffed, st.missing_sections?.includes("summary"), st.missing_sections?.includes("projects")].filter(Boolean).length === 0) && (
                        <div className="p-6 text-center text-white/50 border border-dashed border-white/10 rounded-xl">
                          <CheckCircle className="w-8 h-8 text-[#10b981] mx-auto mb-2 opacity-50" />
                          Resume formatting appears highly optimized for ATS parsers.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
            
          </motion.div>
        )}
      </div>
    </div>
  );
}