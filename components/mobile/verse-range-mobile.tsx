"use client";
import * as React from 'react';
import { useFlow } from './flow';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '../ui/primitives';

interface BookDataCache { [key: string]: string[][] }

export const VerseRangeMobile: React.FC = () => {
  const { state, dispatch } = useFlow();
  const book = state.book!;
  const [bookData, setBookData] = React.useState<string[][] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cacheRef = React.useRef<BookDataCache>({});
  const chapter = state.chapter!; // 1-based
  const start = state.verseStart; // 1-based
  const end = state.verseEnd; // 1-based

  React.useEffect(()=>{
    let active = true;
    async function load(){
      if (cacheRef.current[book.key]) { setBookData(cacheRef.current[book.key]); return; }
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/bible_data/${book.key}.json`);
        if(!res.ok) throw new Error('Fallo al cargar libro');
        const data = await res.json();
        cacheRef.current[book.key] = data;
        if(active) setBookData(data);
      } catch(e:any){ if(active) setError(e.message); }
      finally { if(active) setLoading(false); }
    }
    load();
    return ()=> { active = false; };
  }, [book.key]);

  function cleanText(raw: string) { return raw.replace(/\s*\/n\s*/gi,' ').replace(/_/g,'').replace(/\s+/g,' ').trim(); }

  function toggleVerse(vIdx: number){
    const vNum = vIdx + 1; // 1-based
    if (start == null || end == null) {
      dispatch({ type:'SET_RANGE', start: vNum, end: vNum });
      return;
    }

    // Single verse currently selected
    if (start === end) {
      if (vNum === start) { // deselect
        dispatch({ type:'CLEAR_RANGE' });
        return;
      }
      if (vNum === start + 1) { dispatch({ type:'SET_RANGE', start, end: vNum }); return; }
      if (vNum === start - 1) { dispatch({ type:'SET_RANGE', start: vNum, end: start }); return; }
  // Non-adjacent second tap creates a full range between the two verses (inclusive)
  const newStart = Math.min(start, vNum);
  const newEnd = Math.max(start, vNum);
  dispatch({ type:'SET_RANGE', start: newStart, end: newEnd });
      return;
    }

    // Existing range length > 1
    // If click start or end again -> collapse inward (deselect boundary) or if both become same then clear
    if (vNum === start) {
      if (start === end) { dispatch({ type:'CLEAR_RANGE' }); } else { dispatch({ type:'SET_RANGE', start: start + 1, end }); }
      return;
    }
    if (vNum === end) {
      if (start === end) { dispatch({ type:'CLEAR_RANGE' }); } else { dispatch({ type:'SET_RANGE', start, end: end - 1 }); }
      return;
    }
    // Click inside (not boundaries) clears entire selection per spec
    if (vNum > start && vNum < end) {
      dispatch({ type:'CLEAR_RANGE' });
      return;
    }
    if (vNum === end + 1) { // extend forward consecutively
      dispatch({ type:'SET_RANGE', start, end: vNum });
      return;
    }
    if (vNum === start - 1) { // extend backwards consecutively
      dispatch({ type:'SET_RANGE', start: vNum, end });
      return;
    }

    // Non-adjacent outside range -> reset to new single selection
    if (vNum < start - 1 || vNum > end + 1) {
      dispatch({ type:'SET_RANGE', start: vNum, end: vNum });
      return;
    }

    // Inside current range or adjacent (should already have been handled) -> do nothing
  }

  // Push cleaned chapter verses to flow state when available
  React.useEffect(()=>{
    if (bookData) {
      const cleaned = (bookData[chapter-1]||[]).map(v=> cleanText(v));
      dispatch({ type:'SET_CHAPTER_VERSES', verses: cleaned });
    }
  }, [bookData, chapter, dispatch]);

  const verses = bookData? (bookData[chapter-1] || []) : [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{book.shortTitle} {chapter} · Versículos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        {loading && <div className="p-4 space-y-2">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-5 w-full" />)}</div>}
        {error && <div className="p-4 text-xs text-red-600">{error}</div>}
        {!loading && !error && (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {verses.map((v,i)=>{
              const isIn = start!=null && end!=null && i+1>=start && i+1<=end;
              return (
                <button key={i} onClick={()=> toggleVerse(i)} className={`w-full text-left px-3 py-2 text-xs leading-snug relative ${isIn? 'bg-neutral-100 dark:bg-neutral-800/60 font-medium':''}`}>
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

