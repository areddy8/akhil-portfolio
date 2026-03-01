import type {
  ComplianceApiResponse,
  ComplianceKpi,
  Metric,
  MonteCarloAlert,
  Product,
  SeriesPoint,
  Severity,
  SimulationScenario,
  WindowOption,
} from "@/lib/pricing-compliance/types";

const PRODUCTS: Product[] = ["PL", "SL", "CC", "HL"];

const WINDOW_POINT_COUNT: Record<WindowOption, number> = {
  "1h": 60,
  "24h": 96,
  "7d": 84,
  "30d": 120,
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 48271) % 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function severityFromProbability(probability: number): Severity {
  if (probability >= 0.9) return "critical";
  if (probability >= 0.75) return "high";
  if (probability >= 0.55) return "medium";
  return "low";
}

function buildSeries(
  product: Product,
  window: WindowOption,
  metric: Metric,
  seedKey: string,
): SeriesPoint[] {
  const points = WINDOW_POINT_COUNT[window];
  const rng = seededRandom(hashString(`${product}-${window}-${metric}-${seedKey}`));
  const now = Date.now();
  const stepMs =
    window === "1h"
      ? 60 * 1000
      : window === "24h"
        ? 15 * 60 * 1000
        : window === "7d"
          ? 2 * 60 * 60 * 1000
          : 6 * 60 * 60 * 1000;

  const base =
    metric === "ApprovalRate"
      ? 0.57 + rng() * 0.08
      : metric === "LossRate"
        ? 0.045 + rng() * 0.02
        : 0.128 + rng() * 0.016;

  const volatility =
    metric === "ApprovalRate" ? 0.012 : metric === "LossRate" ? 0.008 : 0.006;

  const series: SeriesPoint[] = [];
  let phase = rng() * Math.PI * 2;
  for (let i = points - 1; i >= 0; i -= 1) {
    const wave = Math.sin(phase + i * 0.22) * volatility;
    const noise = (rng() - 0.5) * volatility * 1.4;
    const expectedMean = clamp(base + wave, 0.001, 0.999);
    const observedRaw = expectedMean + noise;
    const shock = rng() > 0.95 ? (rng() - 0.3) * volatility * 6 : 0;
    const observed = clamp(observedRaw + shock, 0.001, 0.999);
    const band = volatility * (2.1 + rng() * 0.5);
    const p05 = clamp(expectedMean - band, 0.001, 0.999);
    const p95 = clamp(expectedMean + band, 0.001, 0.999);
    const outside = observed > p95 ? observed - p95 : observed < p05 ? p05 - observed : 0;
    const breachProbability = clamp((outside / (band || 0.0001)) * 0.75 + rng() * 0.12, 0.05, 0.99);

    series.push({
      ts: new Date(now - i * stepMs).toISOString(),
      observed,
      expectedMean,
      p05,
      p95,
      breachProbability,
      metric,
    });
  }
  return series;
}

function buildKpis(
  product: Product,
  approvalSeries: SeriesPoint[],
  lossSeries: SeriesPoint[],
  wacSeries: SeriesPoint[],
): ComplianceKpi {
  const lastApproval = approvalSeries[approvalSeries.length - 1];
  const lastLoss = lossSeries[lossSeries.length - 1];
  const lastWac = wacSeries[wacSeries.length - 1];
  const breaches =
    approvalSeries.filter((p) => p.breachProbability > 0.75).length +
    lossSeries.filter((p) => p.breachProbability > 0.75).length +
    wacSeries.filter((p) => p.breachProbability > 0.75).length;

  return {
    product,
    asOf: lastApproval.ts,
    approvals: Math.round(2100 + lastApproval.observed * 1600 + breaches * 5),
    conversionRate: clamp(lastApproval.observed - 0.08, 0.22, 0.8),
    avgWac: lastWac.observed,
    lossRate: lastLoss.observed,
    breaches,
    modelConfidence: clamp(0.9 - breaches * 0.003, 0.72, 0.98),
  };
}

function buildAlerts(product: Product, seriesByMetric: Record<Metric, SeriesPoint[]>): MonteCarloAlert[] {
  const alerts: MonteCarloAlert[] = [];
  (Object.keys(seriesByMetric) as Metric[]).forEach((metric) => {
    seriesByMetric[metric].forEach((point, idx) => {
      if (point.breachProbability < 0.55) return;
      const severity = severityFromProbability(point.breachProbability);
      alerts.push({
        id: `${product}-${metric}-${idx}-${point.ts}`,
        ts: point.ts,
        product,
        metric,
        observed: point.observed,
        expectedMean: point.expectedMean,
        p95Upper: point.p95,
        p05Lower: point.p05,
        breachProbability: point.breachProbability,
        severity,
        status: severity === "low" ? "resolved" : "open",
      });
    });
  });
  return alerts.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 36);
}

