'use client'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import removeBreakLinesFromString from '@/util/removeBreakLinesFromString'
import { useSelector, useDispatch } from 'react-redux'
import {
  setBook,
  setBookObj,
  setChapter,
  setChapterObj,
  setVerse,
  setVersesQuantity,
  setVerseContent
} from '@/features/versePickerSlice.js'
import {
  // setVerseContent,
  setVersesChunks
} from "@/features/versesChunksSlice.js";
import { VerseContainer } from '../VerseContainer/VerseContainer'

export const VersePicker = () => {
  const [books, setBooks] = useState([])
  const [chaptersQuantity, setChaptersQuantity] = useState(0)
  const dispatch = useDispatch()
  const versesQuantity = useSelector((state) => state.versePicker.versesQuantity)
  const verseContent = useSelector((state) => state.versePicker.verseContent)
  const book = useSelector((state) => state.versePicker.book)
  const bookObj = useSelector((state) => state.versePicker.bookObj)
  const chapter = useSelector((state) => state.versePicker.chapter)
  const chapterObj = useSelector((state) => state.versePicker.chapterObj)
  const verse = useSelector((state) => state.versePicker.verse)


  // based on the selected book, store the book object in state
  function handleBookChange(e) {
    const bookName = e.target.value
    if (bookName === 'Libro') return

    // When book changes:
    // reset the book to Libro
    // reset the chapter to Capítulo
    // reset chapter object to an empty object
    // reset verse to Versículo
    // reset verses quantity to 0
    // reset verse content to an empty string
    dispatch(setBook('Libro'))
    dispatch(setChapter('Capítulo'))
    dispatch(setChapterObj({}))
    dispatch(setVerse('Versículo'))
    dispatch(setVersesQuantity(0))
    dispatch(setVerseContent(''))

    // reset verses chunks to an empty array
    dispatch(setVersesChunks([]))

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

    // When chapter changes:
    // reset the chapter to Capítulo
    // reset chapter object to an empty object
    // reset verse to Versículo
    // reset verses quantity to 0
    // reset verse content to an empty string
    dispatch(setChapter('Capítulo'))
    dispatch(setChapterObj({}))
    dispatch(setVerse('Versículo'))
    dispatch(setVersesQuantity(0))
    dispatch(setVerseContent(''))

    // reset verses chunks to an empty array
    dispatch(setVersesChunks([]))

    // set the chapter in state
    dispatch(setChapter(chapter))

    const rawChapterObj = await fetchChapter({ chapter: chapter, book: bookObj.key})
    console.log(rawChapterObj)

    dispatch(setChapterObj(rawChapterObj))
    dispatch(setVersesQuantity(rawChapterObj.length))
  }

  async function handleVerseChange(e) {
    const verseNumber = e.target.value
    if (verseNumber === 'Versículo') return

    dispatch(setVerse(verseNumber))
    dispatch(setVerseContent(removeBreakLinesFromString(chapterObj[verseNumber - 1])))

    // reset verses chunks to an empty array
    dispatch(setVersesChunks([]))
  }

  async function fetchBooks() {
    const response = await fetch('bible_data/_index.json')
    const data = await response.json()

    setBooks(data)
  }

  async function fetchChapter({ chapter, book}){
    const response = await fetch(`bible_data/${book}.json`)
    const bookChapters = await response.json()
    const chapterObj = bookChapters[chapter - 1]

    return chapterObj
  }

  // when the component mounts, fetch the books
  useEffect(() => {
    fetchBooks()
  }, [])


  return (
    <div>

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
            )
          }
      </form>

      {
        // If verseContent is not empty, show the verse
        verseContent && (
            <VerseContainer />
        )
      }
    </div>
  )
}
