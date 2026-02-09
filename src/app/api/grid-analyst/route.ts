import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const OPENAI_MODEL = "gpt-4.1";

type GridRow = {
  Tier: string;
  Term: string;
  Fico: string;
  "Loan.Amount": string;
  Channel: string;
  Member: string;
  "Fixed.Rate": string;
};

type PerfRow = {
  Date: string;
  Grid: string;
  Applications: string;
  Approvals: string;
  Booked: string;
  APR: string;
};

type ExperimentRow = {
  "Experiment ID": string;
  Grid: string;
  "Experiment Start": string;
  "Experiment End": string;
};

type PopulationRow = {
  Tier: string;
  Income: string;
  Term: string;
  "Loan Purpose": string;
  FICO: string;
  Member: string;
  "Affiliate Channel": string;
  "Grid Assigned": string;
  "Loan Amount": string;
  "Rate Selected": string;
  WAC: string;
  Approved: string;
  Declined: string;
  "Conversion Rate": string;
  Converted?: string;
  "Doc Upload": string;
  "DS to Signed (days)": string;
};

type WacCohort = {
  ficoBand: "Low" | "Medium" | "High";
  tier: number;
  term: number;
  avgRate: number;
  loanPurpose: string;
  loanAmountBand: string;
};

type GridWac = {
  gridId: string;
  avgRate: number;
};

type GridConversion = {
  gridId: string;
  approved: number;
  converted: number;
  conversionRate: number;
};

type SimulationResult = {
  summary: string;
  deltas: {
    approvalRate: number;
    bookedPerWeek: number;
    avgApr: number;
    activeGrids: number;
  };
};

const DATA_DIR = path.join(process.cwd(), "data");
const GRIDS_DIR = path.join(DATA_DIR, "grids");
const PERF_PATH = path.join(DATA_DIR, "performance", "performance.csv");
const EXPERIMENT_PATH = path.join(
  DATA_DIR,
  "experiments",
  "experiment_schedule.csv",
);
const POPULATION_PATH = path.join(
  DATA_DIR,
  "population",
  "population_2025.csv",
);

function parseCsv<T extends Record<string, string>>(content: string): T[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row as T;
  });
}

function readGrid(gridId: string): GridRow[] {
  const filePath = path.join(GRIDS_DIR, `${gridId}.csv`);
  const content = fs.readFileSync(filePath, "utf8");
  return parseCsv<GridRow>(content);
}

function readPerf(): PerfRow[] {
  if (!fs.existsSync(PERF_PATH)) return [];
  const content = fs.readFileSync(PERF_PATH, "utf8");
  return parseCsv<PerfRow>(content);
}

function readExperiments(): ExperimentRow[] {
  if (!fs.existsSync(EXPERIMENT_PATH)) return [];
  const content = fs.readFileSync(EXPERIMENT_PATH, "utf8");
  return parseCsv<ExperimentRow>(content);
}

function readPopulation(): PopulationRow[] {
  if (!fs.existsSync(POPULATION_PATH)) return [];
  const content = fs.readFileSync(POPULATION_PATH, "utf8");
  return parseCsv<PopulationRow>(content);
}

function makeKey(row: GridRow): string {
  return [
    row.Tier,
    row.Term,
    row.Fico,
    row["Loan.Amount"],
    row.Channel,
    row.Member,
  ].join("|");
}

function formatBps(value: number): string {
  const bps = Math.round(value * 100) / 100;
  const normalized = Object.is(bps, -0) ? 0 : bps;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)} bps`;
}

function formatPct(value: number): string {
  const pct = Math.round(value * 10000) / 100;
  const normalized = Object.is(pct, -0) ? 0 : pct;
  return `${normalized.toFixed(2)}%`;
}

function formatPp(value: number): string {
  const pp = Math.round(value * 10000) / 100;
  const normalized = Object.is(pp, -0) ? 0 : pp;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)} pp`;
}

