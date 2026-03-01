export type Product = "PL" | "SL" | "CC" | "HL";

export type Severity = "low" | "medium" | "high" | "critical";

export type WindowOption = "1h" | "24h" | "7d" | "30d";

export type Metric = "ApprovalRate" | "LossRate" | "WAC";

export interface ComplianceKpi {
  product: Product;
  asOf: string;
  approvals: number;
  conversionRate: number;
  avgWac: number;
  lossRate: number;
  breaches: number;
  modelConfidence: number;
}

export interface MonteCarloAlert {
  id: string;
  ts: string;
  product: Product;
  metric: Metric;
  observed: number;
  expectedMean: number;
  p95Upper: number;
  p05Lower: number;
  breachProbability: number;
  severity: Severity;
  status: "open" | "acknowledged" | "resolved";
}

export interface SeriesPoint {
  ts: string;
  observed: number;
  expectedMean: number;
  p05: number;
  p95: number;
  breachProbability: number;
  metric: Metric;
}

export interface SimulationScenario {
  product: Product;
  gridDeltaBps: number;
  expectedApprovalDeltaPp: number;
  expectedLossDeltaPp: number;
  expectedWacDeltaBps: number;
  confidence: number;
}

export interface ComplianceApiResponse {
  kpis: ComplianceKpi[];
  alerts: MonteCarloAlert[];
  series: SeriesPoint[];
  scenario: SimulationScenario;
  narrative: string;
  quality: {
    truePositiveRate: number;
    falsePositiveRate: number;
  };
}

