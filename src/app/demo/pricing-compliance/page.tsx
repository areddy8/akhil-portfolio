"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  ComplianceApiResponse,
  Metric,
  Product,
  Severity,
  WindowOption,
} from "@/lib/pricing-compliance/types";

const glass =
  "rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02] shadow-[0_1px_2px_rgba(0,0,0,0.4)]";
const glassInner = "rounded-xl border border-white/[0.06] bg-white/[0.03]";
const label = "text-[10px] uppercase tracking-[0.18em] font-medium text-white/40";
const selectStyle =
  "rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-[11px] text-white/80 outline-none";

const PRODUCTS: (Product | "ALL")[] = ["ALL", "PL", "SL", "CC", "HL"];
const WINDOWS: WindowOption[] = ["1h", "24h", "7d", "30d"];
const METRICS: Metric[] = ["ApprovalRate", "LossRate", "WAC"];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function fmtSignedPp(value: number): string {
  const val = value * 100;
  return `${val > 0 ? "+" : ""}${val.toFixed(2)}pp`;
}

function metricColor(metric: Metric): string {
  if (metric === "ApprovalRate") return "text-emerald-300";
  if (metric === "LossRate") return "text-amber-300";
  return "text-indigo-300";
}

function severityBadge(severity: Severity): string {
  if (severity === "critical") return "bg-red-500/12 text-red-300 border-red-500/30";
  if (severity === "high") return "bg-orange-500/12 text-orange-300 border-orange-500/30";
  if (severity === "medium") return "bg-amber-500/12 text-amber-300 border-amber-500/30";
  return "bg-cyan-500/12 text-cyan-300 border-cyan-500/30";
}

