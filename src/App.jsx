import { useState, useEffect } from "react";
import "./App.css";
import HistoryCalendar from "./components/HistoryCalendar.jsx";

export default function App() {
  // ---------- date helpers ----------
  const dateKey = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayKey = dateKey();

  const last7Keys = (() => {
    const keys = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      keys.push(dateKey(d));
    }
    return keys;
  })();

  // ---------- calendar/history helper ----------
  const lastNKeys = (n = 14) => {
    const keys = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      keys.push(dateKey(d));
    }
    return keys;
  };

  // ---------- text helpers ----------
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const phrasesFromOutcome = (outcome) => {
    const line = normalize(outcome);
    if (!line) return [];
    const words = line.split(" ").filter(Boolean);

    const phrases = [];
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        phrases.push(words.slice(i, i + n).join(" "));
      }
    }

    return Array.from(new Set(phrases)).sort((a, b) => b.length - a.length);
  };

  const reasonFor = (text) => {
    const t = (text || "").toLowerCase();

    if (["dog", "kid", "child"].some((k) => t.includes(k)))
      return "Responsibility + immediate comfort.";

    if (["pay", "bill", "rent", "tax", "invoice"].some((k) => t.includes(k)))
      return "Avoidance + financial pressure. Clear it early.";

    if (["call", "email", "appointment"].some((k) => t.includes(k)))
      return "Time-sensitive and easy to delay. Do it first.";

    if (["study", "network", "course"].some((k) => t.includes(k)))
      return "Compounds long-term. Protect it.";

    if (["clean", "tidy", "organize", "garage"].some((k) => t.includes(k)))
      return "Fast momentum win that reduces noise.";

    if (["story", "game", "youtube", "scroll"].some((k) => t.includes(k)))
      return "Leisure is fine after the win. Not before.";

    return "Best leverage + least regret.";
  };

  const isAvoidance = (text) => {
    const t = (text || "").toLowerCase();
    return [
      "pay",
      "bill",
      "rent",
      "tax",
      "invoice",
      "call",
      "email",
      "appointment",
    ].some((k) => t.includes(k));
  };

  // ---------- state ----------
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [minutes, setMinutes] = useState(() => {
    const saved = localStorage.getItem("reset3_minutes");
    return saved ? Number(saved) : 60;
  });

  useEffect(() => {
    localStorage.setItem("reset3_minutes", String(minutes));
  }, [minutes]);

  const [quickWinMode, setQuickWinMode] = useState(() => {
    const saved = localStorage.getItem("reset3_quick_win");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("reset3_quick_win", JSON.stringify(quickWinMode));
  }, [quickWinMode]);

  const [input, setInput] = useState(() => {
    const saved = localStorage.getItem("reset3_brain_dump");
    return saved ?? "";
  });

  useEffect(() => {
    localStorage.setItem("reset3_brain_dump", input);
  }, [input]);

  const [weekly, setWeekly] = useState(() => {
    const saved = localStorage.getItem("reset3_weekly");
    return saved ? JSON.parse(saved) : { w1: "", w2: "", w3: "" };
  });

  useEffect(() => {
    localStorage.setItem("reset3_weekly", JSON.stringify(weekly));
  }, [weekly]);

  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem("reset3_result");
    return saved ? JSON.parse(saved) : null;
  });

  const [done, setDone] = useState({
    primary: false,
    support1: false,
    support2: false,
  });

  const [eod, setEod] = useState(() => {
    const saved = localStorage.getItem("reset3_eod");
    return saved ? JSON.parse(saved) : {};
  });

  const [eodWhy, setEodWhy] = useState(() => {
    const saved = localStorage.getItem("reset3_eod_why");
    return saved ? JSON.parse(saved) : {};
  });

  const [dailyResults, setDailyResults] = useState(() => {
    const saved = localStorage.getItem("reset3_daily_results");
    return saved ? JSON.parse(saved) : {};
  });

  const [cyclesByDay, setCyclesByDay] = useState(() => {
    const saved = localStorage.getItem("reset3_cycles");
    return saved ? JSON.parse(saved) : {};
  });

  // ---------- weekly auto-check ----------
  const w1Phrases = phrasesFromOutcome(weekly.w1);
  const w2Phrases = phrasesFromOutcome(weekly.w2);
  const w3Phrases = phrasesFromOutcome(weekly.w3);

  const completedPrimaries = last7Keys
    .filter((k) => dailyResults[k]?.primary)
    .map((k) => normalize(dailyResults[k].primary));

  const outcomeHit = (phrases) => {
    if (!phrases.length) return null;
    if (!completedPrimaries.length) return false;
    return completedPrimaries.some((p) => phrases.some((ph) => p.includes(ph)));
  };

  const hit1 = outcomeHit(w1Phrases);
  const hit2 = outcomeHit(w2Phrases);
  const hit3 = outcomeHit(w3Phrases);

  const allSet = Boolean(weekly.w1 && weekly.w2 && weekly.w3);
  const winSoFar = allSet && hit1 === true && hit2 === true && hit3 === true;

  // ---------- remove completed from dump (by exact original line) ----------
  const removeCompletedFromDump = (currentResult, currentDone) => {
    if (!currentResult) return;

    const completedRaw = [];
    if (currentDone.primary && currentResult.primaryRaw)
      completedRaw.push(currentResult.primaryRaw.trim());
    if (currentDone.support1 && currentResult.support1Raw)
      completedRaw.push(currentResult.support1Raw.trim());
    if (currentDone.support2 && currentResult.support2Raw)
      completedRaw.push(currentResult.support2Raw.trim());

    if (completedRaw.length === 0) return;

    const kept = input
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((line) => !completedRaw.includes(line.trim()));

    setInput(kept.join("\n"));
  };

  // ---------- v3/v4: backend call (updates UI) ----------
  // Uses Vite env var in prod: VITE_API_URL=https://your-backend
  const API_URL =
    (import.meta.env.VITE_API_URL || "").trim() || "http://localhost:3001";

  const callBackendGenerate = async () => {
    setApiError("");

    const rawLines = Array.from(
      new Set(input.split("\n").map((s) => s.trim()).filter(Boolean))
    );

    if (rawLines.length === 0) {
      alert("Brain dump is empty. Add at least 3 lines.");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          brainDump: rawLines.map((t) => ({ text: t })),
          minutes,
          quickWinMode,
          weekly,
        }),
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || `HTTP ${response.status}`);
      }

      const data = await response.json();

      const newResult = {
        primary: data?.primary?.text || "Pick one meaningful win.",
        primaryRaw: data?.primary?.text || "",
        primaryReason: data?.primary?.reason || reasonFor(data?.primary?.text),
        primaryAvoidance: isAvoidance(data?.primary?.text),

        support1: data?.support?.[0]?.text || "Clear one blocker.",
        support1Raw: data?.support?.[0]?.text || "",
        support1Reason:
          data?.support?.[0]?.reason || reasonFor(data?.support?.[0]?.text),
        support1Avoidance: isAvoidance(data?.support?.[0]?.text),

        support2: data?.support?.[1]?.text || "Do one quick cleanup.",
        support2Raw: data?.support?.[1]?.text || "",
        support2Reason:
          data?.support?.[1]?.reason || reasonFor(data?.support?.[1]?.text),
        support2Avoidance: isAvoidance(data?.support?.[1]?.text),
      };

      setResult(newResult);
      setApiError("");
      localStorage.setItem("reset3_result", JSON.stringify(newResult));

      const nextDaily = { ...dailyResults, [todayKey]: newResult };
      setDailyResults(nextDaily);
      localStorage.setItem("reset3_daily_results", JSON.stringify(nextDaily));

      setDone({ primary: false, support1: false, support2: false });
    } catch (err) {
      const isAbort =
        err?.name === "AbortError" ||
        String(err?.message || "").toLowerCase().includes("aborted");

      const msg = isAbort
        ? "Backend request timed out (60s). Try again."
        : `Backend error: ${err?.message || "Unknown error"}`;

      setApiError(`${msg} (Using local fallback.)`);
      handleGenerate();
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  // ---------- generator (v2 local) ----------
  const handleGenerate = () => {
    const raw = Array.from(
      new Set(input.split("\n").map((s) => s.trim()).filter(Boolean))
    );

    if (raw.length === 0) {
      alert("Brain dump is empty. Add at least 3 lines.");
      return;
    }

    const parsed = raw.map((t) => {
      const m =
        t.match(/\((\d+)\s*m\)/i) ||
        t.match(/\((\d+)\)/) ||
        t.match(/\b(\d+)\s*m\b/i) ||
        t.match(/-\s*(\d+)\s*m?/i);

      const mins = m ? Number(m[1]) : null;

      const clean = t
        .replace(/\s*\([^)]+\)\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return { raw: t, clean, mins };
    });

    const within = (x) => x.mins == null || x.mins <= minutes;
    const pool = parsed.filter(within);

    const hadAnyTimed = parsed.some((x) => x.mins != null);
    const hasAnyTimedThatFits = pool.some((x) => x.mins != null);
    if (hadAnyTimed && !hasAnyTimedThatFits) {
      alert(
        "No timed tasks fit your max minutes. Increase minutes or add a smaller task."
      );
      return;
    }

    if (pool.length === 0) {
      alert("Nothing fits your time limit. Increase minutes or remove time tags.");
      return;
    }

    const scoreTask = (x) => {
      const text = normalize(x.clean);
      let score = 0;

      if (["dog", "child", "kid", "appointment"].some((k) => text.includes(k)))
        score += 5;
      if (["pay", "bill", "rent", "tax", "invoice"].some((k) => text.includes(k)))
        score += 4;
      if (["business", "client", "sell"].some((k) => text.includes(k)))
        score += 3;
      if (["story", "game", "youtube", "scroll"].some((k) => text.includes(k)))
        score -= 3;

      const aligned =
        (w1Phrases.length && w1Phrases.some((p) => text.includes(p))) ||
        (w2Phrases.length && w2Phrases.some((p) => text.includes(p))) ||
        (w3Phrases.length && w3Phrases.some((p) => text.includes(p)));

      if (aligned) score += 4;

      if (quickWinMode) {
        if (x.mins != null && x.mins <= 20) score += 3;
        if (x.mins == null) score += 1;
        if (x.mins != null && x.mins >= 60) score -= 1;
      }

      return score;
    };

    const sorted = [...pool].sort((a, b) => scoreTask(b) - scoreTask(a));

    const hasPrepTask = (text) =>
      ["find", "prepare", "draft", "write", "create"].some((k) => text.includes(k));
    const hasActionTask = (text) =>
      ["call", "send", "submit", "email"].some((k) => text.includes(k));

    sorted.sort((a, b) => {
      const aText = normalize(a.clean);
      const bText = normalize(b.clean);
      if (hasPrepTask(aText) && hasActionTask(bText)) return -1;
      if (hasActionTask(aText) && hasPrepTask(bText)) return 1;
      return 0;
    });

    let remaining = minutes;

    const pickTask = () => {
      for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        if (t.mins == null || t.mins <= remaining) {
          remaining -= t.mins || 0;
          sorted.splice(i, 1);
          return t;
        }
      }
      return null;
    };

    const primary = pickTask();
    const support1 = pickTask();
    const support2 = pickTask();

    const newResult = {
      primary: primary?.clean || "Pick one meaningful win.",
      primaryRaw: primary?.raw || "",
      primaryReason: reasonFor(primary?.clean),
      primaryAvoidance: isAvoidance(primary?.clean),

      support1: support1?.clean || "Clear one blocker.",
      support1Raw: support1?.raw || "",
      support1Reason: reasonFor(support1?.clean),
      support1Avoidance: isAvoidance(support1?.clean),

      support2: support2?.clean || "Do one quick cleanup.",
      support2Raw: support2?.raw || "",
      support2Reason: reasonFor(support2?.clean),
      support2Avoidance: isAvoidance(support2?.clean),
    };

    setResult(newResult);
    localStorage.setItem("reset3_result", JSON.stringify(newResult));

    const nextDaily = { ...dailyResults, [todayKey]: newResult };
    setDailyResults(nextDaily);
    localStorage.setItem("reset3_daily_results", JSON.stringify(nextDaily));

    setDone({ primary: false, support1: false, support2: false });
  };

  // ---------- build calendar days for HistoryCalendar ----------
  const calendarDays = lastNKeys(14).map((k) => {
    const day = dailyResults[k];
    const cycles = cyclesByDay[k] || 0;
    const status = k in eod ? (eod[k] ? "WIN" : "INCOMPLETE") : "";

    return {
      date: k,
      primary: day?.primary || "",
      cycles,
      status,
    };
  });

  // ---------- simple styles ----------
  const page = {
    minHeight: "100vh",
    background:
      "radial-gradient(900px 500px at 20% 10%, rgba(70,120,255,0.18), transparent 60%), radial-gradient(800px 450px at 80% 0%, rgba(0,220,180,0.14), transparent 55%), #0b1020",
    color: "#e9ecff",
    padding: 24,
  };

  const card = {
    maxWidth: 760,
    margin: "0 auto",
    padding: 20,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    backdropFilter: "blur(6px)",
  };

  const section = {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.25)",
    color: "#e9ecff",
    outline: "none",
    marginBottom: 8,
  };

  const btn = (variant = "primary") => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    color: "#e9ecff",
    background:
      variant === "primary"
        ? "linear-gradient(135deg, rgba(70,120,255,0.95), rgba(0,220,180,0.55))"
        : "rgba(255,255,255,0.08)",
  });

  // ---------- UI ----------
  return (
    <div style={page}>
      <div className="appContainer">
        <div style={card}>
          {/* v4: branded header */}
          <div className="app-header">
            <div className="brand">
              <span className="brand-accent">RESET</span>3
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 0.5 }}>
                Reset 3
              </h1>

              <p style={{ marginTop: 6, opacity: 0.85 }}>
                Unload everything. We’ll decide what matters.
              </p>
            </div>

            <div style={{ textAlign: "right", opacity: 0.9 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Today</div>
              <div style={{ fontWeight: 700 }}>{todayKey}</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                Cycles today: <b>{cyclesByDay[todayKey] || 0}</b>
              </div>
            </div>
          </div>

          <div style={section}>
            <h3 style={{ marginTop: 0 }}>Weekly Reset</h3>
            <p style={{ marginTop: 6 }}>
              <b>What are the 3 outcomes that make this week a win?</b>
            </p>

            <input
              value={weekly.w1}
              onChange={(e) => setWeekly((w) => ({ ...w, w1: e.target.value }))}
              placeholder="Weekly outcome 1"
              style={inputStyle}
            />
            <input
              value={weekly.w2}
              onChange={(e) => setWeekly((w) => ({ ...w, w2: e.target.value }))}
              placeholder="Weekly outcome 2"
              style={inputStyle}
            />
            <input
              value={weekly.w3}
              onChange={(e) => setWeekly((w) => ({ ...w, w3: e.target.value }))}
              placeholder="Weekly outcome 3"
              style={inputStyle}
            />

            <button
              onClick={() =>
                localStorage.setItem("reset3_weekly", JSON.stringify(weekly))
              }
              style={btn("ghost")}
            >
              Save Weekly Outcomes
            </button>

            <div style={{ marginTop: 12, opacity: 0.9 }}>
              <b>This week so far (auto):</b>
              <div>
                • {weekly.w1 || "(empty)"}{" "}
                {hit1 === true ? "✅" : hit1 === false ? "—" : ""}
              </div>
              <div>
                • {weekly.w2 || "(empty)"}{" "}
                {hit2 === true ? "✅" : hit2 === false ? "—" : ""}
              </div>
              <div>
                • {weekly.w3 || "(empty)"}{" "}
                {hit3 === true ? "✅" : hit3 === false ? "—" : ""}
              </div>
              {allSet && (
                <div style={{ marginTop: 8 }}>
                  <b>{winSoFar ? "WIN (so far)" : "Not yet"}</b>
                </div>
              )}
            </div>
          </div>

          <div style={section}>
            <div className="controlsRow">
              <div style={{ minWidth: 220 }}>
                <label
                  style={{ display: "block", marginBottom: 6, opacity: 0.9 }}
                >
                  Max minutes (filters tasks with times)
                </label>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  style={{ ...inputStyle, marginBottom: 0 }}
                  placeholder="e.g. 60"
                />
              </div>

              <label className="quickWinLabel">
                <input
                  type="checkbox"
                  checked={quickWinMode}
                  onChange={(e) => setQuickWinMode(e.target.checked)}
                />
                Prefer quick wins (boost ≤ 20m)
              </label>
            </div>

            <p style={{ marginTop: 12, marginBottom: 8, opacity: 0.8 }}>
              Brain dump is saved automatically.
            </p>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Brain dump (one per line). Times: Walk dog (20m) OR Walk dog - 20m"
              style={{ ...inputStyle, height: 160 }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  if (result && !done.primary) {
                    alert(
                      "Primary must be checked before generating the next set."
                    );
                    return;
                  }

                  if (result && done.primary) {
                    removeCompletedFromDump(result, done);

                    const currentCount = cyclesByDay[todayKey] || 0;
                    const nextCycles = {
                      ...cyclesByDay,
                      [todayKey]: currentCount + 1,
                    };
                    setCyclesByDay(nextCycles);
                    localStorage.setItem(
                      "reset3_cycles",
                      JSON.stringify(nextCycles)
                    );
                  }

                  callBackendGenerate();
                }}
                style={btn("primary")}
                disabled={isLoading}
              >
                {isLoading
                  ? "Thinking..."
                  : result
                  ? done.primary
                    ? "Generate Next Set"
                    : "Primary First → Then Next Set"
                  : "Generate My 3"}
              </button>
            </div>

            {apiError && (
              <div style={{ marginTop: 10, opacity: 0.9, fontSize: 13 }}>
                ⚠ {apiError}
              </div>
            )}

            {result && !done.primary && (
              <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
                Rule: You can run multiple cycles per day — but you must finish
                the Primary first.
              </div>
            )}
          </div>

          {result && (
            <div style={section}>
              <h2 style={{ marginTop: 0 }}>Today’s 3</h2>

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 8 }}>🔥 Primary Move</h3>
                <label>
                  <input
                    type="checkbox"
                    checked={done.primary}
                    onChange={(e) =>
                      setDone((d) => ({ ...d, primary: e.target.checked }))
                    }
                  />{" "}
                  {result.primary}
                  {result.primaryAvoidance && (
                    <span style={{ marginLeft: 8 }}>⚠ Avoidance</span>
                  )}
                </label>
                <div style={{ opacity: 0.85, marginLeft: 22, marginTop: 4 }}>
                  {result.primaryReason}
                </div>
              </div>

              <h4 style={{ marginBottom: 10 }}>Support Moves</h4>

              <label style={{ display: "block", marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={done.support1}
                  onChange={(e) =>
                    setDone((d) => ({ ...d, support1: e.target.checked }))
                  }
                />{" "}
                {result.support1}
                {result.support1Avoidance && (
                  <span style={{ marginLeft: 8 }}>⚠ Avoidance</span>
                )}
                <div style={{ opacity: 0.85, marginLeft: 22, marginTop: 4 }}>
                  {result.support1Reason}
                </div>
              </label>

              <label style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={done.support2}
                  onChange={(e) =>
                    setDone((d) => ({ ...d, support2: e.target.checked }))
                  }
                />{" "}
                {result.support2}
                {result.support2Avoidance && (
                  <span style={{ marginLeft: 8 }}>⚠ Avoidance</span>
                )}
                <div style={{ opacity: 0.85, marginLeft: 22, marginTop: 4 }}>
                  {result.support2Reason}
                </div>
              </label>

              <div style={{ marginTop: 16, opacity: 0.85, fontSize: 13 }}>
                Tip: Check items as you finish them. When Primary is checked,
                you can run another cycle immediately.
              </div>
            </div>
          )}

          {/* HISTORY */}
          <div style={section}>
            <h3 style={{ marginTop: 0 }}>History (last 14 days)</h3>
            <HistoryCalendar days={calendarDays} />
          </div>

          {/* End of day (optional log) */}
          <div style={{ ...section, opacity: 0.95 }}>
            <h3 style={{ marginTop: 0 }}>End of day (optional log)</h3>
            <p style={{ marginTop: 6 }}>
              Did you complete at least one Primary today?
            </p>

            <button
              onClick={() => {
                const next = { ...eod, [todayKey]: true };
                setEod(next);
                localStorage.setItem("reset3_eod", JSON.stringify(next));

                const nextWhy = { ...eodWhy };
                delete nextWhy[todayKey];
                setEodWhy(nextWhy);
                localStorage.setItem("reset3_eod_why", JSON.stringify(nextWhy));
              }}
              style={{ ...btn("ghost"), marginRight: 8 }}
            >
              Yes
            </button>

            <button
              onClick={() => {
                const next = { ...eod, [todayKey]: false };
                setEod(next);
                localStorage.setItem("reset3_eod", JSON.stringify(next));
              }}
              style={btn("ghost")}
            >
              No
            </button>

            <button
              onClick={() => {
                const next = { ...eod };
                delete next[todayKey];
                setEod(next);
                localStorage.setItem("reset3_eod", JSON.stringify(next));

                const nextWhy = { ...eodWhy };
                delete nextWhy[todayKey];
                setEodWhy(nextWhy);
                localStorage.setItem("reset3_eod_why", JSON.stringify(nextWhy));
              }}
              style={{ ...btn("ghost"), marginLeft: 8 }}
            >
              Clear
            </button>

            {todayKey in eod && (
              <div style={{ marginTop: 10 }}>
                {eod[todayKey] ? (
                  <p>Good. You did the thing that matters.</p>
                ) : (
                  <div>
                    <p style={{ marginBottom: 8 }}>Incomplete. Why?</p>

                    <button
                      onClick={() => {
                        const next = { ...eodWhy, [todayKey]: "Blocked" };
                        setEodWhy(next);
                        localStorage.setItem(
                          "reset3_eod_why",
                          JSON.stringify(next)
                        );
                      }}
                      style={{ ...btn("ghost"), marginRight: 6 }}
                    >
                      Blocked
                    </button>

                    <button
                      onClick={() => {
                        const next = {
                          ...eodWhy,
                          [todayKey]: "No longer relevant",
                        };
                        setEodWhy(next);
                        localStorage.setItem(
                          "reset3_eod_why",
                          JSON.stringify(next)
                        );
                      }}
                      style={{ ...btn("ghost"), marginRight: 6 }}
                    >
                      No longer relevant
                    </button>

                    <button
                      onClick={() => {
                        const next = { ...eodWhy, [todayKey]: "Avoided" };
                        setEodWhy(next);
                        localStorage.setItem(
                          "reset3_eod_why",
                          JSON.stringify(next)
                        );
                      }}
                      style={btn("ghost")}
                    >
                      Avoided
                    </button>

                    {eodWhy[todayKey] && (
                      <p style={{ marginTop: 10 }}>
                        Logged: <b>{eodWhy[todayKey]}</b>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}