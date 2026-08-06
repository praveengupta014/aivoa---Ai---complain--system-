import React from "react";
import Header from "./components/Header";
import ComplaintForm from "./components/ComplaintForm";
import AIIntakeAssistant from "./components/AIIntakeAssistant";
import "./App.css";

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-grid">
        <ComplaintForm />
        <AIIntakeAssistant />
      </main>
    </div>
  );
}