export default function PricingCompliancePage() {
  const [product, setProduct] = useState<Product | "ALL">("ALL");
  const [windowOpt, setWindowOpt] = useState<WindowOption>("7d");
  const [metric, setMetric] = useState<Metric>("ApprovalRate");
  const [scenarioBps, setScenarioBps] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<Severity[]>(["critical", "high", "medium", "low"]);
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ComplianceApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/pricing-compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product,
        window: windowOpt,
        metric,
        scenarioBps,
        severities: severityFilter,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load compliance telemetry.");
        return res.json();
      })
      .then((payload: ComplianceApiResponse) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product, windowOpt, metric, scenarioBps, severityFilter]);

  const series = data?.series ?? [];
  const alerts = (data?.alerts ?? []).map((alert) => ({
    ...alert,
    status: ackedIds.has(alert.id) ? "acknowledged" : alert.status,
  }));

  const aggregate = useMemo(() => {
    const kpis = data?.kpis ?? [];
    const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);
    return {
      approvals: Math.round(avg(kpis.map((k) => k.approvals))),
      conversionRate: avg(kpis.map((k) => k.conversionRate)),
      avgWac: avg(kpis.map((k) => k.avgWac)),
      lossRate: avg(kpis.map((k) => k.lossRate)),
      confidence: avg(kpis.map((k) => k.modelConfidence)),
      breaches: kpis.reduce((sum, k) => sum + k.breaches, 0),
    };
  }, [data?.kpis]);

  const chart = useMemo(() => {
    if (!series.length) return { observed: "", expected: "", bandTop: "", bandBottom: "" };
    const chartW = 980;
    const chartH = 260;
    const pad = { l: 50, r: 16, t: 16, b: 30 };
    const innerW = chartW - pad.l - pad.r;
    const innerH = chartH - pad.t - pad.b;

    const minY = Math.min(...series.map((p) => Math.min(p.p05, p.observed))) * 0.98;
    const maxY = Math.max(...series.map((p) => Math.max(p.p95, p.observed))) * 1.02;
    const range = Math.max(maxY - minY, 0.0001);

    const toX = (i: number) => pad.l + (i / Math.max(series.length - 1, 1)) * innerW;
    const toY = (v: number) => pad.t + innerH - ((v - minY) / range) * innerH;

    const observed = series.map((p, i) => `${toX(i)},${toY(p.observed)}`).join(" ");
    const expected = series.map((p, i) => `${toX(i)},${toY(p.expectedMean)}`).join(" ");
    const top = series.map((p, i) => `${toX(i)},${toY(p.p95)}`).join(" ");
    const bottom = [...series]
      .reverse()
      .map((p, i) => `${toX(series.length - 1 - i)},${toY(p.p05)}`)
      .join(" ");

    return {
      observed,
      expected,
      bandTop: top,
      bandBottom: bottom,
      yTicks: Array.from({ length: 5 }, (_, i) => minY + (range * i) / 4),
      toY,
      chartW,
      chartH,
      pad,
      innerW,
    };
  }, [series]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/60">
        SoFi-style Risk Analytics
      </span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Pricing Compliance Radar</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50">
        Monte Carlo-driven anomaly detection for lending telemetry across Personal Loans, Student Loans,
        Credit Cards, and Home Loans. Includes alert triage, confidence bands, and scenario stress tests.
      </p>

      <div className={`${glass} mt-6 p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <select className={selectStyle} value={product} onChange={(e) => setProduct(e.target.value as Product | "ALL")}>
            {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={selectStyle} value={windowOpt} onChange={(e) => setWindowOpt(e.target.value as WindowOption)}>
            {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <select className={selectStyle} value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
            {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="ml-2 text-[11px] text-white/45">Scenario</div>
          <input
            type="range"
            min={-200}
            max={200}
            step={25}
            value={scenarioBps}
            onChange={(e) => setScenarioBps(Number(e.target.value))}
            className="w-36 accent-white"
          />
          <span className="font-mono text-[11px] text-white/70">{scenarioBps > 0 ? "+" : ""}{scenarioBps}bps</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SEVERITIES.map((s) => {
            const on = severityFilter.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (on ? prev.filter((v) => v !== s) : [...prev, s]))
                }
                className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                  on ? "border-white/25 bg-white/[0.08] text-white" : "border-white/[0.08] bg-white/[0.02] text-white/35"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p className="mt-5 text-sm text-white/40 animate-pulse">Loading compliance telemetry...</p>}
      {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

      {!loading && data && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              { t: "Approvals", v: aggregate.approvals.toLocaleString(), c: "text-white" },
              { t: "Conversion", v: fmtPct(aggregate.conversionRate), c: "text-emerald-300" },
              { t: "Avg WAC", v: fmtPct(aggregate.avgWac), c: "text-indigo-300" },
              { t: "Loss Rate", v: fmtPct(aggregate.lossRate), c: "text-amber-300" },
              { t: "Breach Events", v: `${aggregate.breaches}`, c: "text-red-300" },
              { t: "Model Confidence", v: fmtPct(aggregate.confidence), c: "text-cyan-300" },
            ].map((card) => (
              <div key={card.t} className={`${glass} px-4 py-3`}>
                <div className={label}>{card.t}</div>
                <div className={`mt-1 text-lg font-semibold ${card.c}`}>{card.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className={`${glass} p-5`}>
              <div className={label}>Forecast band vs observed ({metric})</div>
              <svg viewBox={`0 0 ${chart.chartW} ${chart.chartH}`} className="mt-4 w-full">
                {chart.yTicks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={chart.pad.l}
                      y1={chart.toY(tick)}
                      x2={chart.chartW - chart.pad.r}
                      y2={chart.toY(tick)}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={0.6}
                    />
                    <text x={chart.pad.l - 6} y={chart.toY(tick) + 3} textAnchor="end" className="fill-white/30" fontSize={9}>
                      {(tick * 100).toFixed(1)}%
                    </text>
                  </g>
                ))}
                <path
                  d={`M${chart.bandTop}L${chart.bandBottom}Z`}
                  fill="rgba(99,102,241,0.18)"
                  stroke="rgba(99,102,241,0.2)"
                  strokeWidth={0.5}
                />
                <polyline points={chart.expected} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.3} strokeDasharray="5 4" />
                <polyline points={chart.observed} fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth={2} strokeLinejoin="round" />
                <text x={chart.pad.l} y={chart.chartH - 8} className="fill-white/30" fontSize={9}>Start</text>
                <text x={chart.pad.l + chart.innerW} y={chart.chartH - 8} textAnchor="end" className="fill-white/30" fontSize={9}>Latest</text>
              </svg>
              <div className="mt-2 text-[11px] text-white/35">
                Expected confidence band (p05-p95) from Monte Carlo simulations; observed line highlights real-time variance.
              </div>
            </div>

            <div className="space-y-5">
              <div className={`${glass} p-5`}>
                <div className={label}>Alert queue</div>
                <div className="mt-3 max-h-[340px] space-y-2 overflow-auto pr-1">
                  {alerts.slice(0, 18).map((alert) => (
                    <div key={alert.id} className={`${glassInner} p-3`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/70">{alert.product} · {alert.metric}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-white/55">
                        Obs {fmtPct(alert.observed)} vs Exp {fmtPct(alert.expectedMean)} · P(breach) {(alert.breachProbability * 100).toFixed(1)}%
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-white/35">
                        <span>{new Date(alert.ts).toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 rounded-md px-2 text-[10px]"
                          onClick={() => setAckedIds((prev) => new Set(prev).add(alert.id))}
                        >
                          {alert.status === "acknowledged" ? "Acked" : "Acknowledge"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${glass} p-5`}>
                <div className={label}>Alert quality</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className={`${glassInner} p-3 text-center`}>
                    <div className="text-[10px] text-white/40">True positive rate</div>
                    <div className="mt-1 text-base font-semibold text-emerald-300">{fmtPct(data.quality.truePositiveRate)}</div>
                  </div>
                  <div className={`${glassInner} p-3 text-center`}>
                    <div className="text-[10px] text-white/40">False positive rate</div>
                    <div className="mt-1 text-base font-semibold text-amber-300">{fmtPct(data.quality.falsePositiveRate)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={`${glass} p-5`}>
              <div className={label}>Product compliance heatmap</div>
              <div className="mt-4 overflow-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-white/35">
                      <th className="pb-2 pr-3 font-medium">Product</th>
                      <th className="pb-2 pr-3 font-medium">Conversion</th>
                      <th className="pb-2 pr-3 font-medium">WAC</th>
                      <th className="pb-2 pr-3 font-medium">Loss</th>
                      <th className="pb-2 font-medium">Breaches</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    {data.kpis.map((k) => (
                      <tr key={k.product} className="border-t border-white/[0.05]">
                        <td className="py-2 pr-3 font-semibold text-white/80">{k.product}</td>
                        <td className="py-2 pr-3">{fmtPct(k.conversionRate)}</td>
                        <td className="py-2 pr-3">{fmtPct(k.avgWac)}</td>
                        <td className="py-2 pr-3">{fmtPct(k.lossRate)}</td>
                        <td className="py-2">
                          <span className="rounded-md bg-white/[0.07] px-2 py-1 font-mono">{k.breaches}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${glass} p-5`}>
              <div className={label}>Scenario guardrail impact</div>
              <div className="mt-3 text-[12px] text-white/55">
                Grid change {data.scenario.gridDeltaBps > 0 ? "+" : ""}{data.scenario.gridDeltaBps}bps on {data.scenario.product}.
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className={`${glassInner} p-3 text-center`}>
                  <div className="text-[10px] text-white/40">Approval Δ</div>
                  <div className={`mt-1 font-mono text-sm font-semibold ${metricColor("ApprovalRate")}`}>
                    {fmtSignedPp(data.scenario.expectedApprovalDeltaPp)}
                  </div>
                </div>
                <div className={`${glassInner} p-3 text-center`}>
                  <div className="text-[10px] text-white/40">Loss Δ</div>
                  <div className={`mt-1 font-mono text-sm font-semibold ${metricColor("LossRate")}`}>
                    {fmtSignedPp(data.scenario.expectedLossDeltaPp)}
                  </div>
                </div>
                <div className={`${glassInner} p-3 text-center`}>
                  <div className="text-[10px] text-white/40">WAC Δ</div>
                  <div className={`mt-1 font-mono text-sm font-semibold ${metricColor("WAC")}`}>
                    {data.scenario.expectedWacDeltaBps > 0 ? "+" : ""}{data.scenario.expectedWacDeltaBps}bps
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-white/45">{data.narrative}</p>
              <p className="mt-3 text-[10px] text-white/30">
                Data is synthetic and sanitized. Workflow mirrors real compliance monitoring and pricing governance.
              </p>
            </div>
          </div>

          <div className={`${glass} mt-6 p-5`}>
            <div className={label}>System architecture (demo)</div>
            <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="overflow-auto">
                <svg viewBox="0 0 920 240" className="w-full min-w-[680px]">
                  <defs>
                    <marker
                      id="arrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3.5, 0 7" fill="rgba(255,255,255,0.45)" />
                    </marker>
                  </defs>

                  {[
                    { x: 20, y: 35, w: 180, h: 56, title: "Speed Layer", sub: "Streaming telemetry" },
                    { x: 20, y: 150, w: 180, h: 56, title: "Cold Storage", sub: "Delta/S3 history" },
                    { x: 260, y: 92, w: 190, h: 56, title: "Modeling + SQL", sub: "Spark / Presto jobs" },
                    { x: 500, y: 92, w: 190, h: 56, title: "Monte Carlo Engine", sub: "Bands + breach P" },
                    { x: 740, y: 35, w: 160, h: 56, title: "Alert Service", sub: "Risk queue" },
                    { x: 740, y: 150, w: 160, h: 56, title: "Radar UI", sub: "Exec + analyst view" },
                  ].map((b) => (
                    <g key={b.title}>
                      <rect
                        x={b.x}
                        y={b.y}
                        width={b.w}
                        height={b.h}
                        rx={10}
                        fill="rgba(255,255,255,0.04)"
                        stroke="rgba(255,255,255,0.15)"
                      />
                      <text x={b.x + 12} y={b.y + 22} className="fill-white/80" fontSize={12} fontWeight={600}>
                        {b.title}
                      </text>
                      <text x={b.x + 12} y={b.y + 39} className="fill-white/45" fontSize={10}>
                        {b.sub}
                      </text>
                    </g>
                  ))}

                  {[
                    "M200 63 L260 118",
                    "M200 178 L260 122",
                    "M450 120 L500 120",
                    "M690 108 L740 63",
                    "M690 132 L740 178",
                  ].map((d) => (
                    <path
                      key={d}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth={1.3}
                      markerEnd="url(#arrow)"
                    />
                  ))}
                </svg>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed text-white/45">
                <p>
                  Speed-layer telemetry and historical lakehouse data are modeled through SQL/Spark transforms.
                </p>
                <p>
                  A Monte Carlo service computes expected ranges and breach probabilities for approval rate, loss rate, and WAC.
                </p>
                <p>
                  The alert service prioritizes anomalies by severity; the Radar UI supports triage, drill-down, and scenario testing.
                </p>
                <p className="text-white/30">
                  This architecture mirrors production patterns while using synthetic data for portfolio safety.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

