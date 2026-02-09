import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* ── types ─────────────────────────────────────────────────────────── */

type PlayerPosition = {
  id: number;
  team: "offense" | "defense";
  x: number; // court x: 0-500 (left to right)
  y: number; // court y: 0-470 (baseline to half)
  role?: string; // e.g. "ball handler", "wing", "center"
};

type CourtVisionResult = {
  players: PlayerPosition[];
  formation: string;
  offensiveAction: string;
  defensiveScheme: string;
  keyInsight: string;
  confidence: number;
};

/* ── prompt ─────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are an expert NBA basketball court-vision analyst. You will analyze a screenshot from an NBA game broadcast.

STEP-BY-STEP ANALYSIS (think carefully about each step):

STEP 1 — COURT ORIENTATION:
Look at the court markings visible in the image. Identify:
- Where is the basket/backboard? (this is y=0 in our coordinate system)
- Which direction does the court extend? (toward half-court = increasing y)
- Where are the sidelines? (left sideline = x=0, right sideline = x=500)
- Can you see the three-point arc, paint/key, free-throw line?

STEP 2 — JERSEY IDENTIFICATION:
- Which two teams are playing? What jersey colors do they wear?
- Which team has the ball / is on offense?
- Which team is defending?

STEP 3 — PLAYER POSITIONS:
For EACH visible player, estimate their position using these LANDMARK REFERENCES:

COORDINATE SYSTEM (half-court, standardized):
  x: 0 = left sideline, 250 = center, 500 = right sideline
  y: 0 = baseline (under the basket), 470 = half-court line

KEY REFERENCE POINTS (use these to calibrate):
  - Left corner 3:        (30,  40)
  - Right corner 3:       (470, 40)
  - Left block:           (185, 70)
  - Right block:          (315, 70)
  - Left elbow:           (185, 183)
  - Right elbow:          (315, 183)
  - Free throw line:      (250, 183)
  - Center of paint:      (250, 95)
  - Under the basket:     (250, 10)
  - Left wing 3:          (60,  200)
  - Right wing 3:         (440, 200)
  - Top of key 3:         (250, 280)
  - Left slot:            (160, 220)
  - Right slot:           (340, 220)
  - Left hash:            (120, 130)
  - Right hash:           (380, 130)
  - Half-court center:    (250, 460)

For each player, identify the NEAREST LANDMARK and then adjust from there.
Example: "Player is slightly left of the right elbow → (300, 185)"
Example: "Player is in the paint near the left block → (190, 75)"
Example: "Player is behind the 3-point line at the top of the key → (250, 300)"

STEP 4 — TACTICAL ANALYSIS:
Based on positions, identify the offensive formation and defensive scheme.

OUTPUT — Return ONLY valid JSON (no markdown fences, no extra text):
{
  "players": [
    { "id": 1, "team": "offense", "x": 250, "y": 50, "role": "ball handler" },
    { "id": 2, "team": "defense", "x": 240, "y": 60, "role": "on-ball defender" }
  ],
  "formation": "name of offensive set",
  "offensiveAction": "description of current action",
  "defensiveScheme": "man/zone/etc",
  "keyInsight": "one sentence about the most interesting tactical element",
  "confidence": 0.0 to 1.0
}

RULES:
- Number players sequentially: offense 1-5, then defense 6-10
- If fewer than 10 players are visible, only include those you can see
- Be PRECISE with coordinates. Use the reference points above as anchors.
- If a player is between two landmarks, interpolate.
- "role" should be specific: "ball handler", "screener", "weak-side wing", "help defender", "on-ball defender", "rim protector", etc.
- If the image is not a basketball game: return empty players array and confidence 0.`;

/* ── handler ──────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this NBA game screenshot. Follow the step-by-step process:
1. First identify court orientation — where is the basket, which way does the court face?
2. Identify jersey colors and which team is on offense.
3. For EACH player, find the nearest reference landmark and estimate coordinates relative to it.
4. Classify the formation and defensive scheme.
Return ONLY the JSON object.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `OpenAI API error: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (strip potential markdown fencing)
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let result: CourtVisionResult;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({
        error: "Failed to parse AI response",
        raw: content,
      }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      error: `Server error: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
}