function parseIsoDate(value: string): number {
  const [year, month, day] = value.split("-").map((v) => Number(v));
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

function ficoBand(ficoRange: string): "Low" | "Medium" | "High" {
  const parts = ficoRange.split("-").map((v) => Number(v));
  const hi = parts[1] ?? parts[0] ?? 0;
  if (hi <= 659) return "Low";
  if (hi <= 739) return "Medium";
  return "High";
}

function readAllGridRows(): GridRow[] {
  const entries = fs.readdirSync(GRIDS_DIR);
  const gridFiles = entries.filter((file) => file.endsWith(".csv"));
  return gridFiles.flatMap((file) => {
    const gridId = file.replace(".csv", "");
    return readGrid(gridId);
  });
}

function loanAmountBand(amount: number): string {
  if (amount < 10000) return "<10k";
  if (amount < 20000) return "10k-20k";
  if (amount < 35000) return "20k-35k";
  if (amount < 50000) return "35k-50k";
  return "50k+";
}

function computeWacCohorts(gridIds: string[] | null): WacCohort[] {
  const popRows = readPopulation();
  const targetGrids =
    gridIds && gridIds.length
      ? new Set(gridIds)
      : null;

  const groups = new Map<
    string,
    {
      band: WacCohort["ficoBand"];
      tier: number;
      term: number;
      loanPurpose: string;
      loanAmountBand: string;
      sumRate: number;
      count: number;
    }
  >();

  popRows.forEach((row) => {
    const gridAssigned = row["Grid Assigned"];
    if (targetGrids && !targetGrids.has(gridAssigned)) return;
    const rate = Number(row.WAC);
    if (!rate || isNaN(rate)) return;
    const fico = Number(row.FICO);
    const band: WacCohort["ficoBand"] =
      fico <= 659 ? "Low" : fico <= 739 ? "Medium" : "High";
    const tier = Number(row.Tier);
    const term = Number(row.Term);
    const purpose = row["Loan Purpose"] || "Unknown";
    const amtBand = loanAmountBand(Number(row["Loan Amount"]) || 0);
    const key = `${band}|${tier}|${term}|${purpose}|${amtBand}`;
    const entry = groups.get(key) ?? {
      band,
      tier,
      term,
      loanPurpose: purpose,
      loanAmountBand: amtBand,
      sumRate: 0,
      count: 0,
    };
    entry.sumRate += rate;
    entry.count += 1;
    groups.set(key, entry);
  });

  return Array.from(groups.values()).map((entry) => ({
    ficoBand: entry.band,
    tier: entry.tier,
    term: entry.term,
    loanPurpose: entry.loanPurpose,
    loanAmountBand: entry.loanAmountBand,
    avgRate: entry.sumRate / entry.count,
  }));
}

function computeGridWac(): GridWac[] {
  const popRows = readPopulation();
  const byGrid = new Map<string, { sumWac: number; count: number }>();

  popRows.forEach((row) => {
    const gridId = row["Grid Assigned"];
    const wac = Number(row.WAC);
    if (!gridId || !wac || isNaN(wac)) return;
    const prev = byGrid.get(gridId) ?? { sumWac: 0, count: 0 };
    prev.sumWac += wac;
    prev.count += 1;
    byGrid.set(gridId, prev);
  });

  return Array.from(byGrid.entries()).map(([gridId, { sumWac, count }]) => ({
    gridId,
    avgRate: sumWac / count,
  }));
}

function computeGridConversion(): GridConversion[] {
  const rows = readPopulation();
  const byGrid = new Map<string, { approved: number; converted: number }>();

  rows.forEach((row) => {
    const gridId = row["Grid Assigned"];
    const approved = Number(row.Approved) || 0;
    const converted =
      row.Converted !== undefined
        ? Number(row.Converted) || 0
        : row["DS to Signed (days)"]
          ? 1
          : 0;
    const entry = byGrid.get(gridId) ?? { approved: 0, converted: 0 };
    entry.approved += approved;
    entry.converted += converted;
    byGrid.set(gridId, entry);
  });

  return Array.from(byGrid.entries()).map(([gridId, entry]) => ({
    gridId,
    approved: entry.approved,
    converted: entry.converted,
    conversionRate: entry.approved ? entry.converted / entry.approved : 0,
  }));
}

/* ── what-if simulation engine ─────────────────────────────────────── */

type WhatIfScenario = {
  targetGrid: string;
  bpsChange: number;         // e.g. +100 means raise rates by 100bps
  direction: "increase" | "decrease";
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
    conversionPp: number;     // percentage-point change
    convertedDelta: number;   // absolute change in converted count
  };
  elasticity: number;         // conversion drop per 100bps increase
};

/**
 * Parse a natural-language question for what-if pricing scenarios.
 * Returns null if the question isn't a what-if.
 */
function parseWhatIfQuestion(question: string): WhatIfScenario | null {
  // Match patterns like "increase grid AA by 100bps", "raise AA by 50 bps",
  // "decrease AB rates by 25 basis points", "what if AA went up 100bps"
  const patterns = [
    /(?:increase|raise|bump|hike|add)\s+(?:grid\s+)?(\w{2})\s+(?:by\s+)?(\d+)\s*(?:bps|basis\s*points?)/i,
    /(?:decrease|lower|reduce|cut|drop)\s+(?:grid\s+)?(\w{2})\s+(?:by\s+)?(\d+)\s*(?:bps|basis\s*points?)/i,
    /(?:what\s+(?:would|if|happens?))\s+.*?(?:increase|raise|bump|hike|add)\s+.*?(?:grid\s+)?(\w{2})\s+(?:by\s+)?(\d+)\s*(?:bps|basis\s*points?)/i,
    /(?:what\s+(?:would|if|happens?))\s+.*?(?:decrease|lower|reduce|cut|drop)\s+.*?(?:grid\s+)?(\w{2})\s+(?:by\s+)?(\d+)\s*(?:bps|basis\s*points?)/i,
    /(\w{2})\s+(?:up|increased?|raised?)\s+(?:by\s+)?(\d+)\s*(?:bps|basis\s*points?)/i,
    /(\w{2})\s+(?:down|decreased?|lowered?|reduced?)\s+(?:by\s+)?(\d+)\s*(?:bps|basis\s*points?)/i,
  ];

  for (const pat of patterns) {
    const match = question.match(pat);
    if (match) {
      const grid = match[1].toUpperCase();
      const bps = parseInt(match[2], 10);
      const isDecrease = /decrease|lower|reduce|cut|drop|down/i.test(question);
      return {
        targetGrid: grid,
        bpsChange: isDecrease ? -bps : bps,
        direction: isDecrease ? "decrease" : "increase",
      };
    }
  }
  return null;
}

