'use client'
import React, { useState, useEffect } from 'react'

export const VersePicker = () => {
  const [books, setBooks] = useState([])
  const [chapters, setChapters] = useState(0)
  const [verses, setVerses] = useState(0)
  const [book, setBook] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [chapterObj, setChapterObj] = useState({})
  const [verse, setVerse] = useState(1)
  const [verseContent, setVerseContent] = useState('')

  // based on the selected book, store the book object in state
  function handleBookChange(e) {
    const bookName = e.target.value
    const bookObj = books.find((book) => book.names[0] === bookName)

    setBook(bookObj) // store the book object in state
    setChapters(bookObj.chapters) // set the number of chapters for the selected book
    
    // when the book changes, reset the chapter and verse content, and set the chapter to Capítulo
    setVerseContent(null)
    setChapter('Capítulo')
  }

  async function handleChapterChange(e) {
    // resete the verse content when the chapter changes
    setVerse('Versículo')
    setVerseContent(null)

    const chapter = e.target.value
    setChapter(chapter)
    const chapterObj = await fetchChapter({ chapter })
    setChapterObj(chapterObj)
    setVerses(chapterObj.vers.length) // given the chapter object, set the number of verses
  }

  function handleVerseChange(e) {
    const verse = e.target.value
    setVerse(verse)

    // when the book, chapter, and verse are selected, set the verse content
    setVerseContent(chapterObj.vers[verse - 1].verse)
  }

  async function fetchBooks() {
    const response = await fetch('https://bible-api.deno.dev/api/books')

    const data = await response.json()
    setBooks(data)
  }

  async function fetchChapter({ chapter }){
    // https://bible-api.deno.dev/api/read/rv1960/gn/1
    const response = await fetch(`https://bible-api.deno.dev/api/read/rv1960/${book.abrev}/${chapter}`)
    const chapterObj = await response.json()

    return chapterObj
  }

  async function fetchGen11(){
    const response = await fetch(`https://bible-api.deno.dev/api/read/rv1960/gn/1`)
    const chapterObj = await response.json()
    // console.log(chapterObj)

    setVerseContent(chapterObj.vers[0].verse)
    return chapterObj
  }

  // when the component mounts, fetch the books
  useEffect(() => {
    fetchBooks()
    // fetchGen11()
  }, [])


  return (
    <form action="">
        <select
          name="book"
          id="book"
          className='text-black'
          value={book && book?.names[0]}
          onChange={handleBookChange}
        >
            <option value="Seleccione">Libro</option>
            {books && books.map((book) => (
                <option key={book.id} value={book.names[0]}>{book.names[0]}</option>
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
              chapters && Array(chapters).fill(0).map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))
            }
        </select>
        <select
          name="verse"
          id="verse"
          value={verse}
          onChange={handleVerseChange}
          className='text-black'
        >
          <option value="Versículo">Versículo</option>
            {
              verses && Array(verses).fill(0).map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))
            }
        </select>

        {
          verseContent && <h1>{book?.names[0]} {chapter}:{verse} - {verseContent}</h1>
        }
    </form>
  )
}
