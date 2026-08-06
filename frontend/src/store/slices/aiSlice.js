import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/client";

export const extractFromFile = createAsyncThunk(
  "ai/extractFromFile",
  async (file, { dispatch }) => {
    dispatch(setProgress(10));
    dispatch(setStage("Analyzing document content and extracting key details…"));

    const formData = new FormData();
    formData.append("file", file);

    dispatch(setProgress(35));
    const { data } = await api.post("/api/ai/extract/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(setProgress(100));
    return { ...data, sourceDocName: file.name };
  }
);

export const extractFromText = createAsyncThunk(
  "ai/extractFromText",
  async (text, { dispatch }) => {
    dispatch(setProgress(15));
    dispatch(setStage("Analyzing pasted text and extracting key details…"));
    dispatch(setProgress(45));
    const { data } = await api.post("/api/ai/extract/text", { text });
    dispatch(setProgress(100));
    return { ...data, sourceText: text };
  }
);

export const sendChatMessage = createAsyncThunk(
  "ai/sendChatMessage",
  async ({ message, complaintId, formSnapshot }) => {
    const { data } = await api.post("/api/ai/chat", {
      message,
      complaint_id: complaintId || null,
      form_snapshot: formSnapshot || null,
    });
    return { question: message, reply: data.reply };
  }
);

const aiSlice = createSlice({
  name: "ai",
  initialState: {
    progress: 0,
    stage: "",
    status: "idle", // idle | extracting | done | error
    errorMessage: "",
    chatMessages: [
      {
        role: "assistant",
        content:
          "Upload a complaint document or paste text above. I will automatically extract the details and populate the form for you.",
      },
    ],
    chatStatus: "idle",
  },
  reducers: {
    setProgress(state, action) {
      state.progress = action.payload;
    },
    setStage(state, action) {
      state.stage = action.payload;
    },
    resetExtraction(state) {
      state.progress = 0;
      state.stage = "";
      state.status = "idle";
      state.errorMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(extractFromFile.pending, (state) => {
        state.status = "extracting";
        state.errorMessage = "";
      })
      .addCase(extractFromFile.fulfilled, (state) => {
        state.status = "done";
      })
      .addCase(extractFromFile.rejected, (state, action) => {
        state.status = "error";
        state.errorMessage = action.error.message || "Extraction failed.";
      })
      .addCase(extractFromText.pending, (state) => {
        state.status = "extracting";
        state.errorMessage = "";
      })
      .addCase(extractFromText.fulfilled, (state) => {
        state.status = "done";
      })
      .addCase(extractFromText.rejected, (state, action) => {
        state.status = "error";
        state.errorMessage = action.error.message || "Extraction failed.";
      })
      .addCase(sendChatMessage.pending, (state, action) => {
        state.chatStatus = "loading";
        state.chatMessages.push({ role: "user", content: action.meta.arg.message });
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatStatus = "idle";
        state.chatMessages.push({ role: "assistant", content: action.payload.reply });
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.chatStatus = "idle";
        state.chatMessages.push({
          role: "assistant",
          content: "Sorry, I couldn't process that just now. Please try again.",
        });
      });
  },
});

export const { setProgress, setStage, resetExtraction } = aiSlice.actions;
export default aiSlice.reducer;
