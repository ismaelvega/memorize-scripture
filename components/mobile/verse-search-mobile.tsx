"use client";
import * as React from 'react';
import { ArrowLeft, Search as SearchIcon, Info, BookOpen } from 'lucide-react';
import { useFlowStore, type BookIndexEntry } from './flow';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeForCompare } from '@/lib/utils';
import type { Verse } from '../../lib/types';

interface VerseSearchItem {
  verse: Verse;
  normalized: string;
  normalizedAccents: string;
  book: BookIndexEntry;
  chapter: number;
  verseNumber: number;
}

export interface VerseSearchSelection {
  verse: Verse;
  start: number;
  end: number;
  book: BookIndexEntry;
  chapter: number;
}

let cachedItems: VerseSearchItem[] | null = null;
let itemsPromise: Promise<VerseSearchItem[]> | null = null;

function cleanText(raw: string) {
  return raw.replace(/\s*\/n\s*/gi, ' ').replace(/_/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeKeepAccents(text: string) {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^a-z0-9\u00C0-\u017F\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadVerseItems(): Promise<VerseSearchItem[]> {
  if (cachedItems) return cachedItems;
  if (itemsPromise) return itemsPromise;

  itemsPromise = (async () => {
    const indexRes = await fetch('/bible_data/_index.json');
    if (!indexRes.ok) {
      throw new Error('No se pudo cargar el índice de libros');
    }
    const index: BookIndexEntry[] = await indexRes.json();
    const items: VerseSearchItem[] = [];

    const bookData = await Promise.all(index.map(async (book) => {
      const res = await fetch(`/bible_data/${book.key}.json`);
      if (!res.ok) {
        throw new Error(`No se pudo cargar ${book.title}`);
      }
      const chapters: string[][] = await res.json();
      return { book, chapters };
    }));

    for (const { book, chapters } of bookData) {
      chapters.forEach((chapterVerses, chapterIdx) => {
        chapterVerses.forEach((rawText, verseIdx) => {
          const chapter = chapterIdx + 1;
          const verseNumber = verseIdx + 1;
          const text = cleanText(rawText);
          const reference = `${book.shortTitle || book.title} ${chapter}:${verseNumber}`;
          const id = `${book.key}-${chapter}-${verseNumber}-${verseNumber}-es`;
          const verse: Verse = {
            id,
            reference,
            translation: 'ES',
            text,
            source: 'built-in',
          };
          // Only index the text content, not the reference, to avoid matching "Genesis" 
          // against every verse in Genesis.
          const normalized = normalizeForCompare(text);
          const normalizedAccents = normalizeKeepAccents(text);
          items.push({
            verse,
            normalized,
            normalizedAccents,
            book,
            chapter,
            verseNumber,
          });
        });
      });
    }

    // Cache for future calls
    cachedItems = items;
    return items;
  })().finally(() => {
    itemsPromise = null;
  });

  return itemsPromise;
}

interface Props {
  onSelect: (selection: VerseSearchSelection) => void;
}

const PAGE_SIZE = 100;

interface RangeParseResult {
  book: BookIndexEntry;
  chapter: number;
  start: number;
  end: number;
  requestedEnd?: number;
  verses: VerseSearchItem[];
  chapterMaxVerse: number;
  isWholeChapter: boolean;
  error?: 'start_exceeds_max' | 'chapter_exceeds_max';
  bookMaxChapter?: number;
}

function buildBookMap(items: VerseSearchItem[]) {
  const map = new Map<string, BookIndexEntry>();
  const seenBooks = new Set<string>();

  for (const it of items) {
    if (seenBooks.has(it.book.key)) continue;
    seenBooks.add(it.book.key);
    
    const b = it.book;
    const nTitle = normalizeForCompare(b.title || '');
    if (!map.has(nTitle)) map.set(nTitle, b);
    
    if (b.shortTitle) {
      const nShort = normalizeForCompare(b.shortTitle);
      if (!map.has(nShort)) map.set(nShort, b);
      
      // Variations for numbered books
      if (nShort.startsWith('1 ')) {
        map.set(nShort.replace('1 ', '1ra '), b);
        map.set(nShort.replace('1 ', 'primera '), b);
        map.set(nShort.replace('1 ', 'primera de '), b);
        map.set(nShort.replace('1 ', 'i '), b);
        map.set(nShort.replace('1 ', '1er '), b);
        map.set(nShort.replace('1 ', 'primer '), b);
        map.set(nShort.replace('1 ', 'primero '), b);
        map.set(nShort.replace('1 ', 'primero de '), b);
        map.set(nShort.replace('1 ', 'primer libro de '), b);
        map.set(nShort.replace('1 ', 'primer libro del '), b);
      }
      if (nShort.startsWith('2 ')) {
        map.set(nShort.replace('2 ', '2da '), b);
        map.set(nShort.replace('2 ', 'segunda '), b);
        map.set(nShort.replace('2 ', 'segunda de '), b);
        map.set(nShort.replace('2 ', 'ii '), b);
        map.set(nShort.replace('2 ', '2do '), b);
        map.set(nShort.replace('2 ', 'segundo '), b);
        map.set(nShort.replace('2 ', 'segundo de '), b);
        map.set(nShort.replace('2 ', 'segundo libro de '), b);
        map.set(nShort.replace('2 ', 'segundo libro del '), b);
      }
      if (nShort.startsWith('3 ')) {
        map.set(nShort.replace('3 ', '3ra '), b);
        map.set(nShort.replace('3 ', 'tercera '), b);
        map.set(nShort.replace('3 ', 'tercera de '), b);
        map.set(nShort.replace('3 ', 'iii '), b);
        map.set(nShort.replace('3 ', '3er '), b);
        map.set(nShort.replace('3 ', 'tercer '), b);
        map.set(nShort.replace('3 ', 'tercero '), b);
        map.set(nShort.replace('3 ', 'tercero de '), b);
      }
    }
    if (b.key && !map.has(b.key)) map.set(b.key, b);
  }
  return map;
}

function replaceBookAliases(query: string, bookMap: Map<string, BookIndexEntry>): string {
  const norm = normalizeForCompare(query);
  // Sort aliases by length descending to match specific phrases first
  const aliases = Array.from(bookMap.keys()).sort((a, b) => b.length - a.length);
  
  for (const alias of aliases) {
    const book = bookMap.get(alias)!;
    const canonical = normalizeForCompare(book.shortTitle || book.title);
    if (alias === canonical) continue;
    
    if (norm.includes(alias)) {
      return norm.replace(alias, canonical);
    }
  }
  return query;
}

function tryParseRange(rawQuery: string, items?: VerseSearchItem[], bookMap?: Map<string, BookIndexEntry>): RangeParseResult | null {
  const q = rawQuery.trim();
  
  let bookNameRaw = '';
  let chapter = 0;
  let start = 0;
  let end = 0;
  let matched = false;
  let isWholeChapter = false;
  let openEnded = false;

  const set = (b: string, c: string, s?: string, e?: string) => {
    bookNameRaw = b.trim();
    chapter = parseInt(c, 10);
    if (s) start = parseInt(s, 10);
    if (e) end = parseInt(e, 10);
    matched = true;
  };

  const patterns = [
    // "Genesis 1 del 1 al 10"
    { r: /^(.+?)\s+(\d+)\s+del\s+(\d+)\s+al\s+(\d+)$/i, f: (m: RegExpMatchArray) => set(m[1], m[2], m[3], m[4]) },
    // "Genesis 1:1 al 10"
    { r: /^(.+?)\s+(\d+)[:\s]+(\d+)\s+al\s+(\d+)$/i, f: (m: RegExpMatchArray) => set(m[1], m[2], m[3], m[4]) },
    // "Genesis 1:1 y 2"
    { r: /^(.+?)\s+(\d+)[:\s]+(\d+)\s+y\s+(\d+)$/i, f: (m: RegExpMatchArray) => set(m[1], m[2], m[3], m[4]) },
    // "Genesis 1:1-10"
    { r: /^(.+?)\s+(\d+)[:\s]+(\d+)(?:[-:](\d+))?$/i, f: (m: RegExpMatchArray) => set(m[1], m[2], m[3], m[4]) },
    
    // Partial: "Genesis 1 del 1 al"
    { r: /^(.+?)\s+(\d+)\s+del\s+(\d+)\s+al$/i, f: (m: RegExpMatchArray) => { set(m[1], m[2], m[3]); openEnded = true; } },
    // Partial: "Genesis 1 del 1"
    { r: /^(.+?)\s+(\d+)\s+del\s+(\d+)$/i, f: (m: RegExpMatchArray) => { set(m[1], m[2], m[3]); openEnded = true; } },
    // Partial: "Genesis 1 del"
    { r: /^(.+?)\s+(\d+)\s+del$/i, f: (m: RegExpMatchArray) => { set(m[1], m[2]); start = 1; openEnded = true; } },
    // Partial: "Genesis 1:1 al"
    { r: /^(.+?)\s+(\d+)[:\s]+(\d+)\s+al$/i, f: (m: RegExpMatchArray) => { set(m[1], m[2], m[3]); openEnded = true; } },
    // Partial: "Genesis 1:1 y"
    { r: /^(.+?)\s+(\d+)[:\s]+(\d+)\s+y$/i, f: (m: RegExpMatchArray) => { set(m[1], m[2], m[3]); openEnded = true; } },
  ];

  for (const p of patterns) {
    const m = q.match(p.r);
    if (m) {
      p.f(m);
      break;
    }
  }

  if (!matched) {
    // Try "Book Chapter" pattern (e.g. "Genesis 1", "1 Juan 2")
    const m = q.match(/^(.+?)\s+(\d+)$/i);
    if (m) {
      bookNameRaw = m[1].trim();
      chapter = parseInt(m[2], 10);
      isWholeChapter = true;
      matched = true;
    }
  }

  if (!matched) return null;
  if (Number.isNaN(chapter)) return null;
  
  if (!items || items.length === 0 || !bookMap) return null;

  const normalizedBookName = normalizeForCompare(bookNameRaw);

  const book = bookMap.get(normalizedBookName) ?? null;
  if (!book) return null;

  // Check for max chapter first
  const bookItems = items.filter(it => it.book.key === book.key);
  if (bookItems.length === 0) return null;
  
  const maxChapter = Math.max(...bookItems.map(it => it.chapter));
  
  if (chapter > maxChapter) {
    return {
      book,
      chapter,
      start,
      end,
      verses: [],
      chapterMaxVerse: 0,
      isWholeChapter,
      error: 'chapter_exceeds_max',
      bookMaxChapter: maxChapter
    };
  }

  // Determine maximum verse number for the chapter from items
  const chapterItems = bookItems.filter((it) => it.chapter === chapter);
  if (chapterItems.length === 0) return null;
  const maxVerse = Math.max(...chapterItems.map((it) => it.verseNumber));

  if (isWholeChapter) {
    start = 1;
    end = maxVerse;
  } else if (openEnded) {
    if (!start || Number.isNaN(start)) start = 1;
    end = maxVerse;
  } else {
    // Standard range, ensure end is set
    if (!end || Number.isNaN(end)) end = start;
  }

  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  
  // If end < start, assume incomplete typing (e.g. "15-2" -> "15-20") and show available verses
  if (end < start) {
    end = maxVerse;
  }

  if (start > maxVerse) {
    return {
      book,
      chapter,
      start,
      end,
      verses: [],
      chapterMaxVerse: maxVerse,
      isWholeChapter,
      error: 'start_exceeds_max',
    };
  }

  let requestedEnd: number | undefined;
  if (end > maxVerse) {
    requestedEnd = end;
    end = maxVerse;
  }

  const verses = chapterItems.filter((it) => it.verseNumber >= start && it.verseNumber <= end);

  if (verses.length === 0) return null;

  return { book, chapter, start, end, requestedEnd, verses, chapterMaxVerse: maxVerse, isWholeChapter };
}

type SearchValue = { value: string, exact: boolean };

type SearchGroup = 
  | { type: 'AND', value: string, exact?: boolean }
  | { type: 'NOT', value: string }
  | { type: 'OR', values: SearchValue[] };

function parseSearchQuery(query: string): SearchGroup[] {
  // If the query contains special characters used for advanced search, use the advanced parser
  if (/["()|-]/.test(query)) {
    const terms: SearchGroup[] = [];
    const regex = /"([^"]+)"|\(([^)]+)\)|-(\S+)|(\S+)/g;
    let match;
    while ((match = regex.exec(query)) !== null) {
      if (match[1]) {
        const val = normalizeKeepAccents(match[1]);
        if (val) terms.push({ type: 'AND', value: val, exact: true });
      } else if (match[2]) {
        const content = match[2];
        // Split by pipe, then check for quotes in each part
        const parts = content.split('|').map(s => s.trim()).filter(Boolean);
        const values: SearchValue[] = parts.map(p => {
          const quoted = p.match(/^"([^"]+)"$/);
          if (quoted) {
            return { value: normalizeKeepAccents(quoted[1]), exact: true };
          }
          return { value: normalizeForCompare(p), exact: false };
        }).filter(v => v.value);
        
        if (values.length > 0) terms.push({ type: 'OR', values });
      } else if (match[3]) {
        const val = normalizeForCompare(match[3]);
        if (val) terms.push({ type: 'NOT', value: val });
      } else if (match[4]) {
        const val = normalizeForCompare(match[4]);
        if (val) terms.push({ type: 'AND', value: val });
      }
    }
    return terms;
  }

  // Default behavior: treat the entire input as a single phrase (ignoring accents/punctuation)
  const val = normalizeForCompare(query);
  if (val) {
    return [{ type: 'AND', value: val, exact: false }];
  }
  return [];
}

export function VerseSearchMobile({ onSelect }: Props) {
  const back = useFlowStore((state) => state.back);
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<VerseSearchItem[] | null>(cachedItems);
  const [loading, setLoading] = React.useState(!cachedItems);
  const [error, setError] = React.useState<string | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [showTips, setShowTips] = React.useState(false);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (cachedItems) return;
    let active = true;
    setLoading(true);
    loadVerseItems()
      .then((loaded) => {
        if (!active) return;
        setItems(loaded);
      })
      .catch((err: unknown) => {
        console.error('Error cargando versículos para búsqueda', err);
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudo preparar la búsqueda');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const bookMap = React.useMemo(() => items ? buildBookMap(items) : null, [items]);
  
  const effectiveQuery = React.useMemo(() => {
    if (!bookMap || /["()|-]/.test(query)) return query;
    return replaceBookAliases(query, bookMap);
  }, [query, bookMap]);

  const parsedQuery = React.useMemo(() => parseSearchQuery(effectiveQuery), [effectiveQuery]);

  const highlightTokens = React.useMemo(() => {
    const tokens: { text: string, exact: boolean }[] = [];
    for (const term of parsedQuery) {
      if (term.type === 'AND') {
        if (term.exact) {
          tokens.push({ text: term.value, exact: true });
        } else {
          term.value.split(' ').forEach(t => tokens.push({ text: t, exact: false }));
        }
      } else if (term.type === 'OR') {
        term.values.forEach(v => {
          if (v.exact) {
            tokens.push({ text: v.value, exact: true });
          } else {
            v.value.split(' ').forEach(t => tokens.push({ text: t, exact: false }));
          }
        });
      }
    }
    return tokens;
  }, [parsedQuery]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [parsedQuery]);

  const parsedRange = React.useMemo(() => tryParseRange(query, items ?? undefined, bookMap ?? undefined), [query, items, bookMap]);

  const bookSuggestions = React.useMemo(() => {
    const trimmed = query.trim();
    // Allow single digits 1, 2, 3 to trigger suggestions
    const isNumberPrefix = ['1', '2', '3'].includes(trimmed);

    if (!bookMap || (trimmed.length < 2 && !isNumberPrefix)) return [];
    const normQuery = normalizeForCompare(query);
    const matches = new Map<string, BookIndexEntry>();
    
    for (const [key, book] of bookMap.entries()) {
      if (key.startsWith(normQuery)) {
        if (!matches.has(book.key)) {
          matches.set(book.key, book);
        }
      }
    }
    
    return Array.from(matches.values()).sort((a, b) => a.number - b.number);
  }, [query, bookMap]);

  const results = React.useMemo(() => {
    if (parsedRange) {
      return parsedRange.verses;
    }

    if (!items || query.trim().length < 2) return [];
    if (parsedQuery.length === 0) return [];

    return items.filter((item) => {
      const text = item.normalized;
      const textAccents = item.normalizedAccents;
      const paddedText = ` ${text} `;
      const paddedTextAccents = ` ${textAccents} `;
      for (const term of parsedQuery) {
        if (term.type === 'AND') {
          if (term.exact) {
            if (!paddedTextAccents.includes(` ${term.value} `)) return false;
          } else {
            if (!text.includes(term.value)) return false;
          }
        } else if (term.type === 'NOT') {
          if (text.includes(term.value)) return false;
        } else if (term.type === 'OR') {
          if (!term.values.some(v => {
            if (v.exact) {
              return paddedTextAccents.includes(` ${v.value} `);
            }
            return text.includes(v.value);
          })) return false;
        }
      }
      return true;
    });
  }, [items, parsedQuery, query, parsedRange]);

  const visibleResults = React.useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );
  const canShowMore = results.length > visibleCount;

  React.useEffect(() => {
    const element = observerTarget.current;
    if (!element || !canShowMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(results.length, prev + PAGE_SIZE));
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [canShowMore, results.length]);

  const multiVerseRange = parsedRange && parsedRange.verses.length > 1 ? parsedRange : null;
  const reachesChapterEnd = multiVerseRange ? multiVerseRange.end === multiVerseRange.chapterMaxVerse : false;
  const startExceedsMax = parsedRange?.error === 'start_exceeds_max';
  const chapterExceedsMax = parsedRange?.error === 'chapter_exceeds_max';

  const showPrompt = query.trim().length === 0;
  const showTooShort = query.trim().length > 0 && parsedQuery.length === 0;
  const noResults = !loading && !error && !showPrompt && !showTooShort && results.length === 0 && !multiVerseRange && !startExceedsMax && !chapterExceedsMax;

  return (
    <Card className="flex h-full flex-col min-h-0">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Buscar pasaje</CardTitle>
        </div>
        <CardDescription>Escribe una referencia (ej. “Juan 3:16-19”) o frases como "de tal manera amó".</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 min-h-0">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="En el principio era el Verbo..."
            className="pl-9 pr-10"
            autoFocus
            aria-label="Buscar versículo por texto o referencia"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            onClick={() => setShowTips(!showTips)}
            title="Consejos de búsqueda"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {showTips && (
          <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            <p className="font-medium mb-2 text-neutral-900 dark:text-neutral-200">Operadores de búsqueda:</p>
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-800 dark:text-neutral-200">"pan"</code>
                <span>Solo resultados con "pan".</span>
              </li>
              <li className="flex gap-2">
                <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-800 dark:text-neutral-200">-Rey</code>
                <span>Excluir resultados con esta palabra.</span>
              </li>
              <li className="flex gap-2">
                <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-800 dark:text-neutral-200">("Dios" | "amor")</code>
                <span>Contiene "Dios" o "amor".</span>
              </li>
              <li className="flex gap-2">
                <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-800 dark:text-neutral-200">hijo</code>
                <span>Búsqueda parcial (default).</span>
              </li>
            </ul>
          </div>
        )}

        {!loading && !error && !showPrompt && !showTooShort && results.length > 0 && !multiVerseRange && (
          <div className="px-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {results.length} {results.length === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'}
          </div>
        )}

        <div className="flex-1 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          {loading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          )}
          {error && (
            <div className="p-4 text-xs text-red-600">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {showPrompt && (
                <div className="p-4 text-xs text-neutral-500 dark:text-neutral-400">
                  Escribe al menos dos letras para comenzar la búsqueda.
                </div>
              )}
              {showTooShort && (
                <div className="p-4 text-xs text-neutral-500 dark:text-neutral-400">
                  Añade un poco más de texto para obtener coincidencias.
                </div>
              )}

              {startExceedsMax && parsedRange && (
                <div className="p-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md m-2">
                  {parsedRange.book.shortTitle || parsedRange.book.title} {parsedRange.chapter} solo tiene {parsedRange.chapterMaxVerse} versículos.
                </div>
              )}

              {chapterExceedsMax && parsedRange && (
                <div className="p-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md m-2">
                  {parsedRange.book.shortTitle || parsedRange.book.title} solo tiene {parsedRange.bookMaxChapter} capítulos.
                </div>
              )}

              {!multiVerseRange && bookSuggestions.length > 0 && (
                <div className="p-2 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="text-xs font-medium text-neutral-500 mb-2 px-2 uppercase tracking-wider">Libros</div>
                  <div className="grid grid-cols-1 gap-1">
                    {bookSuggestions.map(book => (
                      <button
                        key={book.key}
                        onClick={() => setQuery(book.shortTitle + ' ')}
                        className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {book.shortTitle || book.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {multiVerseRange && (
                <div className="p-3">
                  <div className="relative">
                    {/* scrollable list of verses for the range */}
                    <div className="max-h-64 overflow-auto divide-y divide-neutral-100 dark:divide-neutral-800 rounded-md border border-neutral-50 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      {multiVerseRange.verses
                        .slice()
                        .sort((a, b) => a.verseNumber - b.verseNumber)
                        .map((v) => (
                          <button
                            key={v.verse.id}
                            onClick={() => onSelect({
                              verse: v.verse,
                              start: v.verseNumber,
                              end: v.verseNumber,
                              book: v.book,
                              chapter: v.chapter,
                            })}
                            className="w-full px-3 py-2 text-sm text-left transition-colors duration-150 hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
                          >
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {v.verse.reference}
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
                              {renderHighlighted(v.verse.text, highlightTokens)}
                            </div>
                          </button>
                        ))}
                      {reachesChapterEnd && (
                        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          Fin del pasaje
                        </div>
                      )}
                    </div>

                    {/* sticky CTA inside the same scroll context so it remains visible */}
                    {!multiVerseRange.isWholeChapter && (
                      <div className="sticky bottom-0 mt-2">
                        <div className="backdrop-blur-sm bg-white/70 dark:bg-neutral-900/70 p-2">
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => {
                              const rep = multiVerseRange.verses[0];
                              onSelect({
                                verse: rep.verse,
                                start: multiVerseRange.start,
                                end: multiVerseRange.end,
                                book: multiVerseRange.book,
                                chapter: multiVerseRange.chapter,
                              });
                            }}
                          >
                            Practicar {multiVerseRange.book.shortTitle || multiVerseRange.book.title} {multiVerseRange.chapter}:{multiVerseRange.start}-{multiVerseRange.end}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!multiVerseRange && visibleResults.map((item) => (
                <button
                  key={item.verse.id}
                  onClick={() => onSelect({
                    verse: item.verse,
                    start: item.verseNumber,
                    end: item.verseNumber,
                    book: item.book,
                    chapter: item.chapter,
                  })}
                  className="w-full px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
                >
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {renderHighlighted(item.verse.reference, highlightTokens)}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
                    {renderHighlighted(item.verse.text, highlightTokens)}
                  </div>
                </button>
              ))}
              {canShowMore && (
                <div ref={observerTarget} className="p-4 flex justify-center">
                  <Skeleton className="h-6 w-24 rounded-full opacity-50" />
                </div>
              )}
              {noResults && (
                <div className="p-4 text-xs text-neutral-500 dark:text-neutral-400">
                  No se encontraron versículos con esa búsqueda. Intenta con otra referencia o palabra clave.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function stripDiacritics(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function renderHighlighted(text: string, tokens: { text: string, exact: boolean }[]): React.ReactNode {
  if (!tokens || tokens.length === 0) return text;
  
  const baseLower = text.toLowerCase();
  const baseStripped = stripDiacritics(baseLower);
  
  const ranges: Array<{ start: number; end: number }> = [];

  for (const token of tokens) {
    if (!token.text) continue;
    
    const searchBase = token.exact ? baseLower : baseStripped;
    const searchText = token.text; // Already normalized correctly by parseSearchQuery
    
    let startIndex = 0;
    while (startIndex <= searchBase.length - searchText.length) {
      const index = searchBase.indexOf(searchText, startIndex);
      if (index === -1) break;

      if (token.exact) {
        // Check boundaries
        const prevChar = index > 0 ? searchBase[index - 1] : ' ';
        const nextChar = index + searchText.length < searchBase.length ? searchBase[index + searchText.length] : ' ';
        // We need to check if prevChar/nextChar are word characters.
        // Since searchBase might have accents, we should check against a regex that includes accents.
        const isWordChar = (char: string) => /[a-z0-9\u00C0-\u017F]/.test(char);

        if (isWordChar(prevChar) || isWordChar(nextChar)) {
          startIndex = index + 1;
          continue;
        }
      }

      ranges.push({ start: index, end: index + searchText.length });
      startIndex = index + searchText.length;
    }
  }

  if (!ranges.length) return text;

  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  merged.forEach((range, idx) => {
    if (range.start > cursor) {
      segments.push(text.slice(cursor, range.start));
    }
    segments.push(
      <span
        key={`highlight-${range.start}-${idx}`}
        className="font-semibold text-neutral-900 dark:text-neutral-100"
      >
        {text.slice(range.start, Math.min(range.end, text.length))}
      </span>
    );
    cursor = Math.min(range.end, text.length);
  });

  if (cursor < text.length) {
    segments.push(text.slice(cursor));
  }

  if (segments.length === 1 && typeof segments[0] === 'string') {
    return segments[0];
  }

  return <>{segments}</>;
}
