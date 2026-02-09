"use client";

import { useCallback, useMemo, useState, useRef } from "react";

/* ── types ──────────────────────────────────────────────────────── */

type PlayerPosition = {
  id: number;
  team: "offense" | "defense";
  x: number;
  y: number;
  role?: string;
};

type CourtVisionResult = {
  players: PlayerPosition[];
  formation: string;
  offensiveAction: string;
  defensiveScheme: string;
  keyInsight: string;
  confidence: number;
};

/* ── style tokens ──────────────────────────────────────────────── */

const glass =
  "rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] shadow-[0_1px_2px_rgba(0,0,0,0.4)]";
const glassInner = "rounded-xl border border-white/[0.06] bg-white/[0.03]";
const label =
  "text-[10px] uppercase tracking-[0.18em] font-medium text-white/40";
const pill =
  "rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/60";

/* ── court constants ──────────────────────────────────────────── */

const CW = 500;
const CH = 470;
const BASKET = { x: 250, y: 0 };

/* ── geometry helpers ─────────────────────────────────────────── */

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Compute Voronoi-like cells using Fortune's algorithm approximation.
 *  For simplicity we use a pixel-sampling approach for the portfolio demo. */
function computeVoronoiCells(
  players: PlayerPosition[],
  width: number,
  height: number,
  step: number = 8,
): Map<number, { x: number; y: number }[]> {
  const cells = new Map<number, { x: number; y: number }[]>();
  players.forEach((p) => cells.set(p.id, []));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let closest = players[0];
      let minD = Infinity;
      for (const p of players) {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < minD) {
          minD = d;
          closest = p;
        }
      }
      cells.get(closest.id)!.push({ x, y });
    }
  }
  return cells;
}

/** Find driving lanes: straight-line paths from each offensive player to the basket
 *  that don't pass near a defender */
function computeDrivingLanes(players: PlayerPosition[]): {
  from: PlayerPosition;
  clear: boolean;
  closestDefDist: number;
}[] {
  const offense = players.filter((p) => p.team === "offense");
  const defense = players.filter((p) => p.team === "defense");

  return offense.map((off) => {
    // Check if any defender is within 30 units of the line from player to basket
    const dx = BASKET.x - off.x;
    const dy = BASKET.y - off.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return { from: off, clear: true, closestDefDist: 999 };

    let closestDefDist = Infinity;
    for (const def of defense) {
      // Point-to-line distance
      const t = Math.max(0, Math.min(1, ((def.x - off.x) * dx + (def.y - off.y) * dy) / (len * len)));
      const projX = off.x + t * dx;
      const projY = off.y + t * dy;
      const d = dist(def, { x: projX, y: projY });
      // Only count defenders that are between the player and the basket
      if (t > 0.05 && t < 0.95 && d < closestDefDist) {
        closestDefDist = d;
      }
    }

    return {
      from: off,
      clear: closestDefDist > 35,
      closestDefDist,
    };
  });
}

/** Spacing score: average distance between offensive players, normalized 0-100 */
function computeSpacingScore(players: PlayerPosition[]): {
  score: number;
  avgDist: number;
  convexArea: number;
  grade: string;
} {
  const offense = players.filter((p) => p.team === "offense");
  if (offense.length < 2) return { score: 0, avgDist: 0, convexArea: 0, grade: "N/A" };

  // Average pairwise distance
  let totalDist = 0;
  let pairs = 0;
  for (let i = 0; i < offense.length; i++) {
    for (let j = i + 1; j < offense.length; j++) {
      totalDist += dist(offense[i], offense[j]);
      pairs++;
    }
  }
  const avgDist = pairs > 0 ? totalDist / pairs : 0;

  // Convex hull area (shoelace formula on sorted points)
  const sorted = [...offense].sort((a, b) => {
    const cx = offense.reduce((s, p) => s + p.x, 0) / offense.length;
    const cy = offense.reduce((s, p) => s + p.y, 0) / offense.length;
    return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
  });
  let area = 0;
  for (let i = 0; i < sorted.length; i++) {
    const j = (i + 1) % sorted.length;
    area += sorted[i].x * sorted[j].y - sorted[j].x * sorted[i].y;
  }
  const convexArea = Math.abs(area) / 2;

  // Score: blend of avg distance and area, normalized to 0-100
  // Perfect spacing: players ~120+ units apart avg, covering ~40k+ sq units
  const distScore = Math.min(avgDist / 150, 1) * 50;
  const areaScore = Math.min(convexArea / 50000, 1) * 50;
  const score = Math.round(distScore + areaScore);
  const grade =
    score >= 80 ? "Elite" : score >= 65 ? "Good" : score >= 45 ? "Average" : score >= 25 ? "Cramped" : "Collapsed";

  return { score, avgDist, convexArea, grade };
}

