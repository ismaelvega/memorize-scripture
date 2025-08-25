"use client";
import * as React from 'react';
import { Verse } from '../lib/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Separator, TooltipIconButton } from './ui/primitives';
import { useToast } from './ui/toast';
import { Eye, EyeOff, X, RefreshCcw } from 'lucide-react';

// English seed verses removed – Spanish dataset only

interface BookIndexEntry {
  testament: string;
  title: string;
  shortTitle: string;
  abbr: string;
  category: string;
  key: string; // file key
  number: number;
  chapters: number;
  verses: number;
}

interface VersePickerProps {
  selected: Verse | null;
  onSelect: (v: Verse) => void;
  onClear: () => void;
  autoHideSignal: number; // increments to request hiding text (e.g., after typing begins)
}

export const VersePicker: React.FC<VersePickerProps> = ({ selected, onSelect, onClear, autoHideSignal }) => {
  const [showText, setShowText] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement | null>(null); // focus helper for book filter

  // Bible dataset state
  const [index, setIndex] = React.useState<BookIndexEntry[] | null>(null);
  const [indexError, setIndexError] = React.useState<string | null>(null);
  const [bookFilter, setBookFilter] = React.useState('');
  const [selectedBook, setSelectedBook] = React.useState<BookIndexEntry | null>(null);
  const [chapter, setChapter] = React.useState<number>(1);
  const [verseNum, setVerseNum] = React.useState<number>(1); // kept for backward compatibility (single verse quick set)
  // raw input strings so the user can clear with backspace
  const [chapterStr, setChapterStr] = React.useState<string>('1');
  const [verseStr, setVerseStr] = React.useState<string>('1');
  const [range, setRange] = React.useState<{ start: number; end: number } | null>(null); // zero-based indices in current chapter
  const [pendingText, setPendingText] = React.useState<string>(''); // aggregated text prior to confirm
  const [bookData, setBookData] = React.useState<string[][] | null>(null); // chapters -> verses
  const [bookLoading, setBookLoading] = React.useState(false);
  const [bookError, setBookError] = React.useState<string | null>(null);
  const [showBooks, setShowBooks] = React.useState(true);
  const [showChapterGrid, setShowChapterGrid] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const bookCache = React.useRef<Record<string,string[][]>>({});
  const { pushToast } = useToast();

  // Load index once
  React.useEffect(()=>{
    fetch('/bible_data/_index.json').then(r=>{
      if(!r.ok) throw new Error('Index load failed');
      return r.json();
    }).then((data: BookIndexEntry[])=>{
      setIndex(data);
    }).catch(e=> setIndexError(e.message));
  }, []);

  function loadBook(entry: BookIndexEntry) {
    if (bookCache.current[entry.key]) {
      setBookData(bookCache.current[entry.key]);
      // reset states when switching to a cached book
      setChapter(1); setChapterStr('1');
      setVerseNum(1); setVerseStr('1');
      setRange(null);
      setShowChapterGrid(true);
      return;
    }
    setBookLoading(true); setBookError(null);
    fetch(`/bible_data/${entry.key}.json`).then(r=>{ if(!r.ok) throw new Error('Book load failed'); return r.json(); }).then((data: string[][])=>{
      bookCache.current[entry.key] = data;
      setBookData(data);
      // reset chapter/verse bounds
  setChapter(1); setChapterStr('1');
  setVerseNum(1); setVerseStr('1');
  setRange(null);
  setShowChapterGrid(true);
    }).catch(e=> setBookError(e.message)).finally(()=> setBookLoading(false));
  }

  // Collapse book list once a book is chosen
  React.useEffect(()=>{
    if (selectedBook) setShowBooks(false);
  }, [selectedBook]);

  function cleanText(raw: string) {
    return raw
      .replace(/\s*\/n\s*/gi, ' ') // remove literal /n markers
      .replace(/_/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Recompute pending aggregated text when range changes (not yet confirmed to parent)
  React.useEffect(()=>{
    if (!selectedBook || !bookData || !range) { setPendingText(''); return; }
    const versesArr = bookData[chapter-1] || [];
    const slice = versesArr.slice(range.start, range.end+1).map(v=> cleanText(v));
    setPendingText(slice.join(' '));
  }, [range, selectedBook, bookData, chapter]);

  const filteredBooks = (index || []).filter(b => [b.title,b.shortTitle,b.abbr,b.key].some(t=> t.toLowerCase().includes(bookFilter.toLowerCase())));

  // Custom verse feature removed

  // keyboard shortcuts for focusing search and toggling peek
  React.useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.altKey && (e.key === 'p' || e.key === 'P')) { setShowText(s=>!s); }
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, []);

  // When selected verse changes, show its text initially
  React.useEffect(()=>{
    if (selected) {
      // show verse text immediately on new selection
      setShowText(true);
    } else {
      setShowText(false);
    }
  }, [selected]);

  // Hide text when autoHideSignal increments
  const lastHideRef = React.useRef<number>(autoHideSignal);
  React.useEffect(()=>{
    if (autoHideSignal !== lastHideRef.current) {
      lastHideRef.current = autoHideSignal;
      if (selected) setShowText(false); // only hide if a verse is selected
    }
  }, [autoHideSignal, selected]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm tracking-wide uppercase text-neutral-600 dark:text-neutral-400">Selector de Pasaje</h3>
        <button
          type="button"
          onClick={()=> setShowHelp(h=>!h)}
          className="text-[11px] underline decoration-dotted hover:decoration-solid text-neutral-600 dark:text-neutral-300"
        >{showHelp? 'Ocultar ayuda':'Instrucciones'}</button>
      </div>
      {showHelp && (
        <div className="text-[11px] leading-relaxed border border-neutral-200 dark:border-neutral-800 rounded-md p-3 bg-neutral-50 dark:bg-neutral-900/40 space-y-1">
          <p className="font-medium text-neutral-700 dark:text-neutral-200">Cómo usar:</p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>Elige un libro (botón “Cambiar libro”).</li>
            <li>Escoge el capítulo (se abre la cuadrícula).</li>
            <li>Haz clic en uno o más versículos (Shift + clic para ampliar el rango).</li>
            <li>Pulsa “Confirmar selección”.</li>
            <li>Empieza a escribir el pasaje; Alt+P muestra/oculta el texto.</li>
          </ol>
          <p className="text-neutral-600 dark:text-neutral-400"><span className="font-medium">Atajos:</span> / enfoca búsqueda · Alt+P ver/ocultar · Shift+clic extiende rango.</p>
        </div>
      )}
  {/* English quick picks removed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500">Biblia (ES)</p>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedBook && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={()=> setShowBooks(true)}>Cambiar libro</Button>}
            {selectedBook && !showChapterGrid && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={()=> setShowChapterGrid(true)}>Cambiar capítulo</Button>}
            {/* <TooltipIconButton label="Recargar índice" onClick={()=>{ setIndex(null); setIndexError(null); fetch('/bible_data/_index.json').then(r=>{ if(!r.ok) throw new Error('Index load failed'); return r.json(); }).then((d:BookIndexEntry[])=> setIndex(d)).catch(e=> setIndexError(e.message)); }}><RefreshCcw size={14} /></TooltipIconButton> */}
          </div>
        </div>
        {showBooks && (
          <>
            <Input ref={searchRef} placeholder="Filtrar libros ( / enfoca )" value={bookFilter} onChange={e=>setBookFilter(e.target.value)} aria-label="Filtrar libros" />
            <div className="max-h-40 overflow-auto border rounded-md border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
              {!index && !indexError && <div className="p-3 text-xs text-neutral-500">Cargando…</div>}
              {indexError && <div className="p-3 text-xs text-red-600">{indexError}</div>}
              {filteredBooks.map(b => (
                <button key={b.key} className={`w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-xs ${selectedBook?.key===b.key? 'bg-neutral-100 dark:bg-neutral-800/70':''}`} onClick={()=>{ onClear(); setSelectedBook(b); loadBook(b); setShowText(false); }}>
                  <span className="font-medium">{b.shortTitle}</span> <span className="text-neutral-500">({b.chapters}c)</span>
                </button>
              ))}
              {index && !filteredBooks.length && <div className="p-3 text-xs text-neutral-500">Sin resultados</div>}
            </div>
          </>
        )}
  {selectedBook && showChapterGrid && (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Capítulos</p>
        {/* <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={bookLoading} onClick={()=>{ if(selectedBook) loadBook(selectedBook); }}>Reload</Button> */}
      </div>
      {bookLoading && <div className="text-[10px] text-neutral-500">Cargando capítulos…</div>}
      {bookError && <div className="text-[10px] text-red-600">{bookError}</div>}
      {bookData && (
        <div className="max-h-48 overflow-auto border rounded-md border-neutral-200 dark:border-neutral-800 p-2 grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(34px,1fr))', gap: '4px' }}>
          {Array.from({ length: selectedBook.chapters }, (_,i)=> i+1).map(num => (
            <button
              key={num}
              className={`text-xs rounded-md border border-neutral-200 dark:border-neutral-700 py-1 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60 ${num===chapter? 'bg-neutral-100 dark:bg-neutral-800/70':''}`}
              onClick={()=>{
                // If a passage is already selected, clear it so the verses list can appear
                if (selected) { onClear(); setShowText(false); }
                setChapter(num); setChapterStr(String(num)); setVerseNum(1); setVerseStr('1'); setRange(null); setShowChapterGrid(false);
              }}
            >{num}</button>
          ))}
        </div>
      )}
    </div>
  )}
  {selectedBook && !showChapterGrid && bookData && (
      <div className="text-[10px] text-neutral-500 flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 select-none">Capítulo {chapter}</span>
        <span>· {(bookData[chapter-1]||[]).length} versículos</span>
        {range && <span className="text-neutral-400">Seleccionados: {range.start+1}{range.end>range.start? '-' + (range.end+1):''}</span>}
      </div>
  )}
      </div>
  {selectedBook && bookData && !showChapterGrid && !selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">Versículos (clic para rango)</p>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                {(selectedBook.shortTitle || selectedBook.title)} {chapter}
              </div>
              {range && (
                <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/40">
                  {range.start+1}{range.end>range.start? '-' + (range.end+1):''}
                </div>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-auto border rounded-md border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800" role="listbox" aria-label={`Versículos del capítulo ${chapter}`}>
            {(bookData[chapter-1]||[]).map((v, idx)=>{
              const isIn = range && idx >= range.start && idx <= range.end;
              const isEdgeStart = isIn && range && idx === range.start;
              const isEdgeEnd = isIn && range && idx === range.end;
              return (
                <button
                  key={idx}
                  role="option"
                  aria-selected={!!isIn}
                  className={`relative w-full text-left pl-3 pr-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition
                    ${isIn? 'bg-neutral-100 dark:bg-neutral-800/60 font-medium':''}
                    ${isEdgeStart? 'rounded-t-md':''} ${isEdgeEnd? 'rounded-b-md':''}`}
                  onClick={(e)=>{
                    setShowText(false);
                    const shift = e.shiftKey;
                    setVerseNum(idx+1); setVerseStr(String(idx+1));
                    setRange(r=>{
                      if (!r) return { start: idx, end: idx };
                      if (shift) {
                        if (idx < r.start) return { start: idx, end: r.end };
                        if (idx > r.end) return { start: r.start, end: idx };
                        return r;
                      }
                      if (idx < r.start) return { start: idx, end: r.end };
                      if (idx > r.end) return { start: r.start, end: idx };
                      return { start: idx, end: idx };
                    });
                  }}
                >
                  {isIn && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full" aria-hidden="true" />}
                  <span className="text-neutral-500 mr-2 select-none inline-block w-5 text-right pr-1">{idx+1}</span>
                  <span className="whitespace-normal break-words">{cleanText(v)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!range || !pendingText} onClick={()=>{
              if (!selectedBook || !range || !bookData) return;
              const reference = `${selectedBook.shortTitle || selectedBook.title} ${chapter}:${range.start+1}${range.end>range.start? '-' + (range.end+1):''}`;
              const id = `${selectedBook.key}-${chapter}-${range.start+1}-${range.end+1}-es`;
              onSelect({ id, reference, translation: 'ES', text: pendingText, source:'built-in' });
              pushToast({ title: 'Pasaje seleccionado', description: `${reference} (${range.end - range.start + 1} versículos)` });
        setShowBooks(false); // collapse book list on confirm
            }}>Confirmar selección</Button>
            {range && <Button size="sm" variant="outline" onClick={()=> setRange(null)}>Reiniciar rango</Button>}
          </div>
        </div>
      )}
      {selected ? (
        <Card>
          <CardHeader className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">{selected.reference} <Badge variant="secondary">{selected.translation}{selected.source==='custom' && ' (custom)'}</Badge></CardTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={()=>{ setShowText(false); onClear(); }}>Cambiar versículos</Button>
              <TooltipIconButton label={showText? 'Ocultar texto (Alt+P)' : 'Ver texto (Alt+P)'} onClick={()=>setShowText(s=>!s)}>{showText? <EyeOff size={16}/> : <Eye size={16}/>}</TooltipIconButton>
              <TooltipIconButton label="Quitar selección" onClick={onClear}><X size={16} /></TooltipIconButton>
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-sm md:text-base leading-relaxed transition ${showText? '' : 'blur-sm select-none'}`}>{selected.text}</p>
            <p className="text-xs text-neutral-500 mt-2">{showText? 'Texto visible' : 'Texto oculto'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="text-sm text-neutral-500">Elige un pasaje para comenzar.</div>
      )}
    </div>
  );
};
