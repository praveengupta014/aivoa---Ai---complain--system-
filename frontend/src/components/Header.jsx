import React from "react";

export default function Header() {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="mark">
          AIV<span>OA</span>.AI
        </span>
        <span className="sub">Complaint Management · API &amp; FDF Quality Assurance</span>
      </div>
      <div className="topbar-meta">
        <span>
          Module: <b>Customer Complaints</b>
        </span>
        <span>
          Today: <b>{today}</b>
        </span>
      </div>
    </header>
  );
}