/**
 * Run a what-if simulation using the population data.
 * Uses a 3-stage funnel model (apps → approvals → booked) with
 * empirical elasticities derived per-stage from cross-grid variation.
 */
function runWhatIfSimulation(scenario: WhatIfScenario): WhatIfResult | null {
  const popRows = readPopulation();
  const targetRows = popRows.filter(
    (r) => r["Grid Assigned"] === scenario.targetGrid,
  );
  if (targetRows.length === 0) return null;

  // Baseline stats for the target grid
  let totalApplicants = targetRows.length;
  let totalApproved = 0;
  let totalConverted = 0;
  let sumWac = 0;
  let wacCount = 0;

  targetRows.forEach((r) => {
    const approved = Number(r.Approved) || 0;
    const converted =
      r.Converted !== undefined ? Number(r.Converted) || 0 : r["DS to Signed (days)"] ? 1 : 0;
    totalApproved += approved;
    totalConverted += converted;
    const wac = Number(r.WAC);
    if (wac && !isNaN(wac)) {
      sumWac += wac;
      wacCount++;
    }
  });

  const baselineWac = wacCount > 0 ? sumWac / wacCount : 0;
  const baselineApprovalRate = totalApplicants > 0 ? totalApproved / totalApplicants : 0;
  const baselineBookingRate = totalApproved > 0 ? totalConverted / totalApproved : 0;
  const baselineConversion = totalApplicants > 0 ? totalConverted / totalApplicants : 0;

  // Compute multi-stage elasticities from all grids (same priors as replay)
  const gridMetrics = computeGridFunnelMetrics();

  const approvalElasticity = fitNegativeElasticity(
    gridMetrics.map((g) => ({ wac: g.avgWac, metric: g.approvalRate })),
    -0.025,
  );
  const bookingElasticity = fitNegativeElasticity(
    gridMetrics.map((g) => ({ wac: g.avgWac, metric: g.bookingRate })),
    -0.04,
  );
  const avgApplicants = gridMetrics.reduce((s, g) => s + g.totalApplicants, 0) / (gridMetrics.length || 1);
  const demandElasticity = fitNegativeElasticity(
    gridMetrics.map((g) => ({ wac: g.avgWac, metric: g.totalApplicants / avgApplicants })),
    -0.015,
  );

  const bpsFactor = scenario.bpsChange / 100; // number of 100bps units
  const bpsDecimal = scenario.bpsChange / 10000;

  // Project through funnel
  const projectedWac = baselineWac + bpsDecimal;
  const projectedApps = Math.max(1, Math.round(totalApplicants * (1 + demandElasticity * bpsFactor)));
  const projectedApprovalRate = Math.max(0, Math.min(1, baselineApprovalRate + approvalElasticity * bpsFactor));
  const projectedApproved = Math.round(projectedApps * projectedApprovalRate);
  const projectedBookingRate = Math.max(0, Math.min(1, baselineBookingRate + bookingElasticity * bpsFactor));
  const projectedConverted = Math.round(projectedApproved * projectedBookingRate);
  const projectedConversion = projectedApps > 0 ? projectedConverted / projectedApps : 0;

  // Combined elasticity (end-to-end conversion change per 100bps)
  const combinedElasticity = bpsFactor !== 0 ? (projectedConversion - baselineConversion) / bpsFactor : 0;

  const scenarioLabel = `${scenario.direction === "increase" ? "Increase" : "Decrease"} grid ${scenario.targetGrid} by ${Math.abs(scenario.bpsChange)}bps`;

  return {
    scenario: scenarioLabel,
    targetGrid: scenario.targetGrid,
    bpsChange: scenario.bpsChange,
    baseline: {
      avgWac: baselineWac,
      conversionRate: baselineConversion,
      totalApplicants,
      totalConverted,
    },
    projected: {
      avgWac: projectedWac,
      conversionRate: projectedConversion,
      totalConverted: projectedConverted,
    },
    delta: {
      wacBps: scenario.bpsChange,
      conversionPp: projectedConversion - baselineConversion,
      convertedDelta: projectedConverted - totalConverted,
    },
    elasticity: combinedElasticity,
  };
}

/* ── historical replay simulation ──────────────────────────────────── */

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

/**
 * Compute per-grid funnel metrics from population data.
 * Returns a map of gridId → { avgWac, approvalRate, bookingRate, demandIndex }
 */
