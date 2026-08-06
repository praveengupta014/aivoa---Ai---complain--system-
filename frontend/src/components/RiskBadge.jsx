import React from "react";

const LEVEL_CLASS = {
  Critical: "critical",
  High: "high",
  Major: "high",
  Medium: "medium",
  Moderate: "medium",
  Low: "low",
  Minor: "low",
};

export default function RiskBadge({ level, prefix }) {
  if (!level) return null;
  const cls = LEVEL_CLASS[level] || "medium";
  return (
    <span className={`status-badge ${cls}`}>
      {prefix ? `${prefix} · ` : ""}
      {level}
    </span>
  );
}
