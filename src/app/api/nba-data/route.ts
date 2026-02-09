import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "nba", "players.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json(JSON.parse(raw));
}
