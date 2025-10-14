"use client";
import * as React from 'react';
import { shallow } from 'zustand/shallow';
import { useFlowStore } from './flow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BookDataCache { [key: string]: string[][] }

export const VerseRangeMobile: React.FC = () => {
  const {
    book,
    chapter,
    verseStart,
    verseEnd,
    setRange,
    clearRange,
    setChapterVerses,
  } = useFlowStore(
    (state) => ({
      book: state.book,
      chapter: state.chapter,
      verseStart: state.verseStart,
      verseEnd: state.verseEnd,
      setRange: state.setRange,
      clearRange: state.clearRange,
      setChapterVerses: state.setChapterVerses,
    }),
    shallow,
  );
  const [bookData, setBookData] = React.useState<string[][] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cacheRef = React.useRef<BookDataCache>({});
  const currentChapter = chapter ?? null; // 1-based
  const start = verseStart; // 1-based
  const end = verseEnd; // 1-based

  React.useEffect(()=>{
    const b = book;
    if (!b) return;
    const key = b.key;
    let active = true;
    async function load(k: string){
      if (cacheRef.current[k]) { setBookData(cacheRef.current[k]); return; }
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/bible_data/${k}.json`);
        if(!res.ok) throw new Error('Fallo al cargar libro');
        const data = await res.json();
        cacheRef.current[k] = data;
        if(active) setBookData(data);
      } catch(e:any){ if(active) setError(e.message); }
      finally { if(active) setLoading(false); }
    }
    load(key);
    return ()=> { active = false; };
  }, [book]);

  function cleanText(raw: string) { return raw.replace(/\s*\/n\s*/gi,' ').replace(/_/g,'').replace(/\s+/g,' ').trim(); }

  function toggleVerse(vIdx: number) {
    const vNum = vIdx + 1; // 1-based
    if (start == null || end == null) {
      setRange(vNum, vNum);
      return;
    }

    // Single verse currently selected
    if (start === end) {
      if (vNum === start) {
        clearRange();
        return;
      }
      if (vNum === start + 1) {
        setRange(start, vNum);
        return;
      }
      if (vNum === start - 1) {
        setRange(vNum, start);
        return;
      }
      // Non-adjacent second tap creates a full range between the two verses (inclusive)
      const newStart = Math.min(start, vNum);
      const newEnd = Math.max(start, vNum);
      setRange(newStart, newEnd);
      return;
    }

    // Existing range length > 1
    // If click start or end again -> collapse inward (deselect boundary) or if both become same then clear
    if (vNum === start) {
      if (start === end) {
        clearRange();
      } else {
        setRange(start + 1, end);
      }
      return;
    }
    if (vNum === end) {
      if (start === end) {
        clearRange();
      } else {
        setRange(start, end - 1);
      }
      return;
    }
    // Click inside (not boundaries) clears entire selection per spec
    if (vNum > start && vNum < end) {
      clearRange();
      return;
    }
    if (vNum === end + 1) {
      setRange(start, vNum);
      return;
    }
    if (vNum === start - 1) {
      setRange(vNum, end);
      return;
    }

    // Non-adjacent outside range -> reset to new single selection
    if (vNum < start - 1 || vNum > end + 1) {
      setRange(vNum, vNum);
    }
    // Inside current range or adjacent (should already have been handled) -> do nothing
  }

  // Push cleaned chapter verses to flow state when available
  React.useEffect(()=>{
    if (bookData && currentChapter!=null) {
      const cleaned = (bookData[currentChapter-1]||[]).map(v=> cleanText(v));
      setChapterVerses(cleaned);
    }
  }, [bookData, currentChapter, setChapterVerses]);

  const verses = (bookData && currentChapter!=null)? (bookData[currentChapter-1] || []) : [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{book?.shortTitle || 'Libro'} {currentChapter || ''} · Versículos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        {loading && <div className="p-4 space-y-2">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-5 w-full" />)}</div>}
        {error && <div className="p-4 text-xs text-red-600">{error}</div>}
        {!loading && !error && (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {verses.map((v,i)=>{
              const isIn = start!=null && end!=null && i+1>=start && i+1<=end;
              return (
                <button
                  key={i}
                  onClick={()=> toggleVerse(i)}
                  className={`w-full text-left px-3 py-2 text-xs leading-snug relative transition-colors transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 active:scale-[0.99] ${isIn? 'bg-neutral-100 dark:bg-neutral-800/60 font-medium':''}`}
                >
                  <span className="text-neutral-500 mr-2 select-none inline-block w-6 text-right">{i+1}</span>
                  <span className="whitespace-normal break-words">{cleanText(v)}</span>
                  {isIn && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
      <div className="p-2 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>{start? `Seleccionado: ${start}${end && end>start? '-' + end:''}`: 'Toca un versículo para comenzar'}</span>
        {start && end && <span>{end-start+1} vers.</span>}
      </div>
  <div className="h-6" />
    </Card>
  );
};
// Confirmation handled by BottomBar.

