import { configureStore } from "@reduxjs/toolkit";
import versePickerReducer from "../features/versePickerSlice";
import versesChunksSlice from "@/features/versesChunksSlice";

export const store = configureStore({
    reducer: {
        versePicker: versePickerReducer,
        versesChunks: versesChunksSlice,
    }
})