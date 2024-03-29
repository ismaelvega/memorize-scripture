import { configureStore } from "@reduxjs/toolkit";
import versePickerReducer from "../features/versePickerSlice";

export const store = configureStore({
    reducer: {
        versePicker: versePickerReducer,
    }
})