function buildScenario(product: Product, latest: ComplianceKpi, gridDeltaBps: number): SimulationScenario {
  const shift = gridDeltaBps / 100;
  const expectedApprovalDeltaPp = clamp(-0.012 * shift, -0.09, 0.09);
  const expectedLossDeltaPp = clamp(0.008 * shift, -0.05, 0.05);
  return {
    product,
    gridDeltaBps,
    expectedApprovalDeltaPp,
    expectedLossDeltaPp,
    expectedWacDeltaBps: gridDeltaBps,
    confidence: clamp(latest.modelConfidence - Math.abs(gridDeltaBps) / 4000, 0.62, 0.97),
  };
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function generateComplianceData(input: {
  product: Product | "ALL";
  window: WindowOption;
  metric: Metric;
  scenarioBps: number;
}): ComplianceApiResponse {
  const products = input.product === "ALL" ? PRODUCTS : [input.product];

  const productSeries = products.map((product) => {
    const approval = buildSeries(product, input.window, "ApprovalRate", "approval");
    const loss = buildSeries(product, input.window, "LossRate", "loss");
    const wac = buildSeries(product, input.window, "WAC", "wac");
    const kpi = buildKpis(product, approval, loss, wac);
    const alerts = buildAlerts(product, {
      ApprovalRate: approval,
      LossRate: loss,
      WAC: wac,
    });
    return { product, approval, loss, wac, kpi, alerts };
  });

  const kpis = productSeries.map((p) => p.kpi);
  const alerts = productSeries
    .flatMap((p) => p.alerts)
    .sort((a, b) => b.ts.localeCompare(a.ts));

  const series = input.product === "ALL"
    ? productSeries[0][input.metric === "ApprovalRate" ? "approval" : input.metric === "LossRate" ? "loss" : "wac"].map((point, idx) => {
        const points = productSeries.map((entry) =>
          (input.metric === "ApprovalRate" ? entry.approval : input.metric === "LossRate" ? entry.loss : entry.wac)[idx],
        );
        return {
          ts: point.ts,
          metric: input.metric,
          observed: avg(points.map((p) => p.observed)),
          expectedMean: avg(points.map((p) => p.expectedMean)),
          p05: avg(points.map((p) => p.p05)),
          p95: avg(points.map((p) => p.p95)),
          breachProbability: avg(points.map((p) => p.breachProbability)),
        };
      })
    : productSeries[0][input.metric === "ApprovalRate" ? "approval" : input.metric === "LossRate" ? "loss" : "wac"];

  const primaryKpi =
    input.product === "ALL"
      ? {
          product: "PL" as Product,
          asOf: kpis[0]?.asOf ?? new Date().toISOString(),
          approvals: Math.round(avg(kpis.map((k) => k.approvals))),
          conversionRate: avg(kpis.map((k) => k.conversionRate)),
          avgWac: avg(kpis.map((k) => k.avgWac)),
          lossRate: avg(kpis.map((k) => k.lossRate)),
          breaches: kpis.reduce((sum, k) => sum + k.breaches, 0),
          modelConfidence: avg(kpis.map((k) => k.modelConfidence)),
        }
      : kpis[0];

  const scenario = buildScenario(input.product === "ALL" ? "PL" : input.product, primaryKpi, input.scenarioBps);
  const narrative = [
    `Simulated compliance monitoring across ${products.join(", ")} with probabilistic Monte Carlo thresholds.`,
    `Current ${input.metric} trend is ${series[series.length - 1].observed > series[series.length - 1].expectedMean ? "above" : "below"} expected baseline.`,
    `Scenario test at ${input.scenarioBps > 0 ? "+" : ""}${input.scenarioBps}bps projects approval delta ${(scenario.expectedApprovalDeltaPp * 100).toFixed(2)}pp and loss delta ${(scenario.expectedLossDeltaPp * 100).toFixed(2)}pp.`,
    "Data is synthetic and sanitized for portfolio demonstration.",
  ].join(" ");

  return {
    kpis,
    alerts,
    series,
    scenario,
    narrative,
    quality: {
      truePositiveRate: clamp(0.93 - alerts.filter((a) => a.severity === "low").length * 0.002, 0.84, 0.98),
      falsePositiveRate: clamp(0.06 + alerts.filter((a) => a.severity === "critical").length * 0.0008, 0.02, 0.14),
    },
  };
}

