import React from "react";

function formatDateLabel(isoDate) {
  try {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return isoDate;
  }
}

export default function HistoryCalendar({ days = [] }) {
  const sorted = [...days].sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="historyCalendar">
      <div className="historyCalendarGrid">
        {sorted.map((d) => {
          const status = (d.status || "").toUpperCase(); // WIN | INCOMPLETE | ""
          const primary = d.primary || d.primaryMove || d.primaryText || "";
          const cycles = Number(d.cycles ?? d.cyclesCount ?? 0);

          return (
            <div
              key={d.date}
              className={`historyDayCard ${
                status === "WIN" ? "isWin" : "isIncomplete"
              }`}
              title={`${d.date}\n${primary}\nCycles: ${cycles}\n${status || ""}`}
            >
              <div className="historyDayTop">
                <div className="historyDayDate">{formatDateLabel(d.date)}</div>
                <div className="historyDayStatus">{status || "-"}</div>
              </div>

              <div className="historyDayPrimary" title={primary}>
                {primary || "(no primary saved)"}
              </div>

              <div className="historyDayMeta">Cycles: {cycles}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}