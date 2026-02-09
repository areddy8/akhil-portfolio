"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

/* ── types ─────────────────────────────────────────────────────────── */

type WacCohort = {
  ficoBand: "Low" | "Medium" | "High";
  tier: number;
  term: number;
  avgRate: number;
  loanPurpose: string;
  loanAmountBand: string;
};

type WhatIfResult = {
  scenario: string;
  targetGrid: string;
  bpsChange: number;
  baseline: {
    avgWac: number;
    conversionRate: number;
    totalApplicants: number;
    totalConverted: number;
  };
  projected: {
    avgWac: number;
    conversionRate: number;
    totalConverted: number;
  };
  delta: {
    wacBps: number;
    conversionPp: number;
    convertedDelta: number;
  };
  elasticity: number;
};

type ReplayWeek = {
  date: string;
  actual: { applications: number; approvals: number; booked: number; apr: number; conversionRate: number };
  simulated: { applications: number; approvals: number; booked: number; apr: number; conversionRate: number };
  delta: { approvals: number; booked: number; conversionPp: number; aprBps: number };
  activeGrids: string[];
  wasActive: boolean;
};

type ReplayResult = {
  targetGrid: string;
  bpsChange: number;
  elasticities: { approvalElasticity: number; bookingElasticity: number; appDemandElasticity: number };
  weeks: ReplayWeek[];
  totals: {
    actualBooked: number;
    simulatedBooked: number;
    bookedDelta: number;
    actualAvgConversion: number;
    simulatedAvgConversion: number;
    conversionDeltaPp: number;
    actualTotalApprovals: number;
    simulatedTotalApprovals: number;
  };
};

type AnalystResponse = {
  summary: string;
  aiSummary?: string | null;
  wacCohorts?: WacCohort[];
  gridWac?: { gridId: string; avgRate: number }[];
  gridWacSummary?: string;
  gridConversion?: {
    gridId: string;
    conversionRate: number;
    approved: number;
  }[];
  gridConversionSummary?: string;
  whatIf?: WhatIfResult | null;
  replay?: ReplayResult | null;
  performance: null | {
    summary: string;
    highlights: string[];
    series: {
      date: string;
      approvalRate: number;
      bookedRate: number;
      avgApr: number;
      applications: number;
      approvals: number;
      booked: number;
      activeGrids: string[];
    }[];
    simulation?: {
      summary: string;
      deltas: {
        approvalRate: number;
        bookedPerWeek: number;
        avgApr: number;
        activeGrids: number;
      };
    } | null;
  };
};

/* ── constants ─────────────────────────────────────────────────────── */

const EXAMPLES = [
  "Which grid has the highest conversion?",
  "Which grid has the highest average WAC?",
  "Summarize portfolio performance over the last 6 months",
  "What would happen to conversion if we increased grid AA by 100bps?",
  "What if we decreased grid AG by 50bps?",
];

const TERMS = [2, 3, 4, 5, 6, 7];
const TIERS = Array.from({ length: 10 }, (_, i) => i + 1);
const FICO_BANDS: WacCohort["ficoBand"][] = ["Low", "Medium", "High"];
const LOAN_PURPOSES = ["DebtConsolidation", "HomeImprovement", "MajorPurchase", "Medical", "Auto"];
const LOAN_AMOUNT_BANDS = ["<10k", "10k-20k", "20k-35k", "35k-50k", "50k+"];

type SliceDimension = "none" | "ficoBand" | "loanPurpose" | "loanAmountBand";

const SLICE_OPTIONS: { value: SliceDimension; label: string }[] = [
  { value: "none", label: "No split" },
  { value: "ficoBand", label: "FICO band" },
  { value: "loanPurpose", label: "Loan purpose" },
  { value: "loanAmountBand", label: "Loan amount" },
];

const GRID_LIBRARY = [
  { gridId: "AA", product: "PL", channel: "Mixed", effectiveDate: "2025-10-01", notes: "Long-run baseline grid" },
  { gridId: "AB", product: "PL", channel: "Mixed", effectiveDate: "2025-10-01", notes: "Baseline pricing grid" },
  { gridId: "AC", product: "PL", channel: "Mixed", effectiveDate: "2025-10-01", notes: "Higher-rate experimental" },
  { gridId: "AD", product: "PL", channel: "Mixed", effectiveDate: "2025-11-05", notes: "Short-run pricing bump" },
  { gridId: "AE", product: "PL", channel: "Mixed", effectiveDate: "2025-11-19", notes: "Lower-rate acquisition" },
  { gridId: "AF", product: "PL", channel: "Mixed", effectiveDate: "2025-11-30", notes: "Moderate rate uplift" },
  { gridId: "AG", product: "PL", channel: "Mixed", effectiveDate: "2025-11-30", notes: "Aggressive pricing" },
  { gridId: "AH", product: "PL", channel: "Mixed", effectiveDate: "2025-12-21", notes: "High-rate short-run" },
  { gridId: "AI", product: "PL", channel: "Mixed", effectiveDate: "2025-12-21", notes: "Highest-rate experiment" },
];

