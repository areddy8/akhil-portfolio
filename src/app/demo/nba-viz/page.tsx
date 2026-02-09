"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

/* ── types ──────────────────────────────────────────────────────── */

type Shot = {
  x: number;
  y: number;
  made: number;
  type: string;
  zone: string;
  area: string;
  range: string;
  distance: number;
  action: string;
  quarter: number;
};

type CareerSeason = {
  season: string;
  team: string;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  min: number;
};

type Player = {
  id: number;
  name: string;
  shots: Record<string, Shot[]>;
  career: CareerSeason[];
};

type ViewMode = "shots" | "heatmap" | "hotzones" | "zones" | "h2h" | "momentum" | "career";

/* ── style tokens ──────────────────────────────────────────────── */

const glass =
  "rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] shadow-[0_1px_2px_rgba(0,0,0,0.4)]";
const glassInner = "rounded-xl border border-white/[0.06] bg-white/[0.03]";
const label =
  "text-[10px] uppercase tracking-[0.18em] font-medium text-white/40";
const pill =
  "rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/60 transition hover:bg-white/[0.08] hover:text-white cursor-pointer";
const selectStyle =
  "rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-[11px] text-white/80 outline-none";

/* ── court constants (tenths of feet, NBA coords) ─────────────── */

const COURT_W = 500; // -250 to 250
const COURT_H = 470; // -47.5 to 422.5
const CX = 250;

/* ── helpers ────────────────────────────────────────────────────── */

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function courtToSvg(shotX: number, shotY: number): [number, number] {
  return [shotX + CX, shotY + 47.5];
}

/* ── shot color ─────────────────────────────────────────────────── */

function shotColor(made: number, opacity: number = 0.7) {
  return made
    ? `rgba(52, 211, 153, ${opacity})`   // emerald
    : `rgba(248, 113, 113, ${opacity})`; // rose
}

/* ── zone aggregation ──────────────────────────────────────────── */

type ZoneStats = {
  zone: string;
  attempts: number;
  makes: number;
  pct: number;
  pps: number; // points per shot
};

