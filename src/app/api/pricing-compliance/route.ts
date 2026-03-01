import { NextRequest, NextResponse } from "next/server";
import { generateComplianceData } from "@/lib/pricing-compliance/mock-data";
import type { Metric, Product, Severity, WindowOption } from "@/lib/pricing-compliance/types";

export const runtime = "nodejs";

function isProduct(value: unknown): value is Product | "ALL" {
  return value === "ALL" || value === "PL" || value === "SL" || value === "CC" || value === "HL";
}

function isWindow(value: unknown): value is WindowOption {
  return value === "1h" || value === "24h" || value === "7d" || value === "30d";
}

function isMetric(value: unknown): value is Metric {
  return value === "ApprovalRate" || value === "LossRate" || value === "WAC";
}

function isSeverity(value: unknown): value is Severity {
  return value === "low" || value === "medium" || value === "high" || value === "critical";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const product = isProduct(body?.product) ? body.product : "ALL";
  const window = isWindow(body?.window) ? body.window : "7d";
  const metric = isMetric(body?.metric) ? body.metric : "ApprovalRate";
  const scenarioBps =
    typeof body?.scenarioBps === "number" ? Math.max(-200, Math.min(200, body.scenarioBps)) : 0;
  const severities = Array.isArray(body?.severities)
    ? body.severities.filter((value: unknown): value is Severity => isSeverity(value))
    : [];

  const data = generateComplianceData({ product, window, metric, scenarioBps });
  const filteredAlerts =
    severities.length > 0 ? data.alerts.filter((alert) => severities.includes(alert.severity)) : data.alerts;

  return NextResponse.json({
    ...data,
    alerts: filteredAlerts,
    filters: { product, window, metric, severities, scenarioBps },
  });
}

