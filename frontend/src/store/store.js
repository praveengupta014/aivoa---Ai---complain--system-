import { configureStore } from "@reduxjs/toolkit";
import complaintReducer from "./slices/complaintSlice";
import aiReducer from "./slices/aiSlice";

export const store = configureStore({
  reducer: {
    complaint: complaintReducer,
    ai: aiReducer,
  },
});