/** Nearest defender for each offensive player */
function computeMatchups(players: PlayerPosition[]): {
  offPlayer: PlayerPosition;
  nearestDef: PlayerPosition | null;
  distance: number;
}[] {
  const offense = players.filter((p) => p.team === "offense");
  const defense = players.filter((p) => p.team === "defense");

  return offense.map((off) => {
    let nearest: PlayerPosition | null = null;
    let minD = Infinity;
    for (const def of defense) {
      const d = dist(off, def);
      if (d < minD) {
        minD = d;
        nearest = def;
      }
    }
    return { offPlayer: off, nearestDef: nearest, distance: minD };
  });
}

/* ── court SVG component ──────────────────────────────────────── */

function CourtSvg({ children }: { children?: React.ReactNode }) {
  return (
    <svg viewBox={`0 -10 ${CW} ${CH + 20}`} className="w-full" style={{ maxHeight: 560 }}>
      <defs>
        <radialGradient id="cvGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect x={0} y={-10} width={CW} height={CH + 20} fill="url(#cvGrad)" rx={12} />
      {/* paint */}
      <rect x={170} y={-7} width={160} height={190} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
      {/* free-throw circle */}
      <circle cx={250} cy={183} r={60} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" />
      {/* basket */}
      <circle cx={250} cy={0} r={7.5} fill="none" stroke="rgba(255,200,100,0.5)" strokeWidth={2} />
      <line x1={220} y1={-7} x2={280} y2={-7} stroke="rgba(255,200,100,0.3)" strokeWidth={2} />
      {/* restricted area */}
      <path d={`M 210 -7 A 40 40 0 0 0 290 -7`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {/* three-point line */}
      <path d="M 30 -7 L 30 90 A 238 238 0 0 0 470 90 L 470 -7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
      {/* half-court */}
      <line x1={0} y1={CH - 10} x2={CW} y2={CH - 10} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <circle cx={250} cy={CH - 10} r={60} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {children}
    </svg>
  );
}

/* ── overlay toggles ──────────────────────────────────────────── */

type Overlay = "voronoi" | "lanes" | "matchups" | "players";

/* ═══════════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════════ */

export default function CourtVisionPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CourtVisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set(["players", "voronoi", "lanes"]));
  const [editMode, setEditMode] = useState(false);
  const [editedPlayers, setEditedPlayers] = useState<PlayerPosition[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleOverlay = useCallback((o: Overlay) => {
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setEditedPlayers(null);
    setEditMode(false);
    setImageUrl(URL.createObjectURL(file));
    setLoading(true);

    const fd = new FormData();
    fd.append("image", file);

    try {
      const res = await fetch("/api/court-vision", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setEditedPlayers(data.players ? [...data.players] : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleUpload(file);
    },
    [handleUpload],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  /* ── drag handlers for player correction ───────────────────── */
  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm);
    return { x: Math.max(0, Math.min(CW, transformed.x)), y: Math.max(-10, Math.min(CH + 10, transformed.y)) };
  }, []);

  const handlePointerDown = useCallback((playerId: number) => {
    if (!editMode) return;
    setDragging(playerId);
  }, [editMode]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null || !editedPlayers) return;
      const pos = svgPoint(e.clientX, e.clientY);
      setEditedPlayers((prev) =>
        prev!.map((p) => (p.id === dragging ? { ...p, x: Math.round(pos.x), y: Math.round(pos.y) } : p)),
      );
    },
    [dragging, editedPlayers, svgPoint],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  /* toggle team on click (right-click or double-click) */
  const toggleTeam = useCallback((playerId: number) => {
    if (!editMode || !editedPlayers) return;
    setEditedPlayers((prev) =>
      prev!.map((p) =>
        p.id === playerId
          ? { ...p, team: p.team === "offense" ? "defense" : "offense" }
          : p,
      ),
    );
  }, [editMode, editedPlayers]);

  /* add / remove player */
  const addPlayer = useCallback((team: "offense" | "defense") => {
    if (!editedPlayers) return;
    const maxId = editedPlayers.reduce((m, p) => Math.max(m, p.id), 0);
    setEditedPlayers([
      ...editedPlayers,
      { id: maxId + 1, team, x: 250, y: 230, role: "added" },
    ]);
  }, [editedPlayers]);

  const removePlayer = useCallback((playerId: number) => {
    if (!editedPlayers) return;
    setEditedPlayers(editedPlayers.filter((p) => p.id !== playerId));
  }, [editedPlayers]);

  /* reset to AI positions */
  const resetPlayers = useCallback(() => {
    if (result?.players) {
      setEditedPlayers([...result.players]);
    }
  }, [result]);

  /* computed analysis — uses edited players if available */
  const players = editedPlayers ?? result?.players ?? [];
  const spacing = useMemo(() => computeSpacingScore(players), [players]);
  const lanes = useMemo(() => computeDrivingLanes(players), [players]);
  const matchups = useMemo(() => computeMatchups(players), [players]);
  const voronoiCells = useMemo(
    () => (players.length > 0 ? computeVoronoiCells(players, CW, CH, 6) : new Map()),
    [players],
  );

  const offenseCount = players.filter((p) => p.team === "offense").length;
  const defenseCount = players.filter((p) => p.team === "defense").length;
  const openLanes = lanes.filter((l) => l.clear).length;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      {/* ── header ─────────────────────────────────────────── */}
      <span className={pill}>Court IQ</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Tactical Spacing Analyzer
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
        Upload a screenshot from any NBA game broadcast. GPT-4o vision detects players
        and maps them to court coordinates. Then: Voronoi territories, driving lanes,
        spacing scores, and matchup distances. Toggle <strong className="text-white/70">Edit mode</strong> to
        drag players to correct positions — analysis recalculates live.
      </p>

      {/* ── upload zone ────────────────────────────────────── */}
      <div
        className={`mt-8 ${glass} flex flex-col items-center justify-center p-10 transition-colors ${
          !imageUrl ? "cursor-pointer hover:bg-white/[0.03]" : ""
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !imageUrl && fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        {!imageUrl ? (
          <>
            <div className="text-4xl text-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-white/50">
              Drop an NBA game screenshot here or{" "}
              <span className="text-white/70 underline decoration-white/20">click to browse</span>
            </p>
            <p className="mt-1 text-[11px] text-white/30">
              Works best with broadcast camera angles showing the full half-court
            </p>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Uploaded NBA screenshot" className="w-full rounded-xl" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                    <span className="text-sm text-white/60">Analyzing court positions...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageUrl(null);
                  setResult(null);
                  setError(null);
                }}
                className="rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] text-white/60 transition hover:bg-white/[0.1] hover:text-white/80"
              >
                Upload new image
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── results ────────────────────────────────────────── */}
      {result && result.players.length > 0 && (
        <div className="mt-8 space-y-6">
          {/* KPI strip */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                t: "Spacing score",
                v: `${spacing.score}/100`,
                sub: spacing.grade,
                color: spacing.score >= 65 ? "text-emerald-400" : spacing.score >= 45 ? "text-amber-400" : "text-red-400",
              },
              { t: "Players detected", v: `${players.length}`, sub: `${offenseCount}O / ${defenseCount}D`, color: "text-white/80" },
              {
                t: "Open lanes",
                v: `${openLanes}/${offenseCount}`,
                sub: openLanes >= 3 ? "Great looks" : openLanes >= 1 ? "Some options" : "Locked down",
                color: openLanes >= 3 ? "text-emerald-400" : openLanes >= 1 ? "text-amber-400" : "text-red-400",
              },
              { t: "Avg spacing", v: `${spacing.avgDist.toFixed(0)}u`, sub: "pairwise distance", color: "text-white/80" },
              { t: "Confidence", v: `${(result.confidence * 100).toFixed(0)}%`, sub: "AI detection", color: "text-white/80" },
            ].map((k) => (
              <div key={k.t} className={`${glass} px-5 py-3`}>
                <div className={label}>{k.t}</div>
                <div className={`mt-1 text-xl font-semibold ${k.color}`}>{k.v}</div>
                <div className="text-[10px] text-white/30">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* overlay controls + edit mode */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/40 mr-2">Overlays:</span>
            {(
              [
                ["players", "Players"],
                ["voronoi", "Voronoi territories"],
                ["lanes", "Driving lanes"],
                ["matchups", "Matchup lines"],
              ] as [Overlay, string][]
            ).map(([key, lbl]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleOverlay(key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                  overlays.has(key)
                    ? "bg-white/10 text-white ring-1 ring-white/15"
                    : "bg-white/[0.03] text-white/35 hover:text-white/60"
                }`}
              >
                {lbl}
              </button>
            ))}

            <div className="mx-2 h-4 w-px bg-white/10" />

            <button
              type="button"
              onClick={() => setEditMode(!editMode)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                editMode
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-white/[0.03] text-white/35 hover:text-white/60"
              }`}
            >
              {editMode ? "Editing" : "Edit mode"}
            </button>

            {editMode && (
              <>
                <button
                  type="button"
                  onClick={resetPlayers}
                  className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/40 hover:text-white/70 transition"
                >
                  Reset to AI
                </button>
                <button
                  type="button"
                  onClick={() => addPlayer("offense")}
                  className="rounded-lg bg-indigo-500/15 px-3 py-1.5 text-[11px] text-indigo-300 hover:bg-indigo-500/25 transition"
                >
                  + Offense
                </button>
                <button
                  type="button"
                  onClick={() => addPlayer("defense")}
                  className="rounded-lg bg-red-500/15 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25 transition"
                >
                  + Defense
                </button>
              </>
            )}
          </div>

          {editMode && (
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-2.5 text-[11px] text-amber-200/70">
              <strong>Edit mode active</strong> — Drag players to correct their positions. Double-click to flip offense/defense.
              Right-click to remove. Analysis updates in real time.
            </div>
          )}

          {/* main court + sidebar */}
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className={`${glass} p-4 ${editMode ? "ring-1 ring-amber-500/20" : ""}`}>
              {/* Interactive court SVG with pointer events for drag */}
              <svg
                ref={svgRef}
                viewBox={`0 -10 ${CW} ${CH + 20}`}
                className={`w-full ${editMode ? "cursor-crosshair" : ""}`}
                style={{ maxHeight: 560, touchAction: "none" }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <defs>
                  <radialGradient id="cvGrad2" cx="50%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </radialGradient>
                </defs>
                <rect x={0} y={-10} width={CW} height={CH + 20} fill="url(#cvGrad2)" rx={12} />
                {/* paint */}
                <rect x={170} y={-7} width={160} height={190} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
                <circle cx={250} cy={183} r={60} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={250} cy={0} r={7.5} fill="none" stroke="rgba(255,200,100,0.5)" strokeWidth={2} />
                <line x1={220} y1={-7} x2={280} y2={-7} stroke="rgba(255,200,100,0.3)" strokeWidth={2} />
                <path d="M 210 -7 A 40 40 0 0 0 290 -7" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <path d="M 30 -7 L 30 90 A 238 238 0 0 0 470 90 L 470 -7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
                <line x1={0} y1={CH - 10} x2={CW} y2={CH - 10} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <circle cx={250} cy={CH - 10} r={60} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

                {/* reference landmarks in edit mode */}
                {editMode && (
                  <>
                    {[
                      { x: 250, y: 0, l: "basket" },
                      { x: 30, y: 40, l: "L corner 3" },
                      { x: 470, y: 40, l: "R corner 3" },
                      { x: 185, y: 70, l: "L block" },
                      { x: 315, y: 70, l: "R block" },
                      { x: 185, y: 183, l: "L elbow" },
                      { x: 315, y: 183, l: "R elbow" },
                      { x: 250, y: 183, l: "FT" },
                      { x: 60, y: 200, l: "L wing 3" },
                      { x: 440, y: 200, l: "R wing 3" },
                      { x: 250, y: 280, l: "top key 3" },
                    ].map((lm) => (
                      <g key={lm.l}>
                        <circle cx={lm.x} cy={lm.y} r={3} fill="none" stroke="rgba(251,191,36,0.25)" strokeWidth={0.5} />
                        <text x={lm.x} y={lm.y - 6} textAnchor="middle" fill="rgba(251,191,36,0.25)" fontSize={5}>
                          {lm.l}
                        </text>
                      </g>
                    ))}
                  </>
                )}

                {/* Voronoi territories */}
                {overlays.has("voronoi") &&
                  players.map((p) => {
                    const cells = voronoiCells.get(p.id) ?? [];
                    if (cells.length === 0) return null;
                    const color =
                      p.team === "offense"
                        ? "rgba(99, 102, 241, 0.06)"
                        : "rgba(239, 68, 68, 0.05)";
                    return cells.map((c, ci) => (
                      <rect
                        key={`v-${p.id}-${ci}`}
                        x={c.x}
                        y={c.y}
                        width={6}
                        height={6}
                        fill={color}
                      />
                    ));
                  })}

                {/* Voronoi boundaries */}
                {overlays.has("voronoi") &&
                  (() => {
                    const step = 6;
                    const borderPts: { x: number; y: number }[] = [];
                    for (let y = 0; y < CH; y += step) {
                      for (let x = 0; x < CW; x += step) {
                        let closestId = -1;
                        let minD = Infinity;
                        for (const p of players) {
                          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
                          if (d < minD) { minD = d; closestId = p.id; }
                        }
                        const nx = x + step;
                        if (nx < CW) {
                          let nClosest = -1;
                          let nMinD = Infinity;
                          for (const p of players) {
                            const d = (p.x - nx) ** 2 + (p.y - y) ** 2;
                            if (d < nMinD) { nMinD = d; nClosest = p.id; }
                          }
                          if (closestId !== nClosest) borderPts.push({ x: nx, y });
                        }
                        const ny = y + step;
                        if (ny < CH) {
                          let nClosest = -1;
                          let nMinD = Infinity;
                          for (const p of players) {
                            const d = (p.x - x) ** 2 + (p.y - ny) ** 2;
                            if (d < nMinD) { nMinD = d; nClosest = p.id; }
                          }
                          if (closestId !== nClosest) borderPts.push({ x, y: ny });
                        }
                      }
                    }
                    return borderPts.map((bp, i) => (
                      <rect
                        key={`b-${i}`}
                        x={bp.x - 0.5}
                        y={bp.y - 0.5}
                        width={1}
                        height={1}
                        fill="rgba(255,255,255,0.12)"
                      />
                    ));
                  })()}

                {/* Driving lanes */}
                {overlays.has("lanes") &&
                  lanes.map((l) => (
                    <line
                      key={`lane-${l.from.id}`}
                      x1={l.from.x}
                      y1={l.from.y}
                      x2={BASKET.x}
                      y2={BASKET.y}
                      stroke={l.clear ? "rgba(52, 211, 153, 0.35)" : "rgba(248, 113, 113, 0.15)"}
                      strokeWidth={l.clear ? 3 : 1.5}
                      strokeDasharray={l.clear ? "none" : "4 4"}
                      strokeLinecap="round"
                    />
                  ))}

                {/* Matchup lines */}
                {overlays.has("matchups") &&
                  matchups.map((m) =>
                    m.nearestDef ? (
                      <line
                        key={`mu-${m.offPlayer.id}`}
                        x1={m.offPlayer.x}
                        y1={m.offPlayer.y}
                        x2={m.nearestDef.x}
                        y2={m.nearestDef.y}
                        stroke="rgba(251, 191, 36, 0.25)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    ) : null,
                  )}

                {/* Player dots — draggable in edit mode */}
                {overlays.has("players") &&
                  players.map((p) => {
                    const isOff = p.team === "offense";
                    const isDragged = dragging === p.id;
                    return (
                      <g
                        key={`p-${p.id}`}
                        style={{ cursor: editMode ? "grab" : "default" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handlePointerDown(p.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          toggleTeam(p.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (editMode) removePlayer(p.id);
                        }}
                      >
                        {/* glow (bigger when dragging) */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isDragged ? 20 : 14}
                          fill={isOff ? "rgba(99, 102, 241, 0.15)" : "rgba(239, 68, 68, 0.12)"}
                        />
                        {/* edit ring */}
                        {editMode && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={12}
                            fill="none"
                            stroke="rgba(251, 191, 36, 0.3)"
                            strokeWidth={0.5}
                            strokeDasharray="2 2"
                          />
                        )}
                        {/* dot */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={8}
                          fill={isOff ? "rgba(99, 102, 241, 0.8)" : "rgba(239, 68, 68, 0.7)"}
                          stroke={isDragged ? "rgba(251, 191, 36, 0.9)" : isOff ? "rgba(129, 140, 248, 0.9)" : "rgba(252, 165, 165, 0.8)"}
                          strokeWidth={isDragged ? 2 : 1.5}
                        />
                        {/* label */}
                        <text
                          x={p.x}
                          y={p.y + 3.5}
                          textAnchor="middle"
                          fill="white"
                          fontSize={8}
                          fontWeight={700}
                          style={{ pointerEvents: "none" }}
                        >
                          {p.id}
                        </text>
                        {/* role label */}
                        {p.role && (
                          <text
                            x={p.x}
                            y={p.y + 22}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.4)"
                            fontSize={6}
                            style={{ pointerEvents: "none" }}
                          >
                            {p.role}
                          </text>
                        )}
                        {/* coordinate label in edit mode */}
                        {editMode && (
                          <text
                            x={p.x}
                            y={p.y - 18}
                            textAnchor="middle"
                            fill="rgba(251, 191, 36, 0.5)"
                            fontSize={5}
                            style={{ pointerEvents: "none" }}
                          >
                            ({p.x}, {p.y})
                          </text>
                        )}
                      </g>
                    );
                  })}
              </svg>

              {/* legend */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-indigo-500/70" />
                  Offense
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500/60" />
                  Defense
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-emerald-400/50" />
                  Open lane
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-px w-4 bg-red-400/30" style={{ borderTop: "1px dashed rgba(248,113,113,0.3)" }} />
                  Blocked lane
                </span>
              </div>
            </div>

            {/* sidebar */}
            <div className="space-y-4">
              {/* formation */}
              <div className={`${glass} p-5`}>
                <div className={label}>Formation</div>
                <div className="mt-2 text-base font-semibold text-white">{result.formation}</div>
                <div className="mt-1 text-[11px] text-white/50">{result.offensiveAction}</div>
              </div>

              {/* defense */}
              <div className={`${glass} p-5`}>
                <div className={label}>Defensive scheme</div>
                <div className="mt-2 text-base font-semibold text-white">{result.defensiveScheme}</div>
              </div>

              {/* key insight */}
              <div className={`${glass} p-5`}>
                <div className={label}>Key insight</div>
                <p className="mt-2 text-[12px] leading-relaxed text-white/60">{result.keyInsight}</p>
              </div>

              {/* matchup distances */}
              <div className={`${glass} p-5`}>
                <div className={label}>Defender distances</div>
                <div className="mt-3 space-y-2">
                  {matchups.map((m) => {
                    const maxD = Math.max(...matchups.map((mm) => mm.distance));
                    const barW = maxD > 0 ? (m.distance / maxD) * 100 : 0;
                    const isOpen = m.distance > 40;
                    return (
                      <div key={m.offPlayer.id}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/60">
                            #{m.offPlayer.id} {m.offPlayer.role ? `(${m.offPlayer.role})` : ""}
                          </span>
                          <span className={`font-mono ${isOpen ? "text-emerald-400" : "text-amber-400"}`}>
                            {m.distance.toFixed(0)}u {isOpen ? "OPEN" : ""}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barW}%`,
                              background: isOpen
                                ? "linear-gradient(90deg, rgba(52,211,153,0.4), rgba(52,211,153,0.7))"
                                : "linear-gradient(90deg, rgba(251,191,36,0.3), rgba(251,191,36,0.6))",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* driving lanes */}
              <div className={`${glass} p-5`}>
                <div className={label}>Driving lanes</div>
                <div className="mt-3 space-y-1.5">
                  {lanes.map((l) => (
                    <div
                      key={l.from.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] ${
                        l.clear ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.03] text-white/40"
                      }`}
                    >
                      <span>
                        #{l.from.id} → basket
                      </span>
                      <span className="font-mono">
                        {l.clear ? "CLEAR" : `blocked (${l.closestDefDist.toFixed(0)}u)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* spacing breakdown */}
          <div className={`${glass} p-6`}>
            <div className={label}>Spacing analysis</div>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div>
                <div className="text-[11px] text-white/40">Spacing score</div>
                <div className="mt-1 flex items-end gap-3">
                  <span
                    className={`text-4xl font-bold ${
                      spacing.score >= 65 ? "text-emerald-400" : spacing.score >= 45 ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    {spacing.score}
                  </span>
                  <span className="mb-1 text-sm text-white/40">/100 — {spacing.grade}</span>
                </div>
                {/* visual bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${spacing.score}%`,
                      background:
                        spacing.score >= 65
                          ? "linear-gradient(90deg, rgba(52,211,153,0.5), rgba(52,211,153,0.9))"
                          : spacing.score >= 45
                            ? "linear-gradient(90deg, rgba(251,191,36,0.5), rgba(251,191,36,0.9))"
                            : "linear-gradient(90deg, rgba(248,113,113,0.5), rgba(248,113,113,0.9))",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-white/40">Average pairwise distance</div>
                <div className="mt-1 text-2xl font-semibold text-white">{spacing.avgDist.toFixed(1)} <span className="text-base text-white/40">units</span></div>
                <p className="mt-2 text-[10px] text-white/30">
                  Higher = more spread. NBA average ≈ 110-130 units between offensive players.
                </p>
              </div>
              <div>
                <div className="text-[11px] text-white/40">Convex hull area</div>
                <div className="mt-1 text-2xl font-semibold text-white">{(spacing.convexArea / 1000).toFixed(1)}k <span className="text-base text-white/40">sq units</span></div>
                <p className="mt-2 text-[10px] text-white/30">
                  Floor area covered by the offense. Larger = harder to defend.
                </p>
              </div>
            </div>
          </div>

          {/* methodology */}
          <div className={`${glassInner} p-5`}>
            <div className={label}>Methodology</div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              Player detection uses GPT-4o vision to identify and locate players from the broadcast frame.
              Positions are mapped to a standardized half-court coordinate system.
              Voronoi tessellation partitions the court into control zones.
              Driving lanes test line-of-sight clearance from each offensive player to the basket.
              Spacing score blends average pairwise distance (50%) with convex hull area (50%), normalized to 0-100.
              Inspired by spatial analysis techniques from{" "}
              <a
                href="https://github.com/roboflow/notebooks"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/20 hover:text-white/60"
              >
                Roboflow CV notebooks
              </a>
              — polygon zone counting, object tracking, and detection heatmaps — adapted for basketball tactical analysis.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