const EXPERIMENT_SCHEDULE = [
  { experimentId: "001", grid: "AA", start: "2025-10-01", end: "2025-11-05" },
  { experimentId: "001", grid: "AB", start: "2025-10-01", end: "2025-11-05" },
  { experimentId: "001", grid: "AC", start: "2025-10-01", end: "2025-11-05" },
  { experimentId: "002", grid: "AA", start: "2025-11-05", end: "2025-11-19" },
  { experimentId: "002", grid: "AD", start: "2025-11-05", end: "2025-11-19" },
  { experimentId: "003", grid: "AA", start: "2025-11-19", end: "2025-11-30" },
  { experimentId: "003", grid: "AE", start: "2025-11-19", end: "2025-11-30" },
  { experimentId: "004", grid: "AA", start: "2025-11-30", end: "2025-12-21" },
  { experimentId: "004", grid: "AE", start: "2025-11-30", end: "2025-12-21" },
  { experimentId: "004", grid: "AF", start: "2025-11-30", end: "2025-12-21" },
  { experimentId: "004", grid: "AG", start: "2025-11-30", end: "2025-12-21" },
  { experimentId: "005", grid: "AG", start: "2025-12-21", end: "2026-01-03" },
  { experimentId: "005", grid: "AH", start: "2025-12-21", end: "2026-01-03" },
  { experimentId: "005", grid: "AI", start: "2025-12-21", end: "2026-01-03" },
  { experimentId: "006", grid: "AH", start: "2026-01-03", end: "2026-01-31" },
  { experimentId: "006", grid: "AA", start: "2026-01-03", end: "2026-01-31" },
  { experimentId: "007", grid: "AA", start: "2026-01-31", end: "9999-12-31" },
];

/* ── formatters ────────────────────────────────────────────────────── */

