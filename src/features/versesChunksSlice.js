import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    verseContent: "",
    versesChunks: [],
}

export const versesChunksSlice = createSlice({
    name: "versesChunks",
    initialState,
    reducers: {
        setVerseContent: (state, action) => {
            state.verseContent = action.payload
        },
        setVersesChunks: (state, action) => {
            state.versesChunks = action.payload
        }
    }
})

export const {
    setVerseContent,
    setVersesChunks
 } = versesChunksSlice.actions

export default versesChunksSlice.reducer