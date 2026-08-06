import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Sparkles,
  UploadCloud,
  FileText,
  Send,
  ShieldAlert,
  ClipboardCheck,
  Wrench,
  Copy,
  FileSearch,
} from "lucide-react";
import { extractFromFile, extractFromText, sendChatMessage } from "../store/slices/aiSlice";
import { applyExtractedFields } from "../store/slices/complaintSlice";
import RiskBadge from "./RiskBadge";

function ExtractionProgress() {
  const { progress, stage, status } = useSelector((s) => s.ai);
  if (status !== "extracting" && status !== "done") return null;

  return (
    <div className="progress-block">
      <div className="progress-label">
        <span>Extraction Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      {status === "extracting" && <div className="progress-status">{stage}</div>}
      {status === "done" && (
        <div className="progress-status">Form populated. Review the highlighted fields on the left.</div>
      )}
    </div>
  );
}

function UploadZone() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const runFileExtraction = async (file) => {
    const result = await dispatch(extractFromFile(file)).unwrap();
    dispatch(
      applyExtractedFields({
        fields: result.fields,
        confidence: result.confidence,
        ai_analysis: result.ai_analysis,
        sourceDocName: result.sourceDocName,
      })
    );
  };

  const runTextExtraction = async () => {
    if (!pasteText.trim()) return;
    const result = await dispatch(extractFromText(pasteText)).unwrap();
    dispatch(
      applyExtractedFields({
        fields: result.fields,
        confidence: result.confidence,
        ai_analysis: result.ai_analysis,
        sourceText: pasteText,
      })
    );
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runFileExtraction(file);
  };

  return (
    <>
      <div
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <UploadCloud size={22} style={{ marginBottom: 6, color: "var(--signal-teal)" }} />
        <div className="dz-title">Drag &amp; drop complaint document here</div>
        <div className="dz-sub">or click to browse</div>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.docx,.txt,.eml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) runFileExtraction(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="hint-banner">
        <FileText size={13} style={{ marginTop: 1, flexShrink: 0 }} />
        Supported formats: PDF, DOCX, TXT, EML · Max file size: 10MB
      </div>

      <div className="or-divider">or</div>

      <div className="paste-box">
        <textarea
          placeholder="Paste complaint text or email content here…"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <button className="btn btn-primary" type="button" onClick={runTextExtraction}>
            <FileSearch size={14} /> Extract from Text
          </button>
        </div>
      </div>
    </>
  );
}

function Copilot() {
  const dispatch = useDispatch();
  const [input, setInput] = useState("");
  const chatMessages = useSelector((s) => s.ai.chatMessages);
  const chatStatus = useSelector((s) => s.ai.chatStatus);
  const savedId = useSelector((s) => s.complaint.savedId);
  const form = useSelector((s) => s.complaint.form);

  const send = () => {
    if (!input.trim() || chatStatus === "loading") return;
    dispatch(sendChatMessage({ message: input, complaintId: savedId, formSnapshot: form }));
    setInput("");
  };

  return (
    <div className="copilot">
      <div className="copilot-label">AI Assistant</div>
      <div className="chat-thread">
        {chatMessages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {chatStatus === "loading" && <div className="chat-bubble assistant">Thinking…</div>}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Ask me anything about this complaint…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="chat-send" onClick={send} disabled={chatStatus === "loading"}>
          <Send size={15} />
        </button>
      </div>
      <div className="disclaimer">AI responses may contain errors. Please verify information.</div>
    </div>
  );
}

function AnalysisPanel() {
  const analysis = useSelector((s) => s.complaint.aiAnalysis);
  if (!analysis) return null;

  const { risk_classification, completeness, root_cause_suggestions, capa_suggestions, duplicate_matches, summary } =
    analysis;

  return (
    <div className="analysis-panel">
      {summary && (
        <div className="analysis-card">
          <div className="analysis-card-title">
            <Sparkles size={14} color="var(--signal-teal)" /> Complaint Summary
          </div>
          <p>{summary}</p>
        </div>
      )}

      {risk_classification && (
        <div className="analysis-card">
          <div className="analysis-card-title">
            <ShieldAlert size={14} color="var(--signal-red)" /> AI Risk Classification
          </div>
          <div style={{ marginBottom: 8 }}>
            <RiskBadge level={risk_classification.risk_level} />
          </div>
          <p>{risk_classification.rationale}</p>
          <span className="chip">Patient impact: {risk_classification.patient_safety_impact}</span>
          <span className="chip">{risk_classification.regulatory_reportability}</span>
        </div>
      )}

      {completeness && (
        <div className="analysis-card">
          <div className="analysis-card-title">
            <ClipboardCheck size={14} color="var(--signal-blue)" /> Completeness Check
          </div>
          <p>Score: {Math.round((completeness.completeness_score || 0) * 100)}%</p>
          {completeness.missing_fields?.length > 0 && (
            <ul>
              {completeness.missing_fields.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {root_cause_suggestions?.length > 0 && (
        <div className="analysis-card">
          <div className="analysis-card-title">
            <Wrench size={14} color="var(--signal-amber)" /> Root Cause Hypotheses
          </div>
          <ul>
            {root_cause_suggestions.map((r, i) => (
              <li key={i}>
                {r.hypothesis} <span className="chip">{r.category}</span>
                <span className="chip">{r.likelihood}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {capa_suggestions && (
        <div className="analysis-card">
          <div className="analysis-card-title">
            <ClipboardCheck size={14} color="var(--signal-green)" /> CAPA Recommendations
          </div>
          {capa_suggestions.immediate_actions?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>Immediate</p>
              <ul>
                {capa_suggestions.immediate_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {capa_suggestions.corrective_actions?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>Corrective</p>
              <ul>
                {capa_suggestions.corrective_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {capa_suggestions.preventive_actions?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>Preventive</p>
              <ul>
                {capa_suggestions.preventive_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {duplicate_matches?.length > 0 && (
        <div className="analysis-card">
          <div className="analysis-card-title">
            <Copy size={14} color="var(--slate-600)" /> Possible Duplicate Complaints
          </div>
          <ul>
            {duplicate_matches.map((d, i) => (
              <li key={i}>
                #{d.complaint_id.slice(0, 8)} — {d.reason}{" "}
                <span className="chip">{Math.round(d.similarity * 100)}% match</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AIIntakeAssistant() {
  return (
    <div className="panel">
      <div className="panel-header ai-panel-header">
        <div>
          <h2 className="panel-title">
            <Sparkles size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
            AI Complaint Intake Assistant
          </h2>
          <div className="panel-subtitle">LangGraph · Groq</div>
        </div>
        <span className="beta-tag">BETA</span>
      </div>

      <div className="panel-body">
        <UploadZone />
        <ExtractionProgress />
        <AnalysisPanel />
      </div>

      <Copilot />
    </div>
  );
}