function computeGridFunnelMetrics() {
  const popRows = readPopulation();
  const byGrid = new Map<
    string,
    { sumWac: number; wacN: number; total: number; approved: number; converted: number }
  >();

  popRows.forEach((r) => {
    const gid = r["Grid Assigned"];
    const entry = byGrid.get(gid) ?? { sumWac: 0, wacN: 0, total: 0, approved: 0, converted: 0 };
    entry.total++;
    const wac = Number(r.WAC);
    if (wac && !isNaN(wac)) { entry.sumWac += wac; entry.wacN++; }
    entry.approved += Number(r.Approved) || 0;
    entry.converted += r.Converted !== undefined
      ? Number(r.Converted) || 0
      : r["DS to Signed (days)"] ? 1 : 0;
    byGrid.set(gid, entry);
  });

  return Array.from(byGrid.entries())
    .filter(([, v]) => v.wacN > 0 && v.total > 0)
    .map(([gridId, v]) => ({
      gridId,
      avgWac: v.sumWac / v.wacN,
      approvalRate: v.approved / v.total,           // apps → approvals
      bookingRate: v.approved > 0 ? v.converted / v.approved : 0, // approvals → booked
      totalApplicants: v.total,
    }));
}

/**
 * Bayesian-blended negative elasticity estimator.
 *
 * Fits an OLS regression from the observed data, computes R² to gauge
 * signal quality, then blends the empirical slope with an economically-
 * informed prior.  When data is noisy (low R²) the prior dominates;
 * when data is clean (high R²) the empirical estimate dominates.
 *
 * The result is always negative (higher WAC → lower metric), expressed
 * as a change per 100bps of WAC.
 */
function fitNegativeElasticity(
  points: { wac: number; metric: number }[],
  prior: number, // economically-informed prior (negative, per 100bps)
): number {
  if (points.length < 3) return prior;

  const n = points.length;
  const sx = points.reduce((s, p) => s + p.wac, 0);
  const sy = points.reduce((s, p) => s + p.metric, 0);
  const meanX = sx / n;
  const meanY = sy / n;
  const sxy = points.reduce((s, p) => s + p.wac * p.metric, 0);
  const sx2 = points.reduce((s, p) => s + p.wac * p.wac, 0);
  const sy2 = points.reduce((s, p) => s + p.metric * p.metric, 0);
  const denom = n * sx2 - sx * sx;
  if (Math.abs(denom) < 1e-12) return prior;

  const rawSlope = (n * sxy - sx * sy) / denom;
  const empiricalPer100bps = -Math.abs(rawSlope * 0.01); // enforce negative

  // Compute R² to measure how well WAC explains variation in the metric
  const ssTot = sy2 - n * meanY * meanY;
  const ssRes = points.reduce((s, p) => {
    const pred = meanY + rawSlope * (p.wac - meanX);
    return s + (p.metric - pred) ** 2;
  }, 0);
  const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  // Blend: weight = R² clamped to [0, 0.9] so prior always has some influence
  const dataWeight = Math.min(r2, 0.9);
  const blended = dataWeight * empiricalPer100bps + (1 - dataWeight) * prior;

  // Floor: result can't be weaker than 40% of the prior magnitude
  const minMagnitude = Math.abs(prior) * 0.4;
  return -Math.max(Math.abs(blended), minMagnitude);
}

