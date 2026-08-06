import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/client";

export const EMPTY_FORM = {
  complaint_source: "",
  customer_name: "",
  product_name: "",
  product_strength_grade: "",
  batch_lot_number: "",
  manufacturing_date: "",
  expiry_date: "",
  quantity_affected: "",
  quantity_unit: "kg",
  complaint_type: "",
  complaint_date: "",
  detailed_description: "",
  initial_severity: "",
  priority: "",
};

export const saveComplaint = createAsyncThunk(
  "complaint/save",
  async (_, { getState }) => {
    const { form, aiAnalysis, extractionConfidence, sourceText, sourceDocName } =
      getState().complaint;
    const payload = {
      ...form,
      ai_analysis: aiAnalysis,
      extraction_confidence: extractionConfidence,
      source_document_text: sourceText || null,
      source_document_name: sourceDocName || null,
    };
    const { data } = await api.post("/api/complaints", payload);
    return data;
  }
);

export const fetchComplaints = createAsyncThunk("complaint/fetchAll", async () => {
  const { data } = await api.get("/api/complaints");
  return data;
});

const complaintSlice = createSlice({
  name: "complaint",
  initialState: {
    form: { ...EMPTY_FORM },
    aiAnalysis: null,
    extractionConfidence: null,
    sourceText: "",
    sourceDocName: "",
    savedId: null,
    savedList: [],
    saveStatus: "idle", // idle | loading | succeeded | failed
  },
  reducers: {
    setField(state, action) {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    applyExtractedFields(state, action) {
      const { fields, confidence, ai_analysis, sourceText, sourceDocName } = action.payload;
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key in state.form) {
          state.form[key] = value;
        }
      });
      state.aiAnalysis = ai_analysis;
      state.extractionConfidence = confidence;
      state.sourceText = sourceText || "";
      state.sourceDocName = sourceDocName || "";
    },
    resetForm(state) {
      state.form = { ...EMPTY_FORM };
      state.aiAnalysis = null;
      state.extractionConfidence = null;
      state.sourceText = "";
      state.sourceDocName = "";
      state.savedId = null;
      state.saveStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveComplaint.pending, (state) => {
        state.saveStatus = "loading";
      })
      .addCase(saveComplaint.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        state.savedId = action.payload.id;
      })
      .addCase(saveComplaint.rejected, (state) => {
        state.saveStatus = "failed";
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.savedList = action.payload;
      });
  },
});

export const { setField, applyExtractedFields, resetForm } = complaintSlice.actions;
export default complaintSlice.reducer;
