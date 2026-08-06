import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RotateCcw, Save } from "lucide-react";
import { setField, resetForm, saveComplaint } from "../store/slices/complaintSlice";
import { resetExtraction } from "../store/slices/aiSlice";
import RiskBadge from "./RiskBadge";

const COMPLAINT_SOURCES = ["Email", "Phone", "Portal", "Field Rep", "Letter"];
const COMPLAINT_TYPES = [
  "Discoloration",
  "Contamination",
  "Packaging Defect",
  "Short Shipment",
  "Assay Out of Specification",
  "Foreign Particulate",
  "Labeling Error",
  "Damaged in Transit",
  "Odor Deviation",
  "Other",
];
const SEVERITIES = ["Critical", "Major", "Minor"];
const PRIORITIES = ["Urgent", "High", "Normal", "Low"];
const UNITS = ["kg", "units", "vials", "tablets", "boxes"];

function Field({ label, hint, aiFilled, span2, children }) {
  return (
    <div className={`field ${span2 ? "span-2" : ""}`}>
      <label>
        {label} {hint && <span className="hint">({hint})</span>}
      </label>
      {children}
      {aiFilled}
    </div>
  );
}

export default function ComplaintForm() {
  const dispatch = useDispatch();
  const form = useSelector((s) => s.complaint.form);
  const aiFieldsFound = useSelector((s) => s.complaint.aiAnalysis?.fields_found || []);
  const saveStatus = useSelector((s) => s.complaint.saveStatus);
  const savedId = useSelector((s) => s.complaint.savedId);
  const risk = useSelector((s) => s.complaint.aiAnalysis?.risk_classification);

  const wasAiFilled = (name) => aiFieldsFound.includes(name);

  const update = (field) => (e) => dispatch(setField({ field, value: e.target.value }));

  const handleReset = () => {
    dispatch(resetForm());
    dispatch(resetExtraction());
  };

  const handleSave = () => dispatch(saveComplaint());

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Log Customer Complaint</h2>
          <div className="panel-subtitle">API &amp; FDF Quality Assurance Module</div>
        </div>
        {savedId ? (
          <span className="status-badge low">Saved</span>
        ) : risk?.risk_level ? (
          <RiskBadge level={risk.risk_level} prefix="AI Risk" />
        ) : (
          <span className="status-badge pending">Pending Triage</span>
        )}
      </div>

      <div className="panel-body">
        {/* 1. ORIGIN & CUSTOMER DETAILS */}
        <div className="form-section">
          <div className="section-label">
            <span className="idx">1</span> Origin &amp; Customer Details
          </div>
          <div className="field-grid">
            <Field label="Complaint Source">
              <select
                value={form.complaint_source}
                onChange={update("complaint_source")}
                className={wasAiFilled("complaint_source") ? "ai-filled" : ""}
              >
                <option value="">Awaiting AI extraction…</option>
                {COMPLAINT_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer Name">
              <input
                type="text"
                placeholder="Awaiting AI extraction…"
                value={form.customer_name}
                onChange={update("customer_name")}
                className={wasAiFilled("customer_name") ? "ai-filled" : ""}
              />
            </Field>
          </div>
        </div>

        {/* 2. PRODUCT & BATCH IDENTIFICATION */}
        <div className="form-section">
          <div className="section-label">
            <span className="idx">2</span> Product &amp; Batch Identification
          </div>
          <div className="field-grid">
            <Field label="Product Name">
              <input
                type="text"
                placeholder="Awaiting AI extraction…"
                value={form.product_name}
                onChange={update("product_name")}
                className={wasAiFilled("product_name") ? "ai-filled" : ""}
              />
            </Field>
            <Field label="Product Strength / Grade">
              <input
                type="text"
                placeholder="Awaiting AI extraction…"
                value={form.product_strength_grade}
                onChange={update("product_strength_grade")}
                className={wasAiFilled("product_strength_grade") ? "ai-filled" : ""}
              />
            </Field>
            <Field label="Batch / Lot Number">
              <input
                type="text"
                placeholder="Awaiting AI extraction…"
                value={form.batch_lot_number}
                onChange={update("batch_lot_number")}
                className={`mono ${wasAiFilled("batch_lot_number") ? "ai-filled" : ""}`}
              />
            </Field>
            <Field label="Manufacturing Date">
              <input
                type="date"
                value={form.manufacturing_date}
                onChange={update("manufacturing_date")}
                className={wasAiFilled("manufacturing_date") ? "ai-filled" : ""}
              />
            </Field>
            <Field label="Expiry Date">
              <input
                type="date"
                value={form.expiry_date}
                onChange={update("expiry_date")}
                className={wasAiFilled("expiry_date") ? "ai-filled" : ""}
              />
            </Field>
            <Field label="Quantity Affected">
              <div className="unit-wrap">
                <input
                  type="text"
                  placeholder="Awaiting AI extraction…"
                  value={form.quantity_affected}
                  onChange={update("quantity_affected")}
                  className={wasAiFilled("quantity_affected") ? "ai-filled" : ""}
                />
                <select value={form.quantity_unit} onChange={update("quantity_unit")}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
        </div>

        {/* 3. COMPLAINT DETAILS */}
        <div className="form-section">
          <div className="section-label">
            <span className="idx">3</span> Complaint Details
          </div>
          <div className="field-grid">
            <Field label="Complaint Type">
              <select
                value={form.complaint_type}
                onChange={update("complaint_type")}
                className={wasAiFilled("complaint_type") ? "ai-filled" : ""}
              >
                <option value="">Awaiting AI extraction…</option>
                {COMPLAINT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Complaint Date">
              <input
                type="date"
                value={form.complaint_date}
                onChange={update("complaint_date")}
                className={wasAiFilled("complaint_date") ? "ai-filled" : ""}
              />
            </Field>
            <Field label="Detailed Complaint Description" span2>
              <textarea
                placeholder="Awaiting AI extraction…"
                value={form.detailed_description}
                onChange={update("detailed_description")}
                className={wasAiFilled("detailed_description") ? "ai-filled" : ""}
              />
            </Field>
          </div>
        </div>

        {/* 4. INITIAL ASSESSMENT & PRIORITY */}
        <div className="form-section">
          <div className="section-label">
            <span className="idx">4</span> Initial Assessment &amp; Priority
          </div>
          <div className="field-grid">
            <Field label="Initial Severity">
              <select
                value={form.initial_severity}
                onChange={update("initial_severity")}
                className={wasAiFilled("initial_severity") ? "ai-filled" : ""}
              >
                <option value="">Awaiting AI extraction…</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={update("priority")}
                className={wasAiFilled("priority") ? "ai-filled" : ""}
              >
                <option value="">Awaiting AI extraction…</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="form-footer">
        <button className="btn btn-ghost" onClick={handleReset} type="button">
          <RotateCcw size={15} /> Reset Form
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          type="button"
          disabled={saveStatus === "loading"}
        >
          <Save size={15} />
          {saveStatus === "loading" ? "Saving…" : "Save Complaint"}
        </button>
      </div>
    </div>
  );
}
