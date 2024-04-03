'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  setBook,
  setBookObj,
  setChapter,
  setChapterObj,
  // setChaptersQuantity,
  setVerse,
  setVersesQuantity,
  setVerseContent
} from '@/features/versePickerSlice.js'

export const VersePicker = () => {
  const [books, setBooks] = useState([])
  const [chaptersQuantity, setChaptersQuantity] = useState(0)
  const dispatch = useDispatch()
  // const chaptersQuantity = useSelector((state) => state.versePicker.chapterQuantity)
  const versesQuantity = useSelector((state) => state.versePicker.versesQuantity)
  const verseContent = useSelector((state) => state.versePicker.verseContent)
  const book = useSelector((state) => state.versePicker.book)
  const bookObj = useSelector((state) => state.versePicker.bookObj)
  const chapter = useSelector((state) => state.versePicker.chapter)
  const chapterObj = useSelector((state) => state.versePicker.chapterObj)
  const verse = useSelector((state) => state.versePicker.verse)

  // console.log('book', book)

  // based on the selected book, store the book object in state
  function handleBookChange(e) {
    const bookName = e.target.value
    if (bookName === 'Libro') return

    // reset the book to Libro when the book changes
    // reset the chapter to Capítulo when the book changes
    // reset chapter object to an empty object
    // reset verse to Versículo when the book changes
    // reset verses quantity to 0 when the book changes
    // reset verse content to an empty string
    dispatch(setBook('Libro'))
    dispatch(setChapter('Capítulo'))
    dispatch(setChapterObj({}))
    dispatch(setVerse('Versículo'))
    dispatch(setVersesQuantity(0))
    dispatch(setVerseContent(''))

    dispatch(setBook(bookName))

    const bookObj = books.find((book) => book.shortTitle === bookName)
    dispatch(setBookObj(bookObj))
    setChaptersQuantity(bookObj.chapters)

    console.log('bookName', bookName)
    console.log('bookObj', bookObj)
  }

  async function handleChapterChange(e) {
    const chapter = e.target.value
    if (chapter === 'Capítulo') return

    // reset the chapter to Capítulo when the book changes
    // reset chapter object to an empty object
    // reset verse to Versículo when the book changes
    // reset verses quantity to 0 when the book changes
    // reset verse content to an empty string
    dispatch(setChapter('Capítulo'))
    dispatch(setChapterObj({}))
    dispatch(setVerse('Versículo'))
    dispatch(setVersesQuantity(0))
    dispatch(setVerseContent(''))

    // set the chapter in state
    dispatch(setChapter(chapter))

    const rawChapterObj = await fetchChapter({ chapter: chapter, book: bookObj.key})
    console.log(rawChapterObj.data)

    dispatch(setChapterObj(rawChapterObj.data))
    dispatch(setVersesQuantity(rawChapterObj.data.length))
  }

  function handleVerseChange(e) {
    const verse = e.target.value
    if (verse === 'Versículo') return

    dispatch(setVerse(verse))
    dispatch(setVerseContent(chapterObj[verse - 1]))
  }

  async function fetchBooks() {
    const response = await fetch('api/getIndex')
    const data = await response.json()

    setBooks(data.data)
  }

  async function fetchChapter({ chapter, book}){
    const response = await fetch(`api/getChapter?book=${book}&chapter=${chapter}`)
    const chapterObj = await response.json()

    return chapterObj
  }

  // when the component mounts, fetch the books
  useEffect(() => {
    fetchBooks()
  }, [])


  return (
    <form action="">
        <select
          name="book"
          id="book"
          className='text-black'
          value={book}
          onChange={handleBookChange}
        >
            <option value="Libro">Libro</option>
            {books && books.map((book) => (
                <option key={book.id} value={book.shortTitle}>{book.shortTitle}</option>
            ))}
        </select>
        <select
          name="chapter"
          id="chapter"
          value={chapter}
          onChange={handleChapterChange}
          className='text-black'
        >
          <option value="Capítulo">Capítulo</option>
            {
              chaptersQuantity && Array(chaptersQuantity).fill(0).map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))
            }
        </select>
        {
          versesQuantity !== 0 && (
            <Suspense fallback={<h1>awantala</h1>}>
              <select
                name="verse"
                id="verse"
                value={verse}
                onChange={handleVerseChange}
                className='text-black'
              >
                <option value="Versículo">Versículo</option>
                  {
                    versesQuantity && Array(versesQuantity).fill(0).map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1}</option>
                    ))
                  }
            </select>
            </Suspense>
          )
        }

        {
          verseContent && <h1>{bookObj.shortTitle} {chapter}:{verse} - {verseContent}</h1>
        }
    </form>
  )
}
