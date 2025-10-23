"use client";
import * as React from 'react';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
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
          const normalized = normalizeForCompare(`${reference} ${text}`);
          items.push({
            verse,
            normalized,
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
}

function tryParseRange(rawQuery: string, items?: VerseSearchItem[]): RangeParseResult | null {
  const q = rawQuery.trim();
  // Match patterns like "Genesis 1:1-10" or "1 Samuel 2:3-5" or "Juan 3:16"
  const m = q.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/i);
  if (!m) return null;
  const bookNameRaw = m[1].trim();
  const chapter = parseInt(m[2], 10);
  let start = parseInt(m[3], 10);
  let end = m[4] ? parseInt(m[4], 10) : start;
  if (Number.isNaN(chapter) || Number.isNaN(start) || Number.isNaN(end)) return null;
  if (end < start) {
    // swap if user wrote range backwards
    const tmp = start;
    start = end;
    end = tmp;
  }

  if (!items || items.length === 0) return null;

  // Build a small map of normalized book titles/shortTitles/key -> BookIndexEntry
  const bookMap = new Map<string, BookIndexEntry>();
  for (const it of items) {
    const b = it.book;
    const nTitle = normalizeForCompare(b.title || '');
    if (!bookMap.has(nTitle)) bookMap.set(nTitle, b);
    if (b.shortTitle) {
      const nShort = normalizeForCompare(b.shortTitle);
      if (!bookMap.has(nShort)) bookMap.set(nShort, b);
    }
    if (b.key && !bookMap.has(b.key)) bookMap.set(b.key, b);
  }

  const normalizedBookName = normalizeForCompare(bookNameRaw);

  const book = bookMap.get(normalizedBookName) ?? null;
  if (!book) return null;

  // Determine maximum verse number for the chapter from items
  const chapterItems = items.filter((it) => it.book.key === book.key && it.chapter === chapter);
  if (chapterItems.length === 0) return null;
  const maxVerse = Math.max(...chapterItems.map((it) => it.verseNumber));

  let requestedEnd: number | undefined;
  if (end > maxVerse) {
    requestedEnd = end;
    end = maxVerse;
  }

  const verses = chapterItems.filter((it) => it.verseNumber >= start && it.verseNumber <= end);

  if (verses.length === 0) return null;

  return { book, chapter, start, end, requestedEnd, verses };
}

export function VerseSearchMobile({ onSelect }: Props) {
  const back = useFlowStore((state) => state.back);
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<VerseSearchItem[] | null>(cachedItems);
  const [loading, setLoading] = React.useState(!cachedItems);
  const [error, setError] = React.useState<string | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

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

  const normalizedQuery = React.useMemo(() => normalizeForCompare(query), [query]);
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [normalizedQuery]);

  const queryTokens = React.useMemo(
    () =>
      normalizedQuery
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => /[a-z0-9]/.test(token)),
    [normalizedQuery]
  );

  const results = React.useMemo(() => {
    if (!items || normalizedQuery.length < 2) return [];
    return items.filter((item) => item.normalized.includes(normalizedQuery));
  }, [items, normalizedQuery]);
  const visibleResults = React.useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );
  const canShowMore = results.length > visibleCount;

  const parsedRange = React.useMemo(() => tryParseRange(query, items ?? undefined), [query, items]);

  const showPrompt = query.trim().length === 0;
  const showTooShort = query.trim().length > 0 && normalizedQuery.length < 2;
  const noResults = !loading && !error && !showPrompt && !showTooShort && results.length === 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Buscar versículo</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => back()}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
        <CardDescription>Escribe una referencia (ej. “Juan 3:16”) o palabras clave del versículo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Referencia o texto (mínimo 2 letras)"
            className="pl-9"
            autoFocus
            aria-label="Buscar versículo por texto o referencia"
          />
        </div>

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
              {visibleResults.map((item) => (
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
                    {renderHighlighted(item.verse.reference, queryTokens)}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
                    {renderHighlighted(item.verse.text, queryTokens)}
                  </div>
                </button>
              ))}
              {parsedRange && (
                <div className="p-3">
                  <div className="mb-2 text-sm font-medium">
                    Versos: {parsedRange.book.shortTitle || parsedRange.book.title} {parsedRange.chapter}:{parsedRange.start}-{parsedRange.end}
                    {parsedRange.requestedEnd && parsedRange.requestedEnd !== parsedRange.end && (
                      <span className="ml-2 text-xs text-neutral-500">(solicitado {parsedRange.start}-{parsedRange.requestedEnd}, ajustado)</span>
                    )}
                  </div>

                  <div className="relative">
                    {/* scrollable list of verses for the range */}
                    <div className="max-h-64 overflow-auto divide-y divide-neutral-100 dark:divide-neutral-800 rounded-md border border-neutral-50 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      {parsedRange.verses
                        .slice()
                        .sort((a, b) => a.verseNumber - b.verseNumber)
                        .map((v) => (
                          <div key={v.verse.id} className="px-3 py-2 text-sm text-left">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {v.verse.reference}
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
                              {renderHighlighted(v.verse.text, queryTokens)}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* sticky CTA inside the same scroll context so it remains visible */}
                    <div className="sticky bottom-0 mt-2">
                      <div className="backdrop-blur-sm bg-white/70 dark:bg-neutral-900/70 p-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const rep = parsedRange.verses[0];
                            onSelect({
                              verse: rep.verse,
                              start: parsedRange.start,
                              end: parsedRange.end,
                              book: parsedRange.book,
                              chapter: parsedRange.chapter,
                            });
                          }}
                        >
                          Seleccionar rango: {parsedRange.book.shortTitle || parsedRange.book.title} {parsedRange.chapter}:{parsedRange.start}-{parsedRange.end}
                          {parsedRange.requestedEnd && parsedRange.requestedEnd !== parsedRange.end && (
                            <span className="ml-2 text-xs text-neutral-500">(solicitado {parsedRange.start}-{parsedRange.requestedEnd}, ajustado)</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {canShowMore && (
                <div className="p-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisibleCount((count) => Math.min(results.length, count + PAGE_SIZE))}
                  >
                    Mostrar más
                  </Button>
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

function renderHighlighted(text: string, tokens: string[]): React.ReactNode {
  if (!tokens.length) return text;
  const base = stripDiacritics(text).toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];

  for (const token of tokens) {
    if (!token) continue;
    let startIndex = 0;
    while (startIndex <= base.length - token.length) {
      const index = base.indexOf(token, startIndex);
      if (index === -1) break;
      ranges.push({ start: index, end: index + token.length });
      startIndex = index + token.length;
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
