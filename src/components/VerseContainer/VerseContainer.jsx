'use client'
import { VersesChunksContainer } from "@/components/VersesChunksContainer/VersesChunksContainer"
import axios from "axios"
import { useSelector, useDispatch} from "react-redux"
import removeBreakLinesFromString from "@/util/removeBreakLinesFromString"
import { setVersesChunks } from "@/features/versesChunksSlice"

export const VerseContainer = () => {
  const book = useSelector((state) => state.versePicker.book)
  const chapter = useSelector((state) => state.versePicker.chapter)
  const verse = useSelector((state) => state.versePicker.verse)
  const versesChunks = useSelector((state) => state.versesChunks.versesChunks)
  const verseContent = useSelector((state) => state.versePicker.verseContent)

  const dispatch = useDispatch()

  const generateChunks = async (e) => {
    // in order to avoid making multiple requests at the same time
    disableButton(e)
    if (versesChunks.length > 0) return

    dispatch(setVersesChunks(await fetchVersesChunks({
      book,
      chapter,
      verse,
      verseContent: removeBreakLinesFromString(verseContent)
    })))
  }

  const disableButton = (e) => {
    const buttonElement = e.target
    buttonElement.disabled = true
    buttonElement.style.cursor = 'not-allowed'
  }

  async function fetchVersesChunks({ book, chapter, verse, verseContent}) {
    const response = await axios.get('api/getVersesChunks', {
      params: {
        book,
        chapter,
        verse,
        verseContent
      }
    })

    console.log('Verses Chunks: ', response.data.data)

    return response.data.data.versesChunks
  }

  return (
    <div className="my-4">
        <h1 className="text-red-500 font-bold">Verse</h1>
        <div className="px-4">
          <h1 className="font-bold">{book} {chapter} : {verse}</h1>
          <p className="">{verseContent}</p>
          <a
            className="font-bold flex py-4 text-blue-300 hover:text-blue-700"
            href={`https://www.biblegateway.com/passage/?search=${book.replace(' ', '%20')}%20${chapter}&version=RVR1960`}
            target="_blank"
            >Leer capítulo</a>
        </div>

        {/* If the verses' chunks are not generated, show the button */}
        {
          versesChunks.length === 0 && (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 my-5 px-4 border border-blue-700 rounded"
            onClick={generateChunks}
            >
              Separar versículo
          </button>
          )
        }

        {/* If the verses' chunks are generated, show the chunks */}
        {
          versesChunks.length > 0 && (
              <VersesChunksContainer />
          )
        }
    </div>
  )
}
