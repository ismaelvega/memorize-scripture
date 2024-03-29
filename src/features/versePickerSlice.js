import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    book: "Libro",
    bookObj: {},
    chapter: "Capítulo",
    chapterObj: {},
    chaptersQuantity: 0,
    verse: "Versículo",
    // versesQuantity: 31,
    verseContent: "",
}

export const versePickerSlice = createSlice({
    name: "versePicker",
    initialState,
    reducers: {
        setBook: (state, action) => {
            state.book = action.payload
        },
        setBookObj: (state, action) => {
            state.bookObj = action.payload
        },
        setChapter: (state, action) => {
            state.chapter = action.payload
        },
        setChapterObj: (state, action) => {
            state.chapterObj = action.payload
        },
        // setChaptersQuantity: (state, action) => {
        //     state.chaptersQuantity = action.payload
        // },
        setVerse: (state, action) => {
            state.verse = action.payload
        },
        setVersesQuantity: (state, action) => {
            state.versesQuantity = action.payload
        },
        setVerseContent: (state, action) => {
            state.verseContent = action.payload
        }
    }
})

export const {
    setBook,
    setBookObj,
    setChapter,
    setChapterObj,
    setChaptersQuantity,
    setVerse,
    setVersesQuantity,
    setVerseContent
 } = versePickerSlice.actions

export default versePickerSlice.reducer