function runHistoricalReplay(targetGrid: string, bpsChange: number): ReplayResult {
  const perfRows = readPerf();
  const experiments = readExperiments();
  const experimentWindows = experiments.map((row) => ({
    grid: row.Grid,
    start: parseIsoDate(row["Experiment Start"]),
    end: parseIsoDate(row["Experiment End"]),
  }));

  // ── Compute multi-stage elasticities from population data ──
  const gridMetrics = computeGridFunnelMetrics();

  // Economically-informed priors for consumer lending:
  // 100bps is meaningful — a 200bps cut should visibly boost every funnel stage.

  // 1) Approval elasticity: WAC → approval rate (apps→approvals)
  //    Prior: -2.5pp per +100bps  (tighter pricing → tighter credit box)
  const approvalElasticity = fitNegativeElasticity(
    gridMetrics.map((g) => ({ wac: g.avgWac, metric: g.approvalRate })),
    -0.025,
  );

  // 2) Booking elasticity: WAC → booking rate (approvals→booked)
  //    Prior: -4.0pp per +100bps  (biggest price sensitivity stage — borrowers shop)
  const bookingElasticity = fitNegativeElasticity(
    gridMetrics.map((g) => ({ wac: g.avgWac, metric: g.bookingRate })),
    -0.04,
  );

  // 3) Demand elasticity: WAC → application volume (normalized)
  //    Prior: -1.5% apps per +100bps  (higher advertised rates → fewer leads)
  const avgApplicants = gridMetrics.reduce((s, g) => s + g.totalApplicants, 0) / (gridMetrics.length || 1);
  const demandElasticity = fitNegativeElasticity(
    gridMetrics.map((g) => ({ wac: g.avgWac, metric: g.totalApplicants / avgApplicants })),
    -0.015,
  );

  const bpsFactor = bpsChange / 100; // number of 100bps units
  const aprDelta = bpsChange / 10000;

  // ── Group performance by date ──
  const toNums = (r: PerfRow) => ({
    date: r.Date,
    applications: Number(r.Applications),
    approvals: Number(r.Approvals),
    booked: Number(r.Booked),
    apr: Number(r.APR),
    grid: r.Grid,
  });

  const byDate = new Map<string, ReturnType<typeof toNums>[]>();
  perfRows.forEach((row) => {
    const entry = toNums(row);
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  });

  const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));

  const weeks: ReplayWeek[] = dates.map((dateKey) => {
    const dateValue = parseIsoDate(dateKey);
    const activeFromSchedule = experimentWindows
      .filter((w) => dateValue >= w.start && dateValue <= w.end)
      .map((w) => w.grid);
    const activeGrids = activeFromSchedule.length ? Array.from(new Set(activeFromSchedule)) : [];
    const wasActive = activeGrids.includes(targetGrid);

    const entries = byDate.get(dateKey) ?? [];

    // Separate target grid entries from the rest
    const targetEntries = entries.filter((e) => e.grid === targetGrid);
    const otherEntries = entries.filter((e) => e.grid !== targetGrid);

    // Actual totals
    const totalApps = entries.reduce((s, e) => s + e.applications, 0);
    const totalApprovals = entries.reduce((s, e) => s + e.approvals, 0);
    const totalBooked = entries.reduce((s, e) => s + e.booked, 0);
    const aprWeight = entries.reduce((s, e) => s + e.apr * e.booked, 0);
    const avgApr = totalBooked ? aprWeight / totalBooked : 0;
    const actualConversion = totalApps ? totalBooked / totalApps : 0;

    // Other grids stay unchanged
    const otherApps = otherEntries.reduce((s, e) => s + e.applications, 0);
    const otherApprovals = otherEntries.reduce((s, e) => s + e.approvals, 0);
    const otherBooked = otherEntries.reduce((s, e) => s + e.booked, 0);
    const otherAprW = otherEntries.reduce((s, e) => s + e.apr * e.booked, 0);

    // Target grid actual
    const tApps = targetEntries.reduce((s, e) => s + e.applications, 0);
    const tApprovals = targetEntries.reduce((s, e) => s + e.approvals, 0);
    const tBooked = targetEntries.reduce((s, e) => s + e.booked, 0);
    const tAprW = targetEntries.reduce((s, e) => s + e.apr * e.booked, 0);

    if (!wasActive || tApps === 0) {
      // Grid not active this week — pass through unchanged
      return {
        date: dateKey,
        actual: { applications: totalApps, approvals: totalApprovals, booked: totalBooked, apr: avgApr, conversionRate: actualConversion },
        simulated: { applications: totalApps, approvals: totalApprovals, booked: totalBooked, apr: avgApr, conversionRate: actualConversion },
        delta: { approvals: 0, booked: 0, conversionPp: 0, aprBps: 0 },
        activeGrids,
        wasActive,
      };
    }

    // ── Simulate target grid with 3-stage funnel ──

    // Stage 1: Demand — application volume changes with pricing
    //   demandElasticity is per normalized unit; scale to % change
    const demandMultiplier = 1 + demandElasticity * bpsFactor;
    const simTargetApps = Math.max(1, Math.round(tApps * demandMultiplier));

    // Stage 2: Approval rate shifts
    const baseApprovalRate = tApps > 0 ? tApprovals / tApps : 0;
    const simApprovalRate = Math.max(0, Math.min(1, baseApprovalRate + approvalElasticity * bpsFactor));
    const simTargetApprovals = Math.round(simTargetApps * simApprovalRate);

    // Stage 3: Booking rate (approved → booked) shifts
    const baseBookingRate = tApprovals > 0 ? tBooked / tApprovals : 0;
    const simBookingRate = Math.max(0, Math.min(1, baseBookingRate + bookingElasticity * bpsFactor));
    const simTargetBooked = Math.round(simTargetApprovals * simBookingRate);

    // APR shift
    const tAvgApr = tBooked > 0 ? tAprW / tBooked : avgApr;
    const simTargetApr = tAvgApr + aprDelta;
    const simTargetAprW = simTargetApr * simTargetBooked;

    // Combine with other grids (unchanged)
    const simApps = otherApps + simTargetApps;
    const simApprovals = otherApprovals + simTargetApprovals;
    const simBooked = otherBooked + simTargetBooked;
    const simAprW = otherAprW + simTargetAprW;
    const simAvgApr = simBooked > 0 ? simAprW / simBooked : avgApr;
    const simConversion = simApps > 0 ? simBooked / simApps : 0;

    return {
      date: dateKey,
      actual: {
        applications: totalApps,
        approvals: totalApprovals,
        booked: totalBooked,
        apr: avgApr,
        conversionRate: actualConversion,
      },
      simulated: {
        applications: simApps,
        approvals: simApprovals,
        booked: simBooked,
        apr: simAvgApr,
        conversionRate: simConversion,
      },
      delta: {
        approvals: simApprovals - totalApprovals,
        booked: simBooked - totalBooked,
        conversionPp: simConversion - actualConversion,
        aprBps: Math.round((simAvgApr - avgApr) * 10000),
      },
      activeGrids,
      wasActive,
    };
  });

  const actualBooked = weeks.reduce((s, w) => s + w.actual.booked, 0);
  const simulatedBooked = weeks.reduce((s, w) => s + w.simulated.booked, 0);
  const actualTotalApprovals = weeks.reduce((s, w) => s + w.actual.approvals, 0);
  const simulatedTotalApprovals = weeks.reduce((s, w) => s + w.simulated.approvals, 0);
  const activeWeeks = weeks.filter((w) => w.wasActive);
  const actualAvgConv = activeWeeks.length
    ? activeWeeks.reduce((s, w) => s + w.actual.conversionRate, 0) / activeWeeks.length
    : 0;
  const simAvgConv = activeWeeks.length
    ? activeWeeks.reduce((s, w) => s + w.simulated.conversionRate, 0) / activeWeeks.length
    : 0;

  return {
    targetGrid,
    bpsChange,
    elasticities: { approvalElasticity, bookingElasticity, appDemandElasticity: demandElasticity },
    weeks,
    totals: {
      actualBooked,
      simulatedBooked,
      bookedDelta: simulatedBooked - actualBooked,
      actualAvgConversion: actualAvgConv,
      simulatedAvgConversion: simAvgConv,
      conversionDeltaPp: simAvgConv - actualAvgConv,
      actualTotalApprovals,
      simulatedTotalApprovals,
    },
  };
}