function aggregateZones(shots: Shot[]): ZoneStats[] {
  const map = new Map<string, { a: number; m: number; pts: number }>();
  for (const s of shots) {
    const key = s.zone;
    const prev = map.get(key) ?? { a: 0, m: 0, pts: 0 };
    prev.a++;
    if (s.made) {
      prev.m++;
      prev.pts += s.type === "3PT Field Goal" ? 3 : 2;
    }
    map.set(key, prev);
  }
  return Array.from(map.entries())
    .map(([zone, { a, m, pts }]) => ({
      zone,
      attempts: a,
      makes: m,
      pct: a > 0 ? m / a : 0,
      pps: a > 0 ? pts / a : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);
}

/* ── quarter aggregation ───────────────────────────────────────── */

type QuarterStats = {
  quarter: string;
  attempts: number;
  makes: number;
  pct: number;
};

function aggregateQuarters(shots: Shot[]): QuarterStats[] {
  const map = new Map<number, { a: number; m: number }>();
  for (const s of shots) {
    const prev = map.get(s.quarter) ?? { a: 0, m: 0 };
    prev.a++;
    if (s.made) prev.m++;
    map.set(s.quarter, prev);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([q, { a, m }]) => ({
      quarter: q <= 4 ? `Q${q}` : `OT${q - 4}`,
      attempts: a,
      makes: m,
      pct: a > 0 ? m / a : 0,
    }));
}

/* ── distance histogram ────────────────────────────────────────── */

type DistBucket = { range: string; attempts: number; makes: number; pct: number };

function aggregateDistance(shots: Shot[]): DistBucket[] {
  const buckets: [string, number, number][] = [
    ["0-3 ft", 0, 3],
    ["3-10 ft", 3, 10],
    ["10-16 ft", 10, 16],
    ["16-3PT", 16, 23],
    ["3PT", 23, 40],
    ["Deep 3", 40, 100],
  ];
  return buckets.map(([range, lo, hi]) => {
    const subset = shots.filter((s) => s.distance >= lo && s.distance < hi);
    const makes = subset.filter((s) => s.made).length;
    return {
      range,
      attempts: subset.length,
      makes,
      pct: subset.length > 0 ? makes / subset.length : 0,
    };
  });
}

/* ── hexagonal binning (inspired by Roboflow detection heatmaps) ── */

type HexBin = {
  cx: number;
  cy: number;
  count: number;
  makes: number;
  pct: number;
};

function hexBinShots(shots: Shot[], hexRadius: number = 18): HexBin[] {
  const w = hexRadius * 2;
  const h = Math.sqrt(3) * hexRadius;
  const bins = new Map<string, HexBin>();

  for (const s of shots) {
    const [sx, sy] = [s.x + CX, s.y + 47.5]; // court coords
    // offset hex grid
    const row = Math.round(sy / h);
    const offset = row % 2 === 0 ? 0 : w * 0.5;
    const col = Math.round((sx - offset) / w);
    const cx = col * w + offset;
    const cy = row * h;
    const key = `${col},${row}`;
    const prev = bins.get(key) ?? { cx, cy, count: 0, makes: 0, pct: 0 };
    prev.count++;
    if (s.made) prev.makes++;
    bins.set(key, prev);
  }

  return Array.from(bins.values()).map((b) => ({
    ...b,
    pct: b.count > 0 ? b.makes / b.count : 0,
  }));
}

function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

/* ── NBA hot zones ─────────────────────────────────────────────── */

// Approximate NBA zone regions (simplified for SVG overlay)
const HOT_ZONES = [
  { id: "ra", name: "Restricted Area", test: (s: Shot) => s.distance <= 4 },
  { id: "paint-l", name: "Paint (L)", test: (s: Shot) => s.distance > 4 && s.distance <= 8 && s.x < 0 },
  { id: "paint-r", name: "Paint (R)", test: (s: Shot) => s.distance > 4 && s.distance <= 8 && s.x >= 0 },
  { id: "mid-l", name: "Mid-Range Left", test: (s: Shot) => s.distance > 8 && s.distance <= 16 && s.x < -80 },
  { id: "mid-cl", name: "Mid-Range Center-Left", test: (s: Shot) => s.distance > 8 && s.distance <= 16 && s.x >= -80 && s.x < 0 },
  { id: "mid-cr", name: "Mid-Range Center-Right", test: (s: Shot) => s.distance > 8 && s.distance <= 16 && s.x >= 0 && s.x < 80 },
  { id: "mid-r", name: "Mid-Range Right", test: (s: Shot) => s.distance > 8 && s.distance <= 16 && s.x >= 80 },
  { id: "mid-long-l", name: "Long Mid Left", test: (s: Shot) => s.distance > 16 && s.distance <= 23.75 && s.x < -80 },
  { id: "mid-long-c", name: "Long Mid Center", test: (s: Shot) => s.distance > 16 && s.distance <= 23.75 && s.x >= -80 && s.x < 80 },
  { id: "mid-long-r", name: "Long Mid Right", test: (s: Shot) => s.distance > 16 && s.distance <= 23.75 && s.x >= 80 },
  { id: "three-l", name: "3PT Left Corner", test: (s: Shot) => s.distance > 23.75 && s.x < -180 && s.y < 90 },
  { id: "three-lw", name: "3PT Left Wing", test: (s: Shot) => s.distance > 23.75 && s.x < -80 && !(s.x < -180 && s.y < 90) },
  { id: "three-c", name: "3PT Center", test: (s: Shot) => s.distance > 23.75 && s.x >= -80 && s.x < 80 },
  { id: "three-rw", name: "3PT Right Wing", test: (s: Shot) => s.distance > 23.75 && s.x >= 80 && !(s.x > 180 && s.y < 90) },
  { id: "three-r", name: "3PT Right Corner", test: (s: Shot) => s.distance > 23.75 && s.x > 180 && s.y < 90 },
];

// Approximate NBA league average FG% by zone
const LEAGUE_AVG: Record<string, number> = {
  ra: 0.63, "paint-l": 0.42, "paint-r": 0.42,
  "mid-l": 0.40, "mid-cl": 0.41, "mid-cr": 0.41, "mid-r": 0.40,
  "mid-long-l": 0.39, "mid-long-c": 0.40, "mid-long-r": 0.39,
  "three-l": 0.38, "three-lw": 0.36, "three-c": 0.37, "three-rw": 0.36, "three-r": 0.38,
};

type HotZoneData = {
  id: string;
  name: string;
  fg: number;
  attempts: number;
  makes: number;
  diff: number; // vs league average
  shots: Shot[];
};

function computeHotZones(shots: Shot[]): HotZoneData[] {
  return HOT_ZONES.map((z) => {
    const subset = shots.filter(z.test);
    const makes = subset.filter((s) => s.made).length;
    const fg = subset.length > 0 ? makes / subset.length : 0;
    const diff = fg - (LEAGUE_AVG[z.id] ?? 0.42);
    return { id: z.id, name: z.name, fg, attempts: subset.length, makes, diff, shots: subset };
  });
}

/* ── momentum / streak tracking ────────────────────────────────── */

type MomentumPoint = {
  idx: number;
  shot: Shot;
  runningFg: number;
  streak: number; // positive = makes, negative = misses
  windowFg: number; // rolling 10-shot FG%
};

function computeMomentum(shots: Shot[]): MomentumPoint[] {
  let streak = 0;
  let totalMade = 0;
  const result: MomentumPoint[] = [];

  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (s.made) {
      streak = streak > 0 ? streak + 1 : 1;
      totalMade++;
    } else {
      streak = streak < 0 ? streak - 1 : -1;
    }

    // rolling 10-shot window
    const windowStart = Math.max(0, i - 9);
    const window = shots.slice(windowStart, i + 1);
    const windowMade = window.filter((ws) => ws.made).length;

    result.push({
      idx: i,
      shot: s,
      runningFg: totalMade / (i + 1),
      streak,
      windowFg: windowMade / window.length,
    });
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════
   NBA court half-court SVG
   ═══════════════════════════════════════════════════════════════════ */

function CourtSvg({ children }: { children?: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 -10 ${COURT_W} ${COURT_H + 20}`}
      className="w-full"
      style={{ maxHeight: 520 }}
    >
      <defs>
        <radialGradient id="courtGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* court floor */}
      <rect x={0} y={-10} width={COURT_W} height={COURT_H + 20} fill="url(#courtGrad)" rx={12} />

      {/* paint / key */}
      <rect
        x={170} y={-7} width={160} height={190}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}
      />

      {/* free-throw circle */}
      <circle
        cx={CX} cy={183} r={60}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* basket */}
      <circle cx={CX} cy={0} r={7.5} fill="none" stroke="rgba(255,200,100,0.5)" strokeWidth={2} />
      <line x1={220} y1={-7} x2={280} y2={-7} stroke="rgba(255,200,100,0.3)" strokeWidth={2} />

      {/* restricted area */}
      <path
        d={`M ${CX - 40} -7 A 40 40 0 0 0 ${CX + 40} -7`}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1}
        transform="scale(1,-1) translate(0,7)"
      />
      <path
        d={`M ${CX - 40} -7 A 40 40 0 0 0 ${CX + 40} -7`}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1}
      />

      {/* three-point line */}
      <path
        d={`M 30 -7 L 30 90 A 238 238 0 0 0 470 90 L 470 -7`}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5}
      />

      {/* half-court line */}
      <line
        x1={0} y1={COURT_H - 10} x2={COURT_W} y2={COURT_H - 10}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1}
      />

      {/* center circle */}
      <circle
        cx={CX} cy={COURT_H - 10} r={60}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1}
      />

      {children}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════════ */

export default function NbaVizPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [season, setSeason] = useState("2023-24");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("shots");
  const [compareIdx, setCompareIdx] = useState(1); // for h2h
  const [shotFilter, setShotFilter] = useState<"all" | "made" | "missed">("all");
  const [animKey, setAnimKey] = useState(0);
  const [hovered, setHovered] = useState<Shot | null>(null);

  /* fetch data */
  useEffect(() => {
    fetch("/api/nba-data")
      .then((r) => r.json())
      .then((data: Player[]) => {
        setPlayers(data);
        setLoading(false);
      });
  }, []);

  const player = players[selectedIdx];
  const allSeasons = player ? Object.keys(player.shots).sort().reverse() : [];
  const shots = useMemo(
    () => (player?.shots[season] ?? []),
    [player, season],
  );
  const filteredShots = useMemo(() => {
    if (shotFilter === "made") return shots.filter((s) => s.made);
    if (shotFilter === "missed") return shots.filter((s) => !s.made);
    return shots;
  }, [shots, shotFilter]);

  const zones = useMemo(() => aggregateZones(shots), [shots]);
  const quarters = useMemo(() => aggregateQuarters(shots), [shots]);
  const distBuckets = useMemo(() => aggregateDistance(shots), [shots]);
  const hexBins = useMemo(() => hexBinShots(shots), [shots]);
  const hotZones = useMemo(() => computeHotZones(shots), [shots]);
  const momentum = useMemo(() => computeMomentum(shots), [shots]);

  // Head-to-head comparison data
  const comparePlayer = players[compareIdx];
  const compareShots = useMemo(
    () => (comparePlayer?.shots[season] ?? []),
    [comparePlayer, season],
  );
  const compareHexBins = useMemo(() => hexBinShots(compareShots), [compareShots]);

  const triggerAnim = useCallback(() => setAnimKey((k) => k + 1), []);

  const switchPlayer = (idx: number) => {
    setSelectedIdx(idx);
    triggerAnim();
  };

  const switchSeason = (s: string) => {
    setSeason(s);
    triggerAnim();
  };

  /* stat helpers */
  const totalMade = shots.filter((s) => s.made).length;
  const totalFGA = shots.length;
  const fgPctStr = totalFGA > 0 ? pct(totalMade / totalFGA) : "—";
  const threes = shots.filter((s) => s.type === "3PT Field Goal");
  const threesMade = threes.filter((s) => s.made).length;
  const threePctStr = threes.length > 0 ? pct(threesMade / threes.length) : "—";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-white/40 animate-pulse">Loading NBA data...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      {/* ── header ─────────────────────────────────────────── */}
      <span className={pill}>NBA Viz</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Shot Chart Explorer
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
        Interactive shot visualizations for 6 NBA stars, powered by{" "}
        <a
          href="https://github.com/swar/nba_api"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/20 hover:text-white/70"
        >
          nba_api
        </a>
        . Toggle between shot chart, zone breakdown, and career arc.
      </p>

      {/* ── player selector ────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap gap-2">
        {players.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => switchPlayer(i)}
            className={`rounded-xl px-4 py-2.5 text-[12px] font-medium transition ${
              i === selectedIdx
                ? "bg-white/10 text-white ring-1 ring-white/20"
                : "bg-white/[0.03] text-white/40 hover:text-white/60"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── controls row ───────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          Season
          <select
            className={selectStyle}
            value={season}
            onChange={(e) => switchSeason(e.target.value)}
          >
            {allSeasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="h-4 w-px bg-white/10" />
        {([
          ["shots", "Shot chart"],
          ["heatmap", "Heatmap"],
          ["hotzones", "Hot zones"],
          ["zones", "Zones"],
          ["h2h", "Head-to-head"],
          ["momentum", "Momentum"],
          ["career", "Career arc"],
        ] as [ViewMode, string][]).map(([v, lbl]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
              view === v
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {lbl}
          </button>
        ))}
        {view === "shots" && (
          <>
            <div className="h-4 w-px bg-white/10" />
            {(["all", "made", "missed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setShotFilter(f)}
                className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                  shotFilter === f
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── KPI strip ──────────────────────────────────────── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { t: "FGA", v: totalFGA.toLocaleString() },
          { t: "FG%", v: fgPctStr },
          { t: "3PA", v: threes.length.toLocaleString() },
          { t: "3P%", v: threePctStr },
          { t: "Avg dist", v: totalFGA > 0 ? `${(shots.reduce((a, s) => a + s.distance, 0) / totalFGA).toFixed(1)} ft` : "—" },
        ].map((k) => (
          <div key={k.t} className={`${glass} px-5 py-3`}>
            <div className={label}>{k.t}</div>
            <div className="mt-1 text-lg font-semibold text-white">{k.v}</div>
          </div>
        ))}
      </div>

      {/* ── main content ───────────────────────────────────── */}
      {view === "shots" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
          {/* shot chart */}
          <div className={`${glass} p-4`}>
            <div className="relative">
              <CourtSvg key={animKey}>
                {filteredShots.map((s, i) => {
                  const [sx, sy] = courtToSvg(s.x, s.y);
                  return (
                    <circle
                      key={i}
                      cx={sx}
                      cy={sy}
                      r={3}
                      fill={shotColor(s.made, 0.65)}
                      stroke={shotColor(s.made, 0.3)}
                      strokeWidth={0.5}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        opacity: 0,
                        animation: `shotFadeIn 0.4s ease-out ${i * 0.0004}s forwards`,
                      }}
                    />
                  );
                })}
              </CourtSvg>

              {/* tooltip */}
              {hovered && (
                <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-[11px] text-white/80 backdrop-blur">
                  <span className="font-medium">{hovered.action}</span> · {hovered.distance}ft · {hovered.zone} · {hovered.made ? "Made" : "Missed"}
                </div>
              )}
            </div>

            {/* legend */}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-white/50">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: shotColor(1) }} />
                Made
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: shotColor(0) }} />
                Missed
              </span>
              <span className="ml-auto text-white/30">
                {filteredShots.length.toLocaleString()} shots
              </span>
            </div>
          </div>

          {/* sidebar stats */}
          <div className="space-y-5">
            {/* quarter breakdown */}
            <div className={`${glass} p-5`}>
              <div className={label}>FG% by quarter</div>
              <div className="mt-3 space-y-2">
                {quarters.map((q) => (
                  <div key={q.quarter}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/60">{q.quarter}</span>
                      <span className="font-mono text-white/70">{pct(q.pct)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${q.pct * 100}%`,
                          background: `linear-gradient(90deg, rgba(52,211,153,0.5), rgba(52,211,153,0.8))`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* distance histogram */}
            <div className={`${glass} p-5`}>
              <div className={label}>Shots by distance</div>
              <div className="mt-3 space-y-2">
                {distBuckets.map((d) => {
                  const maxA = Math.max(...distBuckets.map((b) => b.attempts));
                  const barW = maxA > 0 ? (d.attempts / maxA) * 100 : 0;
                  return (
                    <div key={d.range}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/60">{d.range}</span>
                        <span className="font-mono text-white/50">
                          {d.attempts} <span className="text-white/30">·</span>{" "}
                          <span className="text-white/70">{pct(d.pct)}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${barW}%`,
                            background: `linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.7))`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* shot type split */}
            <div className={`${glass} p-5`}>
              <div className={label}>2PT vs 3PT</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {["2PT Field Goal", "3PT Field Goal"].map((type) => {
                  const sub = shots.filter((s) => s.type === type);
                  const made = sub.filter((s) => s.made).length;
                  return (
                    <div key={type} className={`${glassInner} p-3 text-center`}>
                      <div className="text-lg font-semibold text-white">
                        {sub.length > 0 ? pct(made / sub.length) : "—"}
                      </div>
                      <div className="mt-1 text-[10px] text-white/40">
                        {type.replace(" Field Goal", "")} ({sub.length})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Zones view ─────────────────────────────────────── */}
      {view === "zones" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* zone table */}
          <div className={`${glass} p-6`}>
            <div className={label}>Zone breakdown</div>
            <div className="mt-4 space-y-2">
              {zones.map((z) => {
                const maxA = Math.max(...zones.map((zz) => zz.attempts));
                const barW = maxA > 0 ? (z.attempts / maxA) * 100 : 0;
                const hue = z.pct > 0.5 ? 160 : z.pct > 0.4 ? 45 : 0;
                return (
                  <div key={z.zone}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-white/70">{z.zone}</span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-white/40">{z.attempts} FGA</span>
                        <span
                          className="font-semibold"
                          style={{ color: `hsl(${hue}, 70%, 65%)` }}
                        >
                          {pct(z.pct)}
                        </span>
                        <span className="text-white/50">{z.pps.toFixed(2)} PPS</span>
                      </div>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${barW}%`,
                          background: `linear-gradient(90deg, hsla(${hue},70%,50%,0.3), hsla(${hue},70%,50%,0.6))`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* shot density on court */}
          <div className={`${glass} p-4`}>
            <div className={`${label} mb-3 px-2`}>Shot density</div>
            <CourtSvg>
              {(() => {
                // bin shots into a grid for density
                const binSize = 25;
                const bins = new Map<string, { x: number; y: number; count: number; made: number }>();
                for (const s of shots) {
                  const bx = Math.round(s.x / binSize) * binSize;
                  const by = Math.round(s.y / binSize) * binSize;
                  const key = `${bx},${by}`;
                  const prev = bins.get(key) ?? { x: bx, y: by, count: 0, made: 0 };
                  prev.count++;
                  if (s.made) prev.made++;
                  bins.set(key, prev);
                }
                const maxCount = Math.max(...Array.from(bins.values()).map((b) => b.count));
                return Array.from(bins.values()).map((b) => {
                  const [sx, sy] = courtToSvg(b.x, b.y);
                  const t = maxCount > 0 ? b.count / maxCount : 0;
                  const fgP = b.count > 0 ? b.made / b.count : 0;
                  // teal (high efficiency) → amber (low efficiency)
                  const hue = 160 - 120 * (1 - fgP);
                  return (
                    <circle
                      key={`${b.x}-${b.y}`}
                      cx={sx}
                      cy={sy}
                      r={3 + t * 10}
                      fill={`hsla(${hue}, 70%, 50%, ${0.1 + t * 0.35})`}
                      stroke={`hsla(${hue}, 70%, 60%, ${0.05 + t * 0.15})`}
                      strokeWidth={0.5}
                    />
                  );
                });
              })()}
            </CourtSvg>
            <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/60" />
                High FG%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500/60" />
                Low FG%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border border-white/10" />
                More shots
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Hexbin Heatmap (inspired by Roboflow detection heatmaps) ── */}
      {view === "heatmap" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className={`${glass} p-4`}>
            <CourtSvg>
              {hexBins.map((h, i) => {
                const maxCount = Math.max(...hexBins.map((b) => b.count));
                const t = maxCount > 0 ? h.count / maxCount : 0;
                if (h.count < 2) return null;
                // Color by efficiency: red (cold) → yellow → green (hot)
                const hue = h.pct * 120; // 0=red, 60=yellow, 120=green
                const sat = 75;
                const light = 45 + t * 10;
                const opacity = 0.15 + t * 0.55;
                const size = 10 + t * 8;
                return (
                  <path
                    key={i}
                    d={hexPath(h.cx, h.cy, size)}
                    fill={`hsla(${hue}, ${sat}%, ${light}%, ${opacity})`}
                    stroke={`hsla(${hue}, ${sat}%, ${light + 15}%, ${opacity * 0.5})`}
                    strokeWidth={0.5}
                    style={{ animation: `shotFadeIn 0.5s ease-out ${i * 0.005}s forwards`, opacity: 0 }}
                  />
                );
              })}
            </CourtSvg>
            <div className="mt-3 flex items-center justify-center gap-6 text-[10px] text-white/40">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0, 30, 60, 90, 120].map((hue) => (
                    <div key={hue} className="h-3 w-5 rounded-sm" style={{ background: `hsl(${hue}, 75%, 50%)` }} />
                  ))}
                </div>
                <span>Cold → Hot (FG%)</span>
              </div>
              <span className="text-white/25">|</span>
              <span>Size = volume</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${glass} p-5`}>
              <div className={label}>Heatmap stats</div>
              <div className="mt-3 space-y-3 text-[12px]">
                <div className="flex justify-between text-white/60">
                  <span>Total zones</span>
                  <span className="font-mono text-white/80">{hexBins.filter((h) => h.count >= 2).length}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Hottest zone</span>
                  <span className="font-mono text-emerald-400">
                    {hexBins.length > 0 ? pct(Math.max(...hexBins.filter((h) => h.count >= 5).map((h) => h.pct))) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Coldest zone</span>
                  <span className="font-mono text-red-400">
                    {hexBins.length > 0 ? pct(Math.min(...hexBins.filter((h) => h.count >= 5).map((h) => h.pct))) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>High-volume spots</span>
                  <span className="font-mono text-white/80">
                    {hexBins.filter((h) => h.count >= 10).length}
                  </span>
                </div>
              </div>
            </div>
            <div className={`${glass} p-5`}>
              <div className={label}>Interpretation</div>
              <p className="mt-3 text-[11px] leading-relaxed text-white/50">
                Inspired by{" "}
                <a href="https://github.com/roboflow/notebooks" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 hover:text-white/70">
                  Roboflow detection heatmaps
                </a>
                , hexagonal bins aggregate shots spatially. Color encodes shooting efficiency (FG%),
                while size encodes volume. Large, green hexagons are a player&apos;s sweet spots.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hot Zones (inspired by Roboflow polygon zone detection) ── */}
      {view === "hotzones" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className={`${glass} p-4`}>
            <CourtSvg>
              {hotZones.map((z) => {
                if (z.attempts < 1) return null;
                // Compute centroid of shots in this zone
                const avgX = z.shots.reduce((s, sh) => s + sh.x, 0) / z.shots.length + CX;
                const avgY = z.shots.reduce((s, sh) => s + sh.y, 0) / z.shots.length + 47.5;
                const isHot = z.diff > 0;
                const intensity = Math.min(Math.abs(z.diff) / 0.1, 1); // normalize to ±10pp
                const color = isHot
                  ? `rgba(239, 68, 68, ${0.15 + intensity * 0.45})`  // red = above avg
                  : `rgba(59, 130, 246, ${0.15 + intensity * 0.45})`; // blue = below avg
                const r = 20 + Math.min(z.attempts / 30, 1) * 30;
                return (
                  <g key={z.id}>
                    <circle cx={avgX} cy={avgY} r={r} fill={color} />
                    <text
                      x={avgX} y={avgY - 5}
                      textAnchor="middle"
                      className="fill-white font-mono"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {(z.fg * 100).toFixed(0)}%
                    </text>
                    <text
                      x={avgX} y={avgY + 9}
                      textAnchor="middle"
                      className="fill-white/50"
                      fontSize={8}
                    >
                      {z.attempts} FGA
                    </text>
                  </g>
                );
              })}
            </CourtSvg>
            <div className="mt-3 flex items-center justify-center gap-5 text-[10px] text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-red-500/50" />
                Above league avg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-blue-500/50" />
                Below league avg
              </span>
            </div>
          </div>

          {/* zone breakdown table */}
          <div className={`${glass} p-5`}>
            <div className={label}>Zone efficiency vs league average</div>
            <div className="mt-4 max-h-[460px] overflow-y-auto scrollbar-thin space-y-2">
              {hotZones
                .filter((z) => z.attempts > 0)
                .sort((a, b) => b.diff - a.diff)
                .map((z) => {
                  const isHot = z.diff > 0;
                  return (
                    <div key={z.id} className={`${glassInner} px-3 py-2.5`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/70 font-medium">{z.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white/50">{z.attempts} FGA</span>
                          <span className={`font-mono font-semibold ${isHot ? "text-red-400" : "text-blue-400"}`}>
                            {isHot ? "+" : ""}{(z.diff * 100).toFixed(1)}pp
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px]">
                        <div className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${z.fg * 100}%`,
                                background: isHot
                                  ? "linear-gradient(90deg, rgba(239,68,68,0.4), rgba(239,68,68,0.7))"
                                  : "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.6))",
                              }}
                            />
                          </div>
                        </div>
                        <span className="font-mono text-white/60">{pct(z.fg)}</span>
                        <span className="text-white/30">vs {pct(LEAGUE_AVG[z.id] ?? 0.42)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-white/30">
              Inspired by{" "}
              <a href="https://github.com/roboflow/notebooks/blob/main/notebooks/how-to-detect-and-count-objects-in-polygon-zone.ipynb" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 hover:text-white/50">
                Roboflow polygon zone detection
              </a>
              . Court divided into NBA-standard zones. Red = above league average, blue = below.
            </p>
          </div>
        </div>
      )}

      {/* ── Head-to-Head (inspired by Roboflow player tracking) ─── */}
      {view === "h2h" && player && (
        <div className="mt-6 space-y-5">
          {/* opponent selector */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/50">Compare with:</span>
            {players.map((p, i) => {
              if (i === selectedIdx) return null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCompareIdx(i)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                    i === compareIdx
                      ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                      : "bg-white/[0.03] text-white/40 hover:text-white/60"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* player 1 */}
            <div className={`${glass} p-4`}>
              <div className="mb-2 text-center text-[12px] font-medium text-white/70">{player.name}</div>
              <CourtSvg>
                {hexBins.map((h, i) => {
                  const maxCount = Math.max(...hexBins.map((b) => b.count));
                  const t = maxCount > 0 ? h.count / maxCount : 0;
                  if (h.count < 2) return null;
                  const hue = h.pct * 120;
                  return (
                    <path
                      key={i}
                      d={hexPath(h.cx, h.cy, 8 + t * 8)}
                      fill={`hsla(${hue}, 75%, 50%, ${0.15 + t * 0.5})`}
                      stroke={`hsla(${hue}, 75%, 65%, ${0.1})`}
                      strokeWidth={0.5}
                    />
                  );
                })}
              </CourtSvg>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div><div className="text-white/40">FGA</div><div className="font-mono text-white/80">{shots.length}</div></div>
                <div><div className="text-white/40">FG%</div><div className="font-mono text-white/80">{fgPctStr}</div></div>
                <div><div className="text-white/40">3P%</div><div className="font-mono text-white/80">{threePctStr}</div></div>
              </div>
            </div>

            {/* player 2 */}
            <div className={`${glass} p-4`}>
              <div className="mb-2 text-center text-[12px] font-medium text-indigo-300/80">{comparePlayer?.name ?? "—"}</div>
              <CourtSvg>
                {compareHexBins.map((h, i) => {
                  const maxCount = Math.max(...compareHexBins.map((b) => b.count));
                  const t = maxCount > 0 ? h.count / maxCount : 0;
                  if (h.count < 2) return null;
                  const hue = h.pct * 120;
                  return (
                    <path
                      key={i}
                      d={hexPath(h.cx, h.cy, 8 + t * 8)}
                      fill={`hsla(${hue}, 75%, 50%, ${0.15 + t * 0.5})`}
                      stroke={`hsla(${hue}, 75%, 65%, ${0.1})`}
                      strokeWidth={0.5}
                    />
                  );
                })}
              </CourtSvg>
              {(() => {
                const cMade = compareShots.filter((s) => s.made).length;
                const cFga = compareShots.length;
                const cThrees = compareShots.filter((s) => s.type === "3PT Field Goal");
                const c3Made = cThrees.filter((s) => s.made).length;
                return (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div><div className="text-white/40">FGA</div><div className="font-mono text-indigo-300/80">{cFga}</div></div>
                    <div><div className="text-white/40">FG%</div><div className="font-mono text-indigo-300/80">{cFga > 0 ? pct(cMade / cFga) : "—"}</div></div>
                    <div><div className="text-white/40">3P%</div><div className="font-mono text-indigo-300/80">{cThrees.length > 0 ? pct(c3Made / cThrees.length) : "—"}</div></div>
                  </div>
                );
              })()}
            </div>
          </div>

          <p className="text-[10px] text-white/25 text-center">
            Side-by-side hexbin heatmaps. Inspired by{" "}
            <a href="https://github.com/roboflow/notebooks/blob/main/notebooks/basketball-ai-how-to-detect-track-and-identify-basketball-players.ipynb" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 hover:text-white/50">
              Roboflow player tracking
            </a>
            — comparing spatial shooting patterns between players.
          </p>
        </div>
      )}

      {/* ── Momentum / Streak Tracker (inspired by object tracking) ── */}
      {view === "momentum" && (
        <div className="mt-6 space-y-6">
          {/* momentum chart */}
          <div className={`${glass} p-6`}>
            <div className={label}>Shot-by-shot momentum — rolling 10-shot FG%</div>
            {(() => {
              if (momentum.length === 0) return <p className="mt-3 text-xs text-white/40">No shots this season.</p>;
              const chartW = 900;
              const chartH = 200;
              const pad = { l: 45, r: 20, t: 20, b: 30 };
              const innerW = chartW - pad.l - pad.r;
              const innerH = chartH - pad.t - pad.b;

              const toX = (i: number) => pad.l + (i / (momentum.length - 1 || 1)) * innerW;
              const toY = (v: number) => pad.t + innerH - v * innerH;

              // Rolling FG% line
              const fgPath = momentum.map((m, i) => `${toX(i)},${toY(m.windowFg)}`).join(" ");

              // Streak bars
              const maxStreak = Math.max(...momentum.map((m) => Math.abs(m.streak)));

              return (
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="mt-4 w-full">
                  {/* y gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
                    <g key={v}>
                      <line x1={pad.l} y1={toY(v)} x2={chartW - pad.r} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                      <text x={pad.l - 6} y={toY(v) + 3} textAnchor="end" className="fill-white/30" fontSize={9}>{(v * 100).toFixed(0)}%</text>
                    </g>
                  ))}

                  {/* 50% reference line */}
                  <line x1={pad.l} y1={toY(0.5)} x2={chartW - pad.r} y2={toY(0.5)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 4" />

                  {/* streak indicator bars (bottom) */}
                  {momentum.map((m, i) => {
                    const barH = maxStreak > 0 ? (Math.abs(m.streak) / maxStreak) * 15 : 0;
                    const color = m.streak > 0 ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)";
                    return (
                      <rect
                        key={`s-${i}`}
                        x={toX(i) - 1}
                        y={chartH - pad.b + 2}
                        width={2}
                        height={barH}
                        fill={color}
                        rx={1}
                      />
                    );
                  })}

                  {/* shot dots colored by make/miss */}
                  {momentum.map((m, i) => (
                    <circle
                      key={`d-${i}`}
                      cx={toX(i)}
                      cy={toY(m.windowFg)}
                      r={1.5}
                      fill={m.shot.made ? "rgba(52,211,153,0.6)" : "rgba(248,113,113,0.5)"}
                    />
                  ))}

                  {/* rolling FG% line */}
                  <polyline
                    points={fgPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />

                  {/* season avg line */}
                  {totalFGA > 0 && (
                    <line
                      x1={pad.l}
                      y1={toY(totalMade / totalFGA)}
                      x2={chartW - pad.r}
                      y2={toY(totalMade / totalFGA)}
                      stroke="rgba(99,102,241,0.5)"
                      strokeWidth={1}
                      strokeDasharray="6 3"
                    />
                  )}

                  {/* labels */}
                  <text x={pad.l + 4} y={pad.t + 10} className="fill-white/30" fontSize={8}>
                    Shot #{1}
                  </text>
                  <text x={chartW - pad.r - 4} y={pad.t + 10} textAnchor="end" className="fill-white/30" fontSize={8}>
                    Shot #{momentum.length}
                  </text>
                </svg>
              );
            })()}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-5 text-[10px] text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-white/60" /> Rolling 10-shot FG%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-indigo-500/60" style={{ borderTop: "1px dashed" }} /> Season avg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400/60" /> Made
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400/60" /> Missed
              </span>
            </div>
          </div>

          {/* streak highlights */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(() => {
              let bestStreak = 0;
              let worstStreak = 0;
              let bestWindow = 0;
              let worstWindow = 1;
              for (const m of momentum) {
                if (m.streak > bestStreak) bestStreak = m.streak;
                if (m.streak < worstStreak) worstStreak = m.streak;
                if (m.windowFg > bestWindow) bestWindow = m.windowFg;
                if (m.windowFg < worstWindow) worstWindow = m.windowFg;
              }
              return [
                { t: "Best make streak", v: `${bestStreak} in a row`, color: "text-emerald-400" },
                { t: "Worst miss streak", v: `${Math.abs(worstStreak)} in a row`, color: "text-red-400" },
                { t: "Peak 10-shot FG%", v: pct(bestWindow), color: "text-emerald-400" },
                { t: "Trough 10-shot FG%", v: pct(worstWindow), color: "text-red-400" },
              ].map((k) => (
                <div key={k.t} className={`${glass} px-5 py-3`}>
                  <div className={label}>{k.t}</div>
                  <div className={`mt-1 text-lg font-semibold ${k.color}`}>{k.v}</div>
                </div>
              ));
            })()}
          </div>

          {/* court with shot timeline */}
          <div className={`${glass} p-4`}>
            <div className={`${label} mb-3 px-2`}>Shot sequence on court (chronological fade)</div>
            <CourtSvg>
              {shots.map((s, i) => {
                const [sx, sy] = courtToSvg(s.x, s.y);
                const t = shots.length > 1 ? i / (shots.length - 1) : 1;
                return (
                  <circle
                    key={i}
                    cx={sx}
                    cy={sy}
                    r={2 + t * 2}
                    fill={shotColor(s.made, 0.1 + t * 0.6)}
                    stroke={shotColor(s.made, 0.05 + t * 0.3)}
                    strokeWidth={0.5}
                  />
                );
              })}
            </CourtSvg>
            <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-white/30">
              <span>Faint = early in season</span>
              <span>|</span>
              <span>Bright = recent shots</span>
            </div>
          </div>

          <p className="text-[10px] text-white/25 text-center">
            Inspired by{" "}
            <a href="https://github.com/roboflow/notebooks/blob/main/notebooks/basketball-ai-make-or-miss-jumpshot-detection.ipynb" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 hover:text-white/50">
              Roboflow make/miss jumpshot detection
            </a>{" "}
            and object tracking notebooks — visualizing shooting momentum and streakiness over time.
          </p>
        </div>
      )}

      {/* ── Career arc view ────────────────────────────────── */}
      {view === "career" && player && (
        <div className="mt-6 space-y-6">
          {/* career line chart (SVG sparklines) */}
          <div className={`${glass} p-6`}>
            <div className={label}>Career trajectory — PPG, RPG, APG</div>
            {(() => {
              const career = player.career;
              if (!career.length) return <p className="mt-3 text-xs text-white/40">No career data.</p>;

              const chartW = 900;
              const chartH = 180;
              const pad = { l: 40, r: 20, t: 20, b: 30 };
              const innerW = chartW - pad.l - pad.r;
              const innerH = chartH - pad.t - pad.b;

              const maxPts = Math.max(...career.map((s) => s.pts / s.gp));
              const yMax = Math.ceil(maxPts / 5) * 5 + 5;

              const metrics = [
                { key: "pts" as const, label: "PPG", color: "rgba(99,102,241,0.9)" },
                { key: "reb" as const, label: "RPG", color: "rgba(52,211,153,0.9)" },
                { key: "ast" as const, label: "APG", color: "rgba(251,191,36,0.9)" },
              ];

              const toX = (i: number) => pad.l + (i / (career.length - 1 || 1)) * innerW;
              const toY = (v: number) => pad.t + innerH - (v / yMax) * innerH;

              return (
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="mt-4 w-full">
                  {/* y gridlines */}
                  {Array.from({ length: 6 }, (_, i) => {
                    const val = (yMax / 5) * i;
                    return (
                      <g key={`g-${i}`}>
                        <line
                          x1={pad.l} y1={toY(val)} x2={chartW - pad.r} y2={toY(val)}
                          stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}
                        />
                        <text x={pad.l - 6} y={toY(val) + 3} textAnchor="end" className="fill-white/30" fontSize={9}>
                          {val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* x labels */}
                  {career.map((s, i) => {
                    if (career.length > 15 && i % 2 !== 0) return null;
                    return (
                      <text
                        key={`xl-${s.season}`}
                        x={toX(i)} y={chartH - 4}
                        textAnchor="middle" className="fill-white/25" fontSize={8}
                      >
                        {s.season.slice(2, 5)}
                      </text>
                    );
                  })}

                  {/* lines */}
                  {metrics.map((m) => {
                    const pts = career.map((s, i) => `${toX(i)},${toY(s[m.key] / s.gp)}`).join(" ");
                    return (
                      <g key={m.key}>
                        <polyline
                          points={pts}
                          fill="none"
                          stroke={m.color}
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {career.map((s, i) => (
                          <circle
                            key={`d-${m.key}-${i}`}
                            cx={toX(i)} cy={toY(s[m.key] / s.gp)}
                            r={2.5} fill={m.color}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}

            {/* legend */}
            <div className="flex items-center gap-5 text-[11px] text-white/50">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-5 rounded-full bg-indigo-500" /> PPG
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-5 rounded-full bg-emerald-500" /> RPG
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-5 rounded-full bg-amber-400" /> APG
              </span>
            </div>
          </div>

          {/* career table */}
          <div className={`${glass} p-6`}>
            <div className={label}>Season-by-season</div>
            <div className="mt-4 overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-white/40">
                    {["Season", "Team", "GP", "PPG", "RPG", "APG", "FG%", "3P%", "FT%"].map((h) => (
                      <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  {player.career.map((s) => (
                    <tr key={s.season} className="border-t border-white/[0.04]">
                      <td className="py-1.5 pr-4 font-medium text-white/70">{s.season}</td>
                      <td className="py-1.5 pr-4">{s.team}</td>
                      <td className="py-1.5 pr-4 font-mono">{s.gp}</td>
                      <td className="py-1.5 pr-4 font-mono">{(s.pts / s.gp).toFixed(1)}</td>
                      <td className="py-1.5 pr-4 font-mono">{(s.reb / s.gp).toFixed(1)}</td>
                      <td className="py-1.5 pr-4 font-mono">{(s.ast / s.gp).toFixed(1)}</td>
                      <td className="py-1.5 pr-4 font-mono">{(s.fgPct * 100).toFixed(1)}%</td>
                      <td className="py-1.5 pr-4 font-mono">{(s.fg3Pct * 100).toFixed(1)}%</td>
                      <td className="py-1.5 font-mono">{(s.ftPct * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS keyframe animation (inline) ────────────────── */}
      <style>{`
        @keyframes shotFadeIn {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}
