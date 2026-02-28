const express = require("express");
const cors = require("cors");
require("dotenv").config();

console.log("OPENAI KEY LOADED:", !!process.env.OPENAI_API_KEY);
console.log("OPENAI KEY PREFIX:", (process.env.OPENAI_API_KEY || "").slice(0, 7));

const OpenAI = require("openai");

// ---- Config ----
const PORT = process.env.PORT || 3001;
const API_KEY = (process.env.OPENAI_API_KEY || "").trim();

// IMPORTANT: if this is empty, you'll always fail
const client = new OpenAI({ apiKey: API_KEY });

const app = express();



// ---- Middleware ----
// Allow localhost dev + (optional) your deployed domain later

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
  })
);

app.use(express.json({ limit: "60kb" }));

// ---- Routes ----
app.get("/", (req, res) => {
  res.send("reset3-api up. Try /health");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, name: "reset3-api" });
});

function withTimeout(promise, ms = 45000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

app.post("/api/generate", async (req, res) => {

  console.log("HIT /api/generate", {
    hasBody: !!req.body,
    keys: Object.keys(req.body || {}),
    hasWeekly: !!(req.body && req.body.weekly),
      });

  try {
    const { brainDump = [], minutes = 60, quickWinMode = false, weekly = {} } =
      req.body || {};

    if (!Array.isArray(brainDump)) {
      return res.status(400).json({ error: "brainDump must be an array" });
    }

    const lines = Array.from(
      new Set(brainDump.map((x) => String(x?.text || "").trim()).filter(Boolean))
    ).slice(0, 80);

    if (lines.length === 0) {
      return res.status(400).json({ error: "brainDump is empty" });
    }

    const weeklyOutcomes = [weekly.w1, weekly.w2, weekly.w3]
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .slice(0, 3);

    const system = `
You are Reset3. Reduce decision friction.
Pick exactly 1 Primary and exactly 2 Support moves from the brain dump.

Rules:
- Primary is highest leverage.
- Supports remove blockers or set up Primary.
- Prefer tasks that fit minutes=${minutes}.
- If quickWinMode=${quickWinMode}, slightly prefer quick wins (<=20m) when reasonable.
- If weekly outcomes exist, prefer alignment.

Return ONLY valid JSON in EXACT shape:
{
  "primary": {"text": "...", "reason": "..."},
  "support": [{"text": "...", "reason": "..."}, {"text": "...", "reason": "..."}]
}
No markdown. No extra keys.
`.trim();

    const user = `
Weekly outcomes:
${
  weeklyOutcomes.length
    ? weeklyOutcomes.map((x) => `- ${x}`).join("\n")
    : "(none)"
}

Brain dump:
${lines.map((x) => `- ${x}`).join("\n")}
`.trim();

    if (!API_KEY) {
      return res.status(500).json({
        error: "Server error",
        message: "Missing OPENAI_API_KEY in server/.env",
      });
    }

    // Use a smaller/faster model while you debug reliability.
    // You can switch later.
    const resp = await withTimeout(
      client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        store: false,
      }),
      45000
    );

    const text = (resp && resp.output_text) ? resp.output_text : "";
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({
        error: "Model returned invalid JSON",
        raw: text,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("Generate error:", err?.message || err);
    return res.status(500).json({
      error: "Server error",
      message: String(err?.message || err),
    });
  }
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Reset3 API running on http://localhost:${PORT}`);
});