function analyzePerformancePortfolio(simulateHighWac = false) {
  const rows = readPerf();
  const experiments = readExperiments();
  const experimentWindows = experiments.map((row) => ({
    grid: row.Grid,
    start: parseIsoDate(row["Experiment Start"]),
    end: parseIsoDate(row["Experiment End"]),
  }));

  const toNums = (r: PerfRow) => ({
    date: r.Date,
    applications: Number(r.Applications),
    approvals: Number(r.Approvals),
    booked: Number(r.Booked),
    apr: Number(r.APR),
    grid: r.Grid,
  });

  const byDate = new Map<string, ReturnType<typeof toNums>[]>();
  rows.forEach((row) => {
    const entry = toNums(row);
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  });

  const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  const series = dates.map((dateKey) => {
    const dateValue = parseIsoDate(dateKey);
    const activeFromSchedule = experimentWindows
      .filter((window) => dateValue >= window.start && dateValue <= window.end)
      .map((window) => window.grid);
    const activeGrids = activeFromSchedule.length
      ? Array.from(new Set(activeFromSchedule))
      : [];

    const baseEntries = byDate.get(dateKey) ?? [];
    let entries = baseEntries.filter((entry) =>
      activeGrids.length ? activeGrids.includes(entry.grid) : true,
    );
    if (activeGrids.length && entries.length === 0) {
      entries = baseEntries;
    }
    const applications = entries.reduce((sum, e) => sum + e.applications, 0);
    const approvals = entries.reduce((sum, e) => sum + e.approvals, 0);
    const booked = entries.reduce((sum, e) => sum + e.booked, 0);
    const aprWeight = entries.reduce((sum, e) => sum + e.apr * e.booked, 0);
    const avgApr = booked ? aprWeight / booked : 0;
    const approvalRate = applications ? approvals / applications : 0;
    const bookedRate = approvals ? booked / approvals : 0;
    return {
      date: dateKey,
      approvalRate,
      bookedRate,
      avgApr,
      applications,
      approvals,
      booked,
      activeGrids: activeGrids.length ? activeGrids : entries.map((e) => e.grid),
    };
  });

  const avg = (vals: number[]) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0);
  const avgApproval = avg(series.map((s) => s.approvalRate));
  const avgBooked = avg(series.map((s) => s.booked));
  const avgApr = avg(series.map((s) => s.avgApr));
  const avgActive = avg(series.map((s) => s.activeGrids.length));

  const summary = [
    `Across ${series[0]?.date ?? "the period"}${
      series.length > 1 ? ` to ${series[series.length - 1].date}` : ""
    }, portfolio results:`,
    `avg approval rate ${formatPct(avgApproval)}.`,
    `avg booked ${Math.round(avgBooked)} per week.`,
    `avg APR ${(avgApr * 100).toFixed(2)}%.`,
    `avg active grids ${avgActive.toFixed(1)}.`,
  ].join(" ");

  const peakApproval = Math.max(...series.map((s) => s.approvalRate));
  const peakBooked = Math.max(...series.map((s) => s.booked));
  const highlights = [
    `Peak approval rate: ${formatPct(peakApproval)}.`,
    `Peak booked volume: ${Math.round(peakBooked)} apps.`,
  ];

  let simulation: SimulationResult | null = null;
  if (simulateHighWac && series.length) {
    const latestDate = series[series.length - 1].date;
    const latestValue = parseIsoDate(latestDate);
    const latestWindow = experimentWindows
      .filter((window) => latestValue >= window.start && latestValue <= window.end)
      .reduce(
        (acc, cur) =>
          acc && acc.end >= cur.end ? acc : cur,
        null as null | { grid: string; start: number; end: number },
      );

    const simulatedSeries = series.map((point) => {
      if (!latestWindow) return point;
      const dateValue = parseIsoDate(point.date);
      if (dateValue < latestWindow.start || dateValue > latestWindow.end) {
        return point;
      }

      const gridCount = point.activeGrids.length || 1;
      const avgAppsPerGrid = point.applications / gridCount;
      const simulatedApps = Math.max(150, Math.round(avgAppsPerGrid * 0.6));
      const simulatedApprovalRate = point.approvalRate * 0.85;
      const simulatedBookedRate = point.bookedRate * 0.9;
      const simulatedApprovals = Math.round(simulatedApps * simulatedApprovalRate);
      const simulatedBooked = Math.round(simulatedApprovals * simulatedBookedRate);
      const simulatedApr = point.avgApr + 0.012;

      const applications = point.applications + simulatedApps;
      const approvals = point.approvals + simulatedApprovals;
      const booked = point.booked + simulatedBooked;
      const approvalRate = applications ? approvals / applications : 0;
      const bookedRate = approvals ? booked / approvals : 0;
      const aprWeight =
        point.avgApr * point.booked + simulatedApr * simulatedBooked;
      const avgApr = booked ? aprWeight / booked : point.avgApr;

      return {
        ...point,
        applications,
        approvals,
        booked,
        approvalRate,
        bookedRate,
        avgApr,
        activeGrids: [...point.activeGrids, "HX"],
      };
    });

    const simAvg = (vals: number[]) =>
      vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const simApproval = simAvg(simulatedSeries.map((s) => s.approvalRate));
    const simBooked = simAvg(simulatedSeries.map((s) => s.booked));
    const simApr = simAvg(simulatedSeries.map((s) => s.avgApr));
    const simActive = simAvg(simulatedSeries.map((s) => s.activeGrids.length));

    simulation = {
      summary: [
        `Simulation adds high-WAC grid HX to the current experiment window.`,
        `Approval rate ${formatPct(simApproval)}, avg booked ${Math.round(simBooked)} per week, avg APR ${(simApr * 100).toFixed(2)}%, avg active grids ${simActive.toFixed(1)}.`,
      ].join(" "),
      deltas: {
        approvalRate: simApproval - avgApproval,
        bookedPerWeek: simBooked - avgBooked,
        avgApr: simApr - avgApr,
        activeGrids: simActive - avgActive,
      },
    };
  }

  return { summary, highlights, series, simulation };
}