const fmt = (value: number) => `${(value * 100).toFixed(2)}%`;
const fmtDelta = (value: number) => {
  const pct = Math.round(value * 10000) / 100;
  const n = Object.is(pct, -0) ? 0 : pct;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

/* ── style tokens ──────────────────────────────────────────────────── */

const glass =
  "rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] shadow-[0_1px_2px_rgba(0,0,0,0.4)]";
const glassInner =
  "rounded-xl border border-white/[0.06] bg-white/[0.03]";
const label = "text-[10px] uppercase tracking-[0.18em] font-medium text-white/40";
const pill =
  "rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/60 transition hover:bg-white/[0.08] hover:text-white";
const selectStyle =
  "rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-[11px] text-white/80 outline-none";

/* ── component ─────────────────────────────────────────────────────── */

export default function GridAnalystDemo() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [response, setResponse] = useState<AnalystResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulateHighWac, setSimulateHighWac] = useState(false);
  const [rowGroup, setRowGroup] = useState<"Tier" | "Term">("Tier");
  const [colGroup, setColGroup] = useState<"Tier" | "Term">("Term");
  const [sliceBy, setSliceBy] = useState<SliceDimension>("ficoBand");
  const [sliceBy2, setSliceBy2] = useState<SliceDimension>("none");
  const [selectedGrids, setSelectedGrids] = useState(
    GRID_LIBRARY.map((g) => g.gridId),
  );

  /* heatmap has its own data, loaded independently */
  const [heatmapCohorts, setHeatmapCohorts] = useState<WacCohort[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  /* historical replay — independent from "run analysis" */
  const [replayGrid, setReplayGrid] = useState("AA");
  const [replayBps, setReplayBps] = useState(100);
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const fetchHeatmap = useCallback(async (grids: string[]) => {
    setHeatmapLoading(true);
    try {
      const res = await fetch("/api/grid-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "__heatmap_only__",
          selectedGrids: grids,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as AnalystResponse;
        setHeatmapCohorts(data.wacCohorts ?? []);
      }
    } catch {
      /* silently fail — heatmap is non-critical */
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  /* auto-fetch heatmap on mount and when grid selection changes */
  useEffect(() => {
    fetchHeatmap(selectedGrids);
  }, [selectedGrids, fetchHeatmap]);

  const runReplay = useCallback(async () => {
    setReplayLoading(true);
    try {
      const res = await fetch("/api/grid-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "__replay_only__",
          replayGrid,
          replayBps,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplayResult(data.replay ?? null);
      }
    } catch {
      /* silently fail */
    } finally {
      setReplayLoading(false);
    }
  }, [replayGrid, replayBps]);

  const examples = useMemo(() => EXAMPLES, []);

  const ask = async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grid-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, simulateHighWac, selectedGrids }),
      });
      if (!res.ok) throw new Error("Failed to analyze grid data.");
      setResponse((await res.json()) as AnalystResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  /* ── derived stats ─────────────────────────────────────── */

  const topWac = response?.gridWac
    ?.slice()
    .sort((a, b) => b.avgRate - a.avgRate)[0];
  const topConv = response?.gridConversion
    ?.slice()
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];
  const perf = response?.performance;
  const lastWeek = perf?.series[perf.series.length - 1];

  /* ── render ─────────────────────────────────────────────── */

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      {/* header */}
      <div className="flex items-end justify-between">
        <div>
          <span className={`${pill} cursor-default`}>Portfolio Lab</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Grid Analyst
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
            Ask questions about portfolio pricing, WAC trends, and performance.
            Computed from real grid + performance CSVs on the server.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Highest WAC grid",
            value: topWac ? `${topWac.gridId}  ${fmt(topWac.avgRate)}` : "—",
          },
          {
            title: "Top conversion",
            value: topConv
              ? `${topConv.gridId}  ${fmt(topConv.conversionRate)}`
              : "—",
          },
          {
            title: "Last week booked",
            value: lastWeek ? `${lastWeek.booked}` : "—",
          },
          {
            title: "Active grids",
            value: lastWeek
              ? `${lastWeek.activeGrids.length} (${lastWeek.activeGrids.join(", ")})`
              : "—",
          },
        ].map((kpi) => (
          <div key={kpi.title} className={`${glass} px-5 py-4`}>
            <div className={label}>{kpi.title}</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* main 2-col layout */}
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* left: analyst + results */}
        <div className="space-y-6">
          {/* prompt */}
          <div className={`${glass} p-6`}>
            <div className={label}>Ask the analyst</div>
            <textarea
              className="mt-3 min-h-[72px] w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type a question..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuestion(ex);
                    ask(ex);
                  }}
                  className={pill}
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Button
                onClick={() => ask(question)}
                disabled={loading}
                className="rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-40"
              >
                {loading ? "Analyzing..." : "Run analysis"}
              </Button>
              <label className="flex items-center gap-2 text-[11px] text-white/50">
                <input
                  type="checkbox"
                  checked={simulateHighWac}
                  onChange={(e) => setSimulateHighWac(e.target.checked)}
                  className="accent-white"
                />
                Simulate high-WAC grid
              </label>
              {error ? (
                <span className="text-[11px] text-red-400">{error}</span>
              ) : null}
            </div>
          </div>

          {/* summary + AI */}
          {response ? (
            <div className={`${glass} space-y-5 p-6`}>
              <div>
                <div className={label}>Summary</div>
                <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                  {response.summary}
                </p>
              </div>
              {response.aiSummary ? (
                <div>
                  <div className={label}>AI narrative</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                    {response.aiSummary}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* what-if simulation result */}
          {response?.whatIf ? (
            <div className={`${glass} p-6`}>
              <div className={label}>What-if simulation</div>
              <div className="mt-1 text-[13px] font-medium text-white/80">
                {response.whatIf.scenario}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={`${glassInner} p-4 text-center`}>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                    Baseline WAC
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {(response.whatIf.baseline.avgWac * 100).toFixed(2)}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/40">
                    Conv: {(response.whatIf.baseline.conversionRate * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="flex items-center justify-center text-white/30">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div className={`${glassInner} p-4 text-center`}>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                    Projected WAC
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {(response.whatIf.projected.avgWac * 100).toFixed(2)}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/40">
                    Conv: {(response.whatIf.projected.conversionRate * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "WAC change",
                    value: `${response.whatIf.delta.wacBps > 0 ? "+" : ""}${response.whatIf.delta.wacBps} bps`,
                    color: response.whatIf.delta.wacBps > 0 ? "text-amber-400" : "text-emerald-400",
                  },
                  {
                    label: "Conv impact",
                    value: `${response.whatIf.delta.conversionPp > 0 ? "+" : ""}${(response.whatIf.delta.conversionPp * 100).toFixed(2)} pp`,
                    color: response.whatIf.delta.conversionPp < 0 ? "text-red-400" : "text-emerald-400",
                  },
                  {
                    label: "Converted delta",
                    value: `${response.whatIf.delta.convertedDelta > 0 ? "+" : ""}${response.whatIf.delta.convertedDelta}`,
                    color: response.whatIf.delta.convertedDelta < 0 ? "text-red-400" : "text-emerald-400",
                  },
                  {
                    label: "Elasticity /100bps",
                    value: `${(response.whatIf.elasticity * 100).toFixed(3)} pp`,
                    color: "text-white/70",
                  },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="rounded-lg bg-white/[0.04] px-3 py-2.5 text-center"
                  >
                    <div className="text-[10px] text-white/40">{d.label}</div>
                    <div className={`mt-0.5 font-mono text-sm font-semibold ${d.color}`}>
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-white/30">
                Elasticity derived from cross-grid linear regression on {response.whatIf.baseline.totalApplicants.toLocaleString()} applicants in population data.
              </div>
            </div>
          ) : null}

          {/* rankings side by side */}
          {response ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`${glass} p-5`}>
                <div className={label}>WAC by grid</div>
                <div className="mt-3 space-y-1.5">
                  {response.gridWac
                    ?.slice()
                    .sort((a, b) => b.avgRate - a.avgRate)
                    .map((g, i) => (
                      <div
                        key={g.gridId}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          backgroundColor: `rgba(20,137,153,${0.06 + i * 0.015})`,
                        }}
                      >
                        <span className="text-[12px] font-medium text-white/80">
                          {g.gridId}
                        </span>
                        <span className="font-mono text-[12px] text-white/60">
                          {fmt(g.avgRate)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              <div className={`${glass} p-5`}>
                <div className={label}>Conversion by grid</div>
                <div className="mt-3 space-y-1.5">
                  {response.gridConversion
                    ?.slice()
                    .sort((a, b) => b.conversionRate - a.conversionRate)
                    .map((g, i) => (
                      <div
                        key={g.gridId}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          backgroundColor: `rgba(99,102,241,${0.06 + i * 0.015})`,
                        }}
                      >
                        <span className="text-[12px] font-medium text-white/80">
                          {g.gridId}
                        </span>
                        <span className="font-mono text-[12px] text-white/60">
                          {fmt(g.conversionRate)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* right sidebar */}
        <div className="space-y-5">
          {/* grid library — clickable to toggle selection */}
          <div className={`${glass} p-5`}>
            <div className="flex items-center justify-between">
              <div className={label}>Portfolio grids</div>
              <span className="text-[10px] text-white/30">
                {selectedGrids.length}/{GRID_LIBRARY.length} selected
              </span>
            </div>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-auto pr-1">
              {GRID_LIBRARY.map((g) => {
                const active = selectedGrids.includes(g.gridId);
                return (
                  <button
                    key={g.gridId}
                    type="button"
                    onClick={() =>
                      setSelectedGrids((prev) =>
                        active
                          ? prev.filter((id) => id !== g.gridId)
                          : [...prev, g.gridId],
                      )
                    }
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-white/[0.12] bg-white/[0.06]"
                        : "border-white/[0.04] bg-white/[0.02] opacity-50 hover:opacity-75"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition ${
                        active
                          ? "bg-white/[0.12] text-white"
                          : "bg-white/[0.04] text-white/50"
                      }`}
                    >
                      {g.gridId}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-white/50">
                        {g.product} · {g.channel} · {g.effectiveDate}
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/40">
                        {g.notes}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* experiment timeline — clickable rows to select experiment grids */}
          <div className={`${glass} p-5`}>
            <div className={label}>Experiment schedule</div>
            <p className="mt-1 text-[10px] text-white/25">
              Click an experiment to filter to its grids
            </p>
            <div className="mt-3 max-h-[280px] overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-white/40">
                    <th className="pb-2 pr-2 font-medium">Exp</th>
                    <th className="pb-2 pr-2 font-medium">Grid</th>
                    <th className="pb-2 pr-2 font-medium">Start</th>
                    <th className="pb-2 font-medium">End</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  {EXPERIMENT_SCHEDULE.map((row) => {
                    const expGrids = EXPERIMENT_SCHEDULE
                      .filter((r) => r.experimentId === row.experimentId)
                      .map((r) => r.grid);
                    const isActive = expGrids.every((g) =>
                      selectedGrids.includes(g),
                    ) && selectedGrids.length === expGrids.length;
                    return (
                      <tr
                        key={`${row.experimentId}-${row.grid}`}
                        className={`cursor-pointer border-t transition ${
                          isActive
                            ? "border-white/[0.08] bg-white/[0.04]"
                            : "border-white/[0.04] hover:bg-white/[0.03]"
                        }`}
                        onClick={() => setSelectedGrids(expGrids)}
                      >
                        <td className="py-1.5 pr-2">{row.experimentId}</td>
                        <td className="py-1.5 pr-2 font-medium text-white/70">
                          {row.grid}
                        </td>
                        <td className="py-1.5 pr-2">{row.start}</td>
                        <td className="py-1.5">
                          {row.end === "9999-12-31" ? "ongoing" : row.end}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* help */}
          <div className={`${glass} p-5`}>
            <div className={label}>What you can ask</div>
            <ul className="mt-3 space-y-1.5 text-[11px] text-white/50">
              <li>Which grid has the highest conversion?</li>
              <li>Which grid has the highest average WAC?</li>
              <li>Summarize portfolio performance</li>
              <li>Which FICO band is most expensive?</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── full-width WAC heatmap ─────────────────────────── */}
      <div className={`${glass} mt-8 p-6`}>
        {/* controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className={label}>WAC heatmap</div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
            <label className="flex items-center gap-1.5">
              Rows
              <select
                className={selectStyle}
                value={rowGroup}
                onChange={(e) => setRowGroup(e.target.value as "Tier" | "Term")}
              >
                <option value="Tier">Tier</option>
                <option value="Term">Term</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              Cols
              <select
                className={selectStyle}
                value={colGroup}
                onChange={(e) => setColGroup(e.target.value as "Tier" | "Term")}
              >
                <option value="Tier">Tier</option>
                <option value="Term">Term</option>
              </select>
            </label>
            <span className="text-white/20">|</span>
            <label className="flex items-center gap-1.5">
              Split by
              <select
                className={selectStyle}
                value={sliceBy}
                onChange={(e) => setSliceBy(e.target.value as SliceDimension)}
              >
                {SLICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              + Split by
              <select
                className={selectStyle}
                value={sliceBy2}
                onChange={(e) => setSliceBy2(e.target.value as SliceDimension)}
              >
                {SLICE_OPTIONS.filter((o) => o.value !== sliceBy).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <span className="text-white/20">|</span>
            <button
              type="button"
              className={pill}
              onClick={() => setSelectedGrids(GRID_LIBRARY.map((g) => g.gridId))}
            >
              All grids
            </button>
            <button
              type="button"
              className={pill}
              onClick={() => setSelectedGrids([])}
            >
              None
            </button>
          </div>
        </div>

        {/* grid chip selector */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {GRID_LIBRARY.map((g) => {
            const on = selectedGrids.includes(g.gridId);
            return (
              <button
                key={g.gridId}
                type="button"
                onClick={() =>
                  setSelectedGrids((prev) =>
                    on
                      ? prev.filter((id) => id !== g.gridId)
                      : [...prev, g.gridId],
                  )
                }
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  on
                    ? "bg-white/10 text-white ring-1 ring-white/20"
                    : "bg-white/[0.03] text-white/40 hover:text-white/60"
                }`}
              >
                {g.gridId}
              </button>
            );
          })}
        </div>

        {/* matrices */}
        {heatmapLoading && (
          <div className="mt-4 text-center text-[11px] text-white/30 animate-pulse">Loading heatmap...</div>
        )}
        {(() => {
          const cohorts = heatmapCohorts;
          const rowValues = rowGroup === "Tier" ? TIERS.map(String) : TERMS.map(String);
          const colValues = colGroup === "Tier" ? TIERS.map(String) : TERMS.map(String);

          const cellColor = (rate: number) => {
            const t = Math.min(Math.max((rate - 0.032) / 0.03, 0), 1);
            const r = Math.round(20 + 188 * t);
            const g = Math.round(137 + 3 * t);
            const b = Math.round(153 - 107 * t);
            return `rgba(${r},${g},${b},${0.15 + t * 0.18})`;
          };

          const headerLabel = (group: string, value: string) =>
            group === "Tier" ? `T${value}` : `${value}yr`;

          /* aggregate cohorts down to tier/term for a given subset */
          const aggregate = (subset: WacCohort[]) => {
            const map = new Map<string, { sum: number; count: number }>();
            for (const c of subset) {
              const rk = rowGroup === "Tier" ? String(c.tier) : String(c.term);
              const ck = colGroup === "Tier" ? String(c.tier) : String(c.term);
              const key = `${rk}|${ck}`;
              const prev = map.get(key) ?? { sum: 0, count: 0 };
              prev.sum += c.avgRate * 1; // already averaged per fine-grained bucket; treat as single observation
              prev.count += 1;
              map.set(key, prev);
            }
            return map;
          };

          const renderMatrix = (filtered: WacCohort[], title?: string) => {
            const idx = aggregate(filtered);

            return (
              <div className={`${glassInner} overflow-auto p-3`}>
                {title ? (
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    {title}
                  </div>
                ) : null}
                <div
                  className="grid gap-[5px] text-[11px]"
                  style={{
                    gridTemplateColumns: `48px repeat(${colValues.length}, minmax(52px, 1fr))`,
                  }}
                >
                  <div />
                  {colValues.map((c) => (
                    <div
                      key={`h-${c}`}
                      className="text-center text-[10px] font-medium text-white/35"
                    >
                      {headerLabel(colGroup, c)}
                    </div>
                  ))}
                  {rowValues.map((r) => (
                    <Fragment key={`r-${r}`}>
                      <div className="flex items-center text-[10px] font-medium text-white/50">
                        {headerLabel(rowGroup, r)}
                      </div>
                      {colValues.map((c) => {
                        const entry = idx.get(`${r}|${c}`);
                        const rate = entry ? entry.sum / entry.count : 0;
                        return (
                          <div
                            key={`${r}-${c}`}
                            className="rounded-md py-2 text-center"
                            style={{ backgroundColor: cellColor(rate) }}
                          >
                            <span className="text-[11px] font-semibold text-white/90">
                              {(rate * 100).toFixed(2)}%
                            </span>
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          };

          /* resolve slice values for a given dimension */
          const sliceValues = (dim: SliceDimension): string[] => {
            if (dim === "ficoBand") return [...FICO_BANDS];
            if (dim === "loanPurpose") return [...LOAN_PURPOSES];
            if (dim === "loanAmountBand") return [...LOAN_AMOUNT_BANDS];
            return [];
          };

          const sliceFilter = (c: WacCohort, dim: SliceDimension, val: string): boolean => {
            if (dim === "ficoBand") return c.ficoBand === val;
            if (dim === "loanPurpose") return c.loanPurpose === val;
            if (dim === "loanAmountBand") return c.loanAmountBand === val;
            return true;
          };

          const sliceLabel = (dim: SliceDimension, val: string): string => {
            if (dim === "ficoBand") return `${val} FICO`;
            if (dim === "loanPurpose") return val.replace(/([A-Z])/g, " $1").trim();
            if (dim === "loanAmountBand") return val;
            return val;
          };

          /* no slicing */
          if (sliceBy === "none") {
            return <div className="mt-4">{renderMatrix(cohorts)}</div>;
          }

          const vals1 = sliceValues(sliceBy);

          /* single slice */
          if (sliceBy2 === "none") {
            const cols = vals1.length <= 3 ? `lg:grid-cols-3` : vals1.length <= 5 ? `lg:grid-cols-3 xl:grid-cols-5` : `lg:grid-cols-3`;
            return (
              <div className={`mt-4 grid gap-4 ${cols}`}>
                {vals1.map((v) => (
                  <div key={v}>
                    {renderMatrix(
                      cohorts.filter((c) => sliceFilter(c, sliceBy, v)),
                      sliceLabel(sliceBy, v),
                    )}
                  </div>
                ))}
              </div>
            );
          }

          /* double slice: primary → rows of panels, secondary → columns within each row */
          const vals2 = sliceValues(sliceBy2);
          return (
            <div className="mt-4 space-y-6">
              {vals1.map((v1) => (
                <div key={v1}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">
                    {sliceLabel(sliceBy, v1)}
                  </div>
                  <div className={`grid gap-4 ${vals2.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-5"}`}>
                    {vals2.map((v2) => (
                      <div key={`${v1}-${v2}`}>
                        {renderMatrix(
                          cohorts.filter(
                            (c) => sliceFilter(c, sliceBy, v1) && sliceFilter(c, sliceBy2, v2),
                          ),
                          sliceLabel(sliceBy2, v2),
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── full-width performance ─────────────────────────── */}
      <div className={`${glass} mt-6 p-6`}>
        <div className={label}>Portfolio performance over time</div>
        {response?.performance ? (
          <div className="mt-4 space-y-4">
            <p className="text-[13px] leading-relaxed text-white/60">
              {response.performance.summary}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-white/50">
              {response.performance.highlights.map((h) => (
                <span key={h} className={`${glassInner} px-3 py-1.5`}>
                  {h}
                </span>
              ))}
            </div>

            {response.performance.simulation ? (
              <div className={`${glassInner} p-4`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                  Simulation impact
                </div>
                <p className="mt-2 text-[12px] text-white/60">
                  {response.performance.simulation.summary}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {[
                    {
                      label: "Approval Δ",
                      value: fmtDelta(
                        response.performance.simulation.deltas.approvalRate,
                      ),
                    },
                    {
                      label: "Booked Δ",
                      value: `${Math.round(response.performance.simulation.deltas.bookedPerWeek)}`,
                    },
                    {
                      label: "APR Δ",
                      value: fmtDelta(
                        response.performance.simulation.deltas.avgApr,
                      ),
                    },
                    {
                      label: "Grids Δ",
                      value:
                        response.performance.simulation.deltas.activeGrids.toFixed(
                          1,
                        ),
                    },
                  ].map((d) => (
                    <div
                      key={d.label}
                      className="rounded-lg bg-white/[0.04] px-3 py-2 text-center"
                    >
                      <div className="text-[10px] text-white/40">{d.label}</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-white/80">
                        {d.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* scrollable table */}
            <div
              className="relative max-h-[320px] overflow-y-auto overflow-x-auto rounded-lg border border-white/[0.04] scrollbar-thin"
              style={{ scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
            >
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10 bg-[#0c0c10]/95 backdrop-blur-sm">
                  <tr className="text-left text-white/40">
                    <th className="px-3 py-2.5 font-medium">Week</th>
                    <th className="px-3 py-2.5 font-medium">Approval</th>
                    <th className="px-3 py-2.5 font-medium">Booked</th>
                    <th className="px-3 py-2.5 font-medium">Avg APR</th>
                    <th className="px-3 py-2.5 font-medium">Grids</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  {response.performance.series.map((row, i) => (
                    <tr
                      key={row.date}
                      className={`border-t border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                        i % 2 === 0 ? "bg-white/[0.01]" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-white/70">
                        {row.date}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {(row.approvalRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {(row.bookedRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {(row.avgApr * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-white/40">
                        {row.activeGrids.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-white/20 text-center">
              Scroll to see all weeks
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-white/40">
            Ask about performance or trends to see the time series.
          </p>
        )}
      </div>

      {/* ── historical replay simulation ───────────────────── */}
      <div className={`${glass} mt-8 p-6`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={label}>Historical replay</div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
            <label className="flex items-center gap-1.5">
              Grid
              <select
                className={selectStyle}
                value={replayGrid}
                onChange={(e) => setReplayGrid(e.target.value)}
              >
                {GRID_LIBRARY.map((g) => (
                  <option key={g.gridId} value={g.gridId}>{g.gridId}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              Adjustment
              <select
                className={selectStyle}
                value={replayBps}
                onChange={(e) => setReplayBps(Number(e.target.value))}
              >
                {[-200, -150, -100, -50, -25, 25, 50, 100, 150, 200, 300, 500].map((v) => (
                  <option key={v} value={v}>{v > 0 ? `+${v}` : v} bps</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={runReplay}
              disabled={replayLoading}
              className="rounded-full bg-white px-4 py-1.5 text-[11px] font-medium text-black hover:bg-white/90 disabled:opacity-40"
            >
              {replayLoading ? "Running..." : "Run replay"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-white/30">
          Re-run the last 6 months of performance data with a pricing adjustment applied to one grid.
          Shows actual vs. simulated week-by-week comparison.
        </p>

        {replayResult ? (
          <div className="mt-5 space-y-4">
            {/* totals — 2 rows: actuals vs simulated, then deltas */}
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  { label: "Actual approvals", value: replayResult.totals.actualTotalApprovals.toLocaleString(), color: "text-white/80" },
                  { label: "Sim. approvals", value: replayResult.totals.simulatedTotalApprovals.toLocaleString(), color: "text-white/80" },
                  { label: "Actual booked", value: replayResult.totals.actualBooked.toLocaleString(), color: "text-white/80" },
                  { label: "Sim. booked", value: replayResult.totals.simulatedBooked.toLocaleString(), color: "text-white/80" },
                ].map((d) => (
                  <div key={d.label} className="rounded-lg bg-white/[0.04] px-3 py-2.5 text-center">
                    <div className="text-[10px] text-white/40">{d.label}</div>
                    <div className={`mt-0.5 font-mono text-sm font-semibold ${d.color}`}>{d.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  {
                    label: "Booked delta",
                    value: `${replayResult.totals.bookedDelta > 0 ? "+" : ""}${replayResult.totals.bookedDelta.toLocaleString()}`,
                    color: replayResult.totals.bookedDelta >= 0 ? "text-emerald-400" : "text-red-400",
                  },
                  {
                    label: "Approval delta",
                    value: `${(replayResult.totals.simulatedTotalApprovals - replayResult.totals.actualTotalApprovals) > 0 ? "+" : ""}${(replayResult.totals.simulatedTotalApprovals - replayResult.totals.actualTotalApprovals).toLocaleString()}`,
                    color: (replayResult.totals.simulatedTotalApprovals - replayResult.totals.actualTotalApprovals) >= 0 ? "text-emerald-400" : "text-red-400",
                  },
                  {
                    label: "Actual conv",
                    value: `${(replayResult.totals.actualAvgConversion * 100).toFixed(2)}%`,
                    color: "text-white/80",
                  },
                  {
                    label: "Conv delta",
                    value: `${replayResult.totals.conversionDeltaPp > 0 ? "+" : ""}${(replayResult.totals.conversionDeltaPp * 100).toFixed(2)} pp`,
                    color: replayResult.totals.conversionDeltaPp >= 0 ? "text-emerald-400" : "text-red-400",
                  },
                ].map((d) => (
                  <div key={d.label} className="rounded-lg bg-white/[0.04] px-3 py-2.5 text-center">
                    <div className="text-[10px] text-white/40">{d.label}</div>
                    <div className={`mt-0.5 font-mono text-sm font-semibold ${d.color}`}>{d.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* sparkline chart: actual vs simulated booked */}
            {(() => {
              const weeks = replayResult.weeks;
              const chartW = 900;
              const chartH = 140;
              const pad = { l: 45, r: 15, t: 15, b: 25 };
              const innerW = chartW - pad.l - pad.r;
              const innerH = chartH - pad.t - pad.b;
              const maxBooked = Math.max(
                ...weeks.map((w) => Math.max(w.actual.booked, w.simulated.booked)),
                1,
              );
              const toX = (i: number) => pad.l + (i / Math.max(weeks.length - 1, 1)) * innerW;
              const toY = (v: number) => pad.t + innerH - (v / maxBooked) * innerH;

              const actualPath = weeks.map((w, i) => `${toX(i)},${toY(w.actual.booked)}`).join(" ");
              const simPath = weeks.map((w, i) => `${toX(i)},${toY(w.simulated.booked)}`).join(" ");

              return (
                <div className={`${glassInner} p-3`}>
                  <div className="mb-2 flex items-center gap-4 text-[10px] text-white/40">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-5 rounded-full bg-white/50" /> Actual booked
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-5 rounded-full bg-indigo-400" /> Simulated
                    </span>
                    <span className="ml-auto">
                      {replayResult.targetGrid} {replayResult.bpsChange > 0 ? "+" : ""}{replayResult.bpsChange}bps
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
                    {/* gridlines */}
                    {Array.from({ length: 4 }, (_, i) => {
                      const val = (maxBooked / 3) * i;
                      return (
                        <g key={i}>
                          <line x1={pad.l} y1={toY(val)} x2={chartW - pad.r} y2={toY(val)}
                            stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                          <text x={pad.l - 5} y={toY(val) + 3} textAnchor="end" className="fill-white/25" fontSize={8}>
                            {Math.round(val)}
                          </text>
                        </g>
                      );
                    })}
                    {/* x labels */}
                    {weeks.map((w, i) => {
                      if (weeks.length > 20 && i % 4 !== 0) return null;
                      if (weeks.length > 10 && weeks.length <= 20 && i % 2 !== 0) return null;
                      return (
                        <text key={w.date} x={toX(i)} y={chartH - 3} textAnchor="middle" className="fill-white/20" fontSize={7}>
                          {w.date.slice(5)}
                        </text>
                      );
                    })}
                    {/* active highlight bands */}
                    {weeks.map((w, i) => {
                      if (!w.wasActive) return null;
                      const x = toX(i) - (innerW / weeks.length) / 2;
                      const width = innerW / weeks.length;
                      return (
                        <rect key={`hl-${i}`} x={x} y={pad.t} width={width} height={innerH}
                          fill="rgba(99,102,241,0.04)" />
                      );
                    })}
                    {/* actual line */}
                    <polyline points={actualPath} fill="none" stroke="rgba(255,255,255,0.45)"
                      strokeWidth={1.5} strokeLinejoin="round" />
                    {/* simulated line */}
                    <polyline points={simPath} fill="none" stroke="rgba(99,102,241,0.8)"
                      strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 2" />
                  </svg>
                </div>
              );
            })()}

            {/* week-by-week table */}
            <div className="overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-white/40">
                    <th className="pb-2 pr-2 font-medium">Week</th>
                    <th className="pb-2 pr-2 font-medium text-center">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 mr-1" />
                    </th>
                    <th className="pb-2 pr-2 font-medium">Apps</th>
                    <th className="pb-2 pr-2 font-medium">Sim apps</th>
                    <th className="pb-2 pr-2 font-medium">Approvals</th>
                    <th className="pb-2 pr-2 font-medium">Sim appr.</th>
                    <th className="pb-2 pr-2 font-medium">Booked</th>
                    <th className="pb-2 pr-2 font-medium">Sim book.</th>
                    <th className="pb-2 pr-2 font-medium">Δ booked</th>
                    <th className="pb-2 pr-2 font-medium">Conv</th>
                    <th className="pb-2 pr-2 font-medium">Sim conv</th>
                    <th className="pb-2 font-medium">Δ conv</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  {replayResult.weeks.map((w) => (
                    <tr
                      key={w.date}
                      className={`border-t ${w.wasActive ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.03]"}`}
                    >
                      <td className="py-1.5 pr-2 font-medium text-white/70">{w.date}</td>
                      <td className="py-1.5 pr-2 text-center">
                        {w.wasActive ? (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 font-mono">{w.actual.applications}</td>
                      <td className="py-1.5 pr-2 font-mono">{w.simulated.applications}</td>
                      <td className="py-1.5 pr-2 font-mono">{w.actual.approvals}</td>
                      <td className="py-1.5 pr-2 font-mono">{w.simulated.approvals}</td>
                      <td className="py-1.5 pr-2 font-mono">{w.actual.booked}</td>
                      <td className="py-1.5 pr-2 font-mono">{w.simulated.booked}</td>
                      <td className={`py-1.5 pr-2 font-mono ${w.delta.booked >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                        {w.delta.booked > 0 ? "+" : ""}{w.delta.booked}
                      </td>
                      <td className="py-1.5 pr-2 font-mono">
                        {(w.actual.conversionRate * 100).toFixed(1)}%
                      </td>
                      <td className="py-1.5 pr-2 font-mono">
                        {(w.simulated.conversionRate * 100).toFixed(1)}%
                      </td>
                      <td className={`py-1.5 font-mono ${w.delta.conversionPp >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                        {w.delta.conversionPp > 0 ? "+" : ""}{(w.delta.conversionPp * 100).toFixed(2)}pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-white/25 space-y-0.5">
              <div>
                <span className="text-white/40 font-medium">3-stage funnel model</span> — empirical elasticities (per 100bps WAC change):
              </div>
              <div className="flex gap-4">
                <span>Demand: {(replayResult.elasticities.appDemandElasticity * 100).toFixed(2)}% apps</span>
                <span>Approval: {(replayResult.elasticities.approvalElasticity * 100).toFixed(2)}pp rate</span>
                <span>Booking: {(replayResult.elasticities.bookingElasticity * 100).toFixed(2)}pp rate</span>
              </div>
              <div>
                Weeks where {replayResult.targetGrid} was active are highlighted. Simulation adjusts application volume,
                approval rate, and booking rate independently through the funnel.
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[12px] text-white/30">
            Select a grid and adjustment, then click &quot;Run replay&quot; to see actual vs. simulated performance.
          </p>
        )}
      </div>
    </main>
  );
}
