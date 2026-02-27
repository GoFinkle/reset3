const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, name: "reset3-api" });
});

app.post("/api/generate", (req, res) => {
  const { brainDump = [] } = req.body || {};

  if (!Array.isArray(brainDump)) {
    return res.status(400).json({ error: "brainDump must be an array" });
  }

  // DEV MODE response (no AI yet)
  res.json({
    primary: {
      text: "Choose ONE high-leverage task",
      minutes: 20,
      reason: "Dev mode placeholder"
    },
    support: [
      { text: "Quick win under 20 minutes", minutes: 15 },
      { text: "Prep tomorrow’s first action", minutes: 10 }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Reset3 API running on http://localhost:${PORT}`);
});