async function generateAiSummary(input: {
  question: string;
  portfolioSummary: string;
  wacHighlights: string;
  performanceSummary: string | null;
  gridWacSummary: string;
  gridConversionSummary: string;
  simulationSummary: string | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = [
    "=== DATA (use ONLY these numbers, never invent values) ===",
    "",
    `QUESTION: ${input.question}`,
    "",
    `PORTFOLIO SUMMARY: ${input.portfolioSummary}`,
    "",
    `TOP WAC COHORTS: ${input.wacHighlights}`,
    "",
    `PER-GRID WAC: ${input.gridWacSummary}`,
    "",
    `PER-GRID CONVERSION: ${input.gridConversionSummary}`,
    "",
    `SIMULATION / WHAT-IF: ${input.simulationSummary ?? "No simulation requested."}`,
    "",
    `PERFORMANCE OVER TIME: ${input.performanceSummary ?? "Not requested."}`,
    "",
    "=== INSTRUCTIONS ===",
    "1. Answer the QUESTION using ONLY the data above. Quote exact numbers.",
    "2. If a what-if/simulation was run, explain the projected impact clearly:",
    "   - State the baseline metric, the projected metric, and the delta.",
    "   - Explain the economic intuition (lower price → higher conversion, higher price → lower conversion).",
    "3. Do NOT round or approximate numbers that are already provided — copy them exactly.",
    "4. Keep the response to 4-8 sentences. Be specific and analytical.",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a senior pricing analytics assistant at a consumer lending company. You write precise, data-driven summaries. You NEVER fabricate numbers — you only reference the exact figures provided in the data context. When discussing rate changes, you understand that higher pricing (WAC) reduces conversion and lower pricing increases conversion.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 400,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question : "";
  const wantsPerformance = /performance|over time|trend|approval|booked|apr|conversion|portfolio/i.test(
    question,
  );

  const selectedGrids = Array.isArray(body?.selectedGrids)
    ? body.selectedGrids.filter((id: unknown) => typeof id === "string")
    : null;
  const wacCohorts = computeWacCohorts(selectedGrids);
  const simulateHighWac = Boolean(body?.simulateHighWac);
  const performance = wantsPerformance ? analyzePerformancePortfolio(simulateHighWac) : null;
  const gridWac = computeGridWac();
  const gridConversion = computeGridConversion();
  const sortedGridWac = [...gridWac].sort((a, b) => b.avgRate - a.avgRate);
  const gridWacSummary = sortedGridWac.length
    ? `Grid WAC (from population data): ${sortedGridWac.map((g) => `${g.gridId}=${(g.avgRate * 100).toFixed(2)}%`).join(", ")}. Highest: ${sortedGridWac[0].gridId} (${(sortedGridWac[0].avgRate * 100).toFixed(2)}%). Lowest: ${sortedGridWac[sortedGridWac.length - 1].gridId} (${(sortedGridWac[sortedGridWac.length - 1].avgRate * 100).toFixed(2)}%).`
    : "No grid WAC data available.";
  const sortedConversion = [...gridConversion].sort(
    (a, b) => b.conversionRate - a.conversionRate,
  );
  const gridConversionSummary = sortedConversion.length
    ? `All grid conversions: ${sortedConversion.map((g) => `${g.gridId}=${(g.conversionRate * 100).toFixed(2)}% (${g.converted}/${g.approved})`).join(", ")}.`
    : "No conversion data available.";
  const wacHighlights = wacCohorts
    .sort((a, b) => b.avgRate - a.avgRate)
    .slice(0, 5)
    .map(
      (cell) =>
        `${cell.ficoBand} FICO, Tier ${cell.tier}, Term ${cell.term}: ${(cell.avgRate * 100).toFixed(2)}%`,
    )
    .join("; ");

  // What-if simulation
  const whatIfScenario = parseWhatIfQuestion(question);
  const whatIfResult = whatIfScenario ? runWhatIfSimulation(whatIfScenario) : null;

  // Historical replay
  const replayGrid = typeof body?.replayGrid === "string" ? body.replayGrid : null;
  const replayBps = typeof body?.replayBps === "number" ? body.replayBps : null;
  const replay = replayGrid && replayBps !== null ? runHistoricalReplay(replayGrid, replayBps) : null;

  let whatIfSummary = "";
  if (whatIfResult) {
    whatIfSummary = [
      `WHAT-IF SIMULATION RESULTS for "${whatIfResult.scenario}":`,
      `Target grid: ${whatIfResult.targetGrid}`,
      `Baseline WAC: ${(whatIfResult.baseline.avgWac * 100).toFixed(2)}%, Projected WAC: ${(whatIfResult.projected.avgWac * 100).toFixed(2)}% (${whatIfResult.bpsChange > 0 ? "+" : ""}${whatIfResult.bpsChange}bps)`,
      `Baseline conversion: ${(whatIfResult.baseline.conversionRate * 100).toFixed(2)}% (${whatIfResult.baseline.totalConverted} converted out of ${whatIfResult.baseline.totalApplicants} applicants)`,
      `Projected conversion: ${(whatIfResult.projected.conversionRate * 100).toFixed(2)}% (${whatIfResult.projected.totalConverted} projected conversions)`,
      `Conversion impact: ${whatIfResult.delta.conversionPp > 0 ? "+" : ""}${(whatIfResult.delta.conversionPp * 100).toFixed(2)} pp (${whatIfResult.delta.convertedDelta > 0 ? "+" : ""}${whatIfResult.delta.convertedDelta} conversions)`,
      `Combined elasticity: ${(whatIfResult.elasticity * 100).toFixed(3)} pp end-to-end conversion per 100bps WAC change`,
      `Model: 3-stage funnel (demand → approval → booking) with independent elasticities derived from cross-grid population data.`,
    ].join("\n");
  }

  let replaySummary = "";
  if (replay) {
    const t = replay.totals;
    const e = replay.elasticities;
    replaySummary = [
      `HISTORICAL REPLAY for grid ${replay.targetGrid} with ${replay.bpsChange > 0 ? "+" : ""}${replay.bpsChange}bps change:`,
      `Actual booked: ${t.actualBooked}, Simulated booked: ${t.simulatedBooked} (Δ ${t.bookedDelta > 0 ? "+" : ""}${t.bookedDelta})`,
      `Actual approvals: ${t.actualTotalApprovals}, Simulated approvals: ${t.simulatedTotalApprovals}`,
      `Actual avg conversion: ${(t.actualAvgConversion * 100).toFixed(2)}%, Simulated: ${(t.simulatedAvgConversion * 100).toFixed(2)}% (Δ ${(t.conversionDeltaPp * 100).toFixed(2)}pp)`,
      `Elasticities per 100bps: demand ${(e.appDemandElasticity * 100).toFixed(2)}% apps, approval ${(e.approvalElasticity * 100).toFixed(2)}pp, booking ${(e.bookingElasticity * 100).toFixed(2)}pp`,
      `3-stage funnel model: pricing change affects application demand, approval rates, and booking rates independently.`,
    ].join("\n");
  }

  const portfolioSummary = whatIfResult
    ? whatIfSummary
    : replay
      ? replaySummary
      : performance?.summary ?? "Portfolio summary unavailable.";

  const aiSummary = await generateAiSummary({
    question,
    portfolioSummary,
    wacHighlights,
    gridWacSummary,
    gridConversionSummary,
    simulationSummary: whatIfResult
      ? whatIfSummary
      : replay
        ? replaySummary
        : performance?.simulation?.summary ?? null,
    performanceSummary: performance?.summary ?? null,
  }).catch(() => null);

  return NextResponse.json({
    question,
    wacCohorts,
    gridWac,
    gridConversion,
    performance,
    whatIf: whatIfResult,
    replay,
    aiSummary,
    summary: portfolioSummary,
    gridWacSummary,
    gridConversionSummary,
  });
}
