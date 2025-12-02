import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { sanitizeVerseText } from "./sanitize"
import type { CitationSegment } from "./types"

// Tailwind-aware class combiner (primary)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Back-compat alias used across components
export function classNames(...inputs: ClassValue[]) {
  return cn(...inputs)
}

// Simple timestamp formatter used in History
export function formatTime(ts: number) {
  try {
    const target = new Date(ts)
    if (Number.isNaN(target.getTime())) {
      return String(ts)
    }

    const now = new Date()
    const diffMs = now.getTime() - target.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)

    if (diffSeconds >= 0 && diffSeconds < 60) {
      const seconds = Math.max(diffSeconds, 0)
      return `hace ${seconds}s`
    }

    if (diffSeconds >= 60 && diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60)
      if (minutes <= 1) {
        return "hace 1 minuto"
      }
      return `hace ${minutes} minutos`
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    const diffDays = Math.floor((startOfToday.getTime() - startOfTarget.getTime()) / (24 * 60 * 60 * 1000))
    const timeLabel = target.toLocaleTimeString('es-ES', {
      hour: "2-digit",
      minute: "2-digit",
    })

    if (diffDays === 0) {
      return `hoy, ${timeLabel}`
    }
    if (diffDays === 1) {
      return `ayer, ${timeLabel}`
    }
    if (diffDays === 2) {
      return `antier, ${timeLabel}`
    }

    const sameYear = target.getFullYear() === now.getFullYear()
    const dateLabel = target.toLocaleDateString('es-ES', {
      day: "2-digit",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    })

    return `${dateLabel}, ${timeLabel}`
  } catch {
    return String(ts)
  }
}

// Tokenize text into words/numbers and punctuation tokens
export interface Token {
  text: string;
  verse?: number;
}

// Tokenize text into words/numbers and punctuation tokens
export function tokenize(text: string): Token[] {
  if (!text) return [];
  // decode common HTML entities to avoid broken-up tokens like '& nbsp ;'
  // (we keep this minimal and deterministic rather than bringing a full HTML parser)
  const decoded = String(text)
    // match both compact entities (&nbsp;) and spaced variants (& nbsp ;)
    .replace(/&\s*nbsp\s*;/gi, ' ')
    .replace(/&\s*amp\s*;/gi, '&')
    .replace(/&\s*lt\s*;/gi, '<')
    .replace(/&\s*gt\s*;/gi, '>')
    .replace(/&\s*quot\s*;/gi, '"')
    // also accept compact forms just in case
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');
  // Match <sup>n</sup> (verse markers), words (letters + apostrophes and internal hyphens/dashes),
  // standalone digits, or any other non-word sequences. Including hyphen/dash characters in the
  // word class ensures partial typed words like 'tie-' are tokenized as a word token instead of
  // being split into a word + punctuation token.
  const re = /<sup>(\d+)<\/sup>|[A-Za-zÀ-ÖØ-öø-ÿ'\-\u2013\u2014]+|\d+|[^\sA-Za-z0-9À-ÖØ-öø-ÿ]+/g;
  const tokens: Token[] = [];
  let currentVerse: number | undefined = undefined;

  const matches = decoded.matchAll(re);
  for (const match of matches) {
    const verseMatch = match[1];
    if (verseMatch) {
      // When we encounter a <sup>n</sup>, set the current verse and do not
      // push a numeric token into the token stream. This prevents the verse
      // number from appearing twice (once as text and once as the rendered <sup>).
      currentVerse = parseInt(verseMatch, 10);
      continue;
    }
    const raw = match[0];
    // Skip tokens that are pure numeric markers (leftover numbers) since
    // verse markers are handled via <sup> and we don't want them as normal tokens.
    if (/^\s*\d+\s*$/.test(raw)) continue;
    tokens.push({ text: raw.trim(), verse: currentVerse });
  }

  return tokens.filter((t) => t.text);
}

// Normalize text/token for comparisons: lowercase, trim spaces, collapse whitespace.
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s']/g, " ") // drop punctuation for compare (keep apostrophes)
    .replace(/\s+/g, " ")
    .trim()
}

export function isPunct(token: string) {
  return /^[^A-Za-z0-9À-ÖØ-öø-ÿ]+$/.test(token)
}

// Diff via LCS between two token arrays. Returns a sequence of operations.
export type DiffStatus = "match" | "missing" | "extra" | "punct"
export interface DiffTokenItem { token: string; status: DiffStatus, verse?: number }

export function diffTokensLCS(
  aRaw: Token[],
  bRaw: Token[],
  opts?: { normalize?: (s: string) => string }
): DiffTokenItem[] {
  const a = aRaw ?? []
  const b = bRaw ?? []
  const m = a.length
  const n = b.length
  const normalizer = opts?.normalize ?? normalizeForCompare
  const eq = (x: Token, y: Token) => normalizer(x.text) === normalizer(y.text)
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (eq(a[i - 1], b[j - 1])) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const out: DiffTokenItem[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (eq(a[i - 1], b[j - 1])) {
      const tok = a[i - 1]
      out.push({ token: tok.text, status: isPunct(tok.text) ? "punct" : "match", verse: tok.verse })
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.push({ token: a[i - 1].text, status: "missing", verse: a[i-1].verse })
      i--
    } else {
      out.push({ token: b[j - 1].text, status: "extra", verse: b[j-1].verse })
      j--
    }
  }
  while (i > 0) { out.push({ token: a[i - 1].text, status: "missing", verse: a[i-1].verse }); i-- }
  while (j > 0) { out.push({ token: b[j - 1].text, status: "extra", verse: b[j-1].verse }); j-- }
  return out.reverse()
}

// Smarter diff that quickly consumes a matching prefix (ignoring punctuation) and
// then falls back to the LCS-based diff for the remainder. This ensures partial
// beginnings like "Todo tiene su tiempo y" are highlighted as correct matches.
export function diffTokens(
  aRaw: Token[],
  bRaw: Token[],
  opts?: { normalize?: (s: string) => string }
): DiffTokenItem[] {
  const a = aRaw ?? []
  const b = bRaw ?? []
  const normalize = opts?.normalize ?? normalizeForCompare
  const eq = (x: Token, y: Token) => normalize(x.text) === normalize(y.text)

  const prefix: DiffTokenItem[] = []
  let i = 0
  let j = 0

  // Greedily match the longest prefix of word tokens (skip/mark punctuation)
  while (i < a.length && j < b.length) {
    const ta = a[i]
    const tb = b[j]

    // Handle punctuation on either side at the front of the stream.
    // If both sides are punctuation and they match, consume once as 'punct'.
    if (isPunct(ta.text) || isPunct(tb.text)) {
      if (isPunct(ta.text) && isPunct(tb.text)) {
        if (ta.text === tb.text) {
          // same punctuation on both sides -> single neutral punct token
          prefix.push({ token: ta.text, status: "punct", verse: ta.verse ?? tb.verse })
          i++
          j++
          continue
        }
        // different punctuation: consume target punctuation first as neutral
        prefix.push({ token: ta.text, status: "punct", verse: ta.verse })
        i++
        continue
      }
      if (isPunct(ta.text)) {
        // Show punctuation from target as neutral (punct) so it's ignored in scoring
        prefix.push({ token: ta.text, status: "punct", verse: ta.verse })
        i++
        continue
      }
      // tb is punctuation (and ta isn't): punctuation typed by the user that isn't in target
      prefix.push({ token: tb.text, status: "extra", verse: tb.verse })
      j++
      continue
    }

    if (eq(ta, tb)) {
      prefix.push({ token: ta.text, status: "match", verse: ta.verse })
      i++
      j++
      continue
    }
    break
  }

  // If we consumed nothing in prefix, or we still have remaining tokens, fall back to LCS
  if (i < a.length || j < b.length) {
    const rest = diffTokensLCS(a.slice(i), b.slice(j), { normalize })
    return prefix.concat(rest)
  }

  return prefix
}

const PUNCTUATION_SEGMENT_PATTERN = /[^.!?;,:\u2013\u2014\u2026]+(?:[.!?;,:\u2013\u2014\u2026]+|$)/g

export function splitVerseByPunctuation(rawText: string): string[] {
  if (!rawText) return []
  const sanitized = rawText
    .replace(/<sup>\d+<\/sup>&nbsp;?/gi, ' ')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s*\/n\s*/gi, ' ')
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!sanitized) return []
  const matches = sanitized.match(PUNCTUATION_SEGMENT_PATTERN)
  if (!matches) return [sanitized]
  return matches.map(chunk => chunk.trim()).filter(Boolean)
}

export interface SequenceChunkDefinition {
  text: string;
  wordCount: number;
}

// Compound biblical names/phrases that should never be split across chunks.
// Each entry is an array of words (lowercase, no accents for matching).
const COMPOUND_NAMES: string[][] = [
  ['cristo', 'jesus'],
  ['jesus', 'cristo'],
  ['jesu', 'cristo'], // alternate form
  ['espiritu', 'santo'],
  ['santa', 'cena'],
  ['padre', 'nuestro'],
  ['hijo', 'del', 'hombre'],
  ['reino', 'de', 'dios'],
  ['reino', 'de', 'los', 'cielos'],
  ['palabra', 'de', 'dios'],
  ['cordero', 'de', 'dios'],
  ['hijo', 'de', 'dios'],
  ['juan', 'bautista'],
  ['juan', 'el', 'bautista'],
  ['maria', 'magdalena'],
  ['simon', 'pedro'],
  ['poncio', 'pilato'],
  ['herodes', 'antipas'],
];

// Normalize a word for compound name matching (lowercase, remove accents)
function normalizeForCompoundMatch(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Check if a sequence of words (starting at index) matches a compound name.
// Returns the length of the match (number of words), or 0 if no match.
function matchesCompoundName(words: string[], startIndex: number): number {
  const remaining = words.slice(startIndex);
  if (remaining.length === 0) return 0;

  const normalizedRemaining = remaining.map(normalizeForCompoundMatch);

  for (const compound of COMPOUND_NAMES) {
    if (compound.length > normalizedRemaining.length) continue;

    let matches = true;
    for (let i = 0; i < compound.length; i++) {
      if (normalizedRemaining[i] !== compound[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return compound.length;
    }
  }
  return 0;
}

// Segment verse text into short chunks for sequence practice.
export function chunkVerseForSequenceMode(
  rawText: string,
  opts?: { wordsPerChunk?: number }
): SequenceChunkDefinition[] {
  const wordsPerChunk = Math.max(1, opts?.wordsPerChunk ?? 3);
  const sanitized = sanitizeVerseText(rawText, false);
  const tokens = tokenize(sanitized);
  if (!tokens.length) return [];

  // Extract just the word tokens (non-punctuation) for compound name detection
  const wordTokens = tokens.filter(t => !isPunct(t.text)).map(t => t.text);

  const chunks: SequenceChunkDefinition[] = [];
  let current = '';
  let currentWords = 0;
  let pendingPrefix = ''; // punctuation that should prefix the next word (e.g. leading '¿')
  let wordIndex = 0; // tracks position in wordTokens array
  let compoundRemaining = 0; // words remaining in current compound name

  const squashSpaces = (input: string) =>
    input.replace(/\s+([,.;:!?])/g, '$1').replace(/\s+/g, ' ').trim();

  const flush = () => {
    if (!current.trim()) {
      current = '';
      currentWords = 0;
      return;
    }
    const text = squashSpaces(current);
    const words = currentWords;
    if (text) {
      chunks.push({ text, wordCount: words });
    }
    current = '';
    currentWords = 0;
  };

  tokens.forEach((token) => {
    const value = token.text;
    if (!value) return;
    if (isPunct(value)) {
      // Distinguish opening punctuation (e.g. '¿', '¡') from closing/inline
      // punctuation (.,;:?!). Opening punctuation should prefix the NEXT word
      // and must not be attached to the end of a previous chunk. Closing
      // punctuation can be appended to the current or previous chunk as before.
      const isOpeningPunct = /^[¡¿]+$/.test(value);

      if (isOpeningPunct) {
        // If there is a current chunk being built, flush it (keep the
        // punctuation for the next chunk). If no current, just record the
        // pending prefix so it will be applied to the next word.
        if (current && compoundRemaining === 0) {
          flush();
        }
        pendingPrefix += value;
        return;
      }

      // Non-opening punctuation (closing or inline). Attach to current when
      // possible, else append to last chunk. If nothing exists, store as
      // pendingPrefix as a fallback (rare).
      if (current) {
        current += value;
        // Only flush on punctuation if we're not in the middle of a compound name
        if (compoundRemaining === 0) {
          flush();
        }
      } else if (chunks.length) {
        const last = chunks[chunks.length - 1];
        last.text = squashSpaces(`${last.text}${value}`);
      } else {
        pendingPrefix += value;
      }
      return;
    }

    // Check if this word starts a compound name (only if not already in one)
    if (compoundRemaining === 0) {
      const compoundLength = matchesCompoundName(wordTokens, wordIndex);
      if (compoundLength > 1) {
        // Starting a compound name
        // Only flush if adding the compound would exceed limit significantly
        // (allow up to wordsPerChunk + compoundLength - 1 to keep things together)
        const wouldExceed = currentWords + compoundLength > wordsPerChunk + compoundLength - 1;
        if (current && currentWords > 0 && wouldExceed) {
          flush();
        }
        compoundRemaining = compoundLength;
      }
    }

    // If we had pending leading punctuation, prefix it directly to the word
    // without adding an extra space (e.g. '¿' + 'Está' -> '¿Está').
    const wordWithPrefix = pendingPrefix ? `${pendingPrefix}${value}` : value;
    pendingPrefix = '';

    current = current ? `${current} ${wordWithPrefix}` : wordWithPrefix;
    currentWords += 1;
    wordIndex += 1;

    // Decrement compound counter if we're in a compound name
    if (compoundRemaining > 0) {
      compoundRemaining -= 1;
    }

    // Only flush if we've reached the word limit AND we're not in a compound name
    if (currentWords >= wordsPerChunk && compoundRemaining === 0) {
      flush();
    }
  });

  flush();

  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.wordCount === 1) {
      const prev = chunks[chunks.length - 2];
      const mergedText = squashSpaces(`${prev.text} ${last.text}`);
      chunks[chunks.length - 2] = {
        text: mergedText,
        wordCount: prev.wordCount + last.wordCount,
      };
      chunks.pop();
    }
  }

  return chunks;
}

export function shuffleArray<T>(items: T[], randomFn: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Dictionary for book names that require accents/tildes in Spanish
const BOOK_NAME_ACCENTS: Record<string, string> = {
  'genesis': 'Génesis',
  'exodo': 'Éxodo',
  'levitico': 'Levítico',
  'numeros': 'Números',
  'deuteronomio': 'Deuteronomio',
  'josue': 'Josué',
  'jueces': 'Jueces',
  'rut': 'Rut',
  '1_samuel': '1 Samuel',
  '2_samuel': '2 Samuel',
  '1_reyes': '1 Reyes',
  '2_reyes': '2 Reyes',
  '1_cronicas': '1 Crónicas',
  '2_cronicas': '2 Crónicas',
  'esdras': 'Esdras',
  'nehemias': 'Nehemías',
  'ester': 'Ester',
  'job': 'Job',
  'salmos': 'Salmos',
  'proverbios': 'Proverbios',
  'eclesiastes': 'Eclesiastés',
  'cantares': 'Cantares',
  'isaias': 'Isaías',
  'jeremias': 'Jeremías',
  'lamentaciones': 'Lamentaciones',
  'ezequiel': 'Ezequiel',
  'daniel': 'Daniel',
  'oseas': 'Oseas',
  'joel': 'Joel',
  'amos': 'Amós',
  'abdias': 'Abdías',
  'jonas': 'Jonás',
  'miqueas': 'Miqueas',
  'nahum': 'Nahúm',
  'habacuc': 'Habacuc',
  'sofonias': 'Sofonías',
  'hageo': 'Hageo',
  'zacarias': 'Zacarías',
  'malaquias': 'Malaquías',
  'mateo': 'Mateo',
  'marcos': 'Marcos',
  'lucas': 'Lucas',
  'juan': 'Juan',
  'hechos': 'Hechos',
  'romanos': 'Romanos',
  '1_corintios': '1 Corintios',
  '2_corintios': '2 Corintios',
  'galatas': 'Gálatas',
  'efesios': 'Efesios',
  'filipenses': 'Filipenses',
  'colosenses': 'Colosenses',
  '1_tesalonicenses': '1 Tesalonicenses',
  '2_tesalonicenses': '2 Tesalonicenses',
  '1_timoteo': '1 Timoteo',
  '2_timoteo': '2 Timoteo',
  'tito': 'Tito',
  'filemon': 'Filemón',
  'hebreos': 'Hebreos',
  'santiago': 'Santiago',
  '1_pedro': '1 Pedro',
  '2_pedro': '2 Pedro',
  '1_juan': '1 Juan',
  '2_juan': '2 Juan',
  '3_juan': '3 Juan',
  'judas': 'Judas',
  'apocalipsis': 'Apocalipsis',
};

// passage.id, start, end: genesis-17-2-7-es 2 7 parsed to "Genesis 17:2-7"
// passage.id, start, end: 1_tesalonicenses-3-3-3-es 3 3 parsed to "1 Tesalonicenses 3:3"
export function passageIdToString(passageId: string, start?: number, end?: number): string {
  if (!passageId) return '';
  // Extract book id (with possible leading number), chapter, verse start, verse end, and language suffix
  // Format: bookId-chapter-verseStart-verseEnd-language (e.g., "genesis-18-2-5-es")
  const match = passageId.match(/^(.+?)-(\d+)-(\d+)-(\d+)-([a-z]{2})$/);
  if (!match) return '';
  const bookId = match[1];
  const chapterStr = match[2];
  
  // Use dictionary for proper book name with accents, or fallback to capitalization
  const bookName = BOOK_NAME_ACCENTS[bookId] || bookId
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Build verse range string only if start is provided
  if (start === undefined) {
    return `${bookName} ${chapterStr}`;
  }
  
  const verseRange = end !== undefined && end !== start 
    ? `${start}-${end}` 
    : `${start}`;
  
  return `${bookName} ${chapterStr}:${verseRange}`;
}

export function extractCitationSegments(reference: string | undefined): CitationSegment[] {
  if (!reference) return [];
  const trimmed = reference.trim();
  if (!trimmed) return [];

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    // No colon: "Book Chapter" or "Book"
    // Check if there is a space
    const lastSpaceIdx = trimmed.lastIndexOf(' ');
    if (lastSpaceIdx === -1) {
      return [{ id: 'book', label: trimmed, order: 0, appended: false }];
    }
    
    const bookLabel = trimmed.slice(0, lastSpaceIdx).trim();
    const chapterLabel = trimmed.slice(lastSpaceIdx + 1).trim();
    
    const segments: CitationSegment[] = [];
    let order = 0;
    segments.push({ id: 'book', label: bookLabel, order: order++, appended: false });
    
    // Check if chapter is a range
    const rangeMatch = chapterLabel.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (end - start === 1) {
        segments.push({ id: 'chapter_start', label: rangeMatch[1], order: order++, appended: false });
        segments.push({ id: 'chapter_y', label: 'y', order: order++, appended: false });
        segments.push({ id: 'chapter_end', label: rangeMatch[2], order: order++, appended: false });
      } else {
        segments.push({ id: 'chapter_del', label: 'del', order: order++, appended: false });
        segments.push({ id: 'chapter_start', label: rangeMatch[1], order: order++, appended: false });
        segments.push({ id: 'chapter_al', label: 'al', order: order++, appended: false });
        segments.push({ id: 'chapter_end', label: rangeMatch[2], order: order++, appended: false });
      }
    } else {
      segments.push({ id: 'chapter', label: chapterLabel, order: order++, appended: false });
    }
    return segments;
  }

  const beforeColon = trimmed.slice(0, colonIndex).trim();
  const afterColon = trimmed.slice(colonIndex + 1).trim();
  const lastSpaceIdx = beforeColon.lastIndexOf(' ');

  let bookLabel = beforeColon;
  let chapterLabel = '';

  if (lastSpaceIdx !== -1) {
    bookLabel = beforeColon.slice(0, lastSpaceIdx).trim();
    chapterLabel = beforeColon.slice(lastSpaceIdx + 1).trim();
  }

  const segments: CitationSegment[] = [];
  let order = 0;
  
  if (bookLabel) segments.push({ id: 'book', label: bookLabel, order: order++, appended: false });
  if (chapterLabel) segments.push({ id: 'chapter', label: chapterLabel, order: order++, appended: false });
  
  if (afterColon) {
    const rangeMatch = afterColon.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (end - start === 1) {
        segments.push({ id: 'verse_start', label: rangeMatch[1], order: order++, appended: false });
        segments.push({ id: 'verse_y', label: 'y', order: order++, appended: false });
        segments.push({ id: 'verse_end', label: rangeMatch[2], order: order++, appended: false });
      } else {
        segments.push({ id: 'verse_del', label: 'del', order: order++, appended: false });
        segments.push({ id: 'verse_start', label: rangeMatch[1], order: order++, appended: false });
        segments.push({ id: 'verse_al', label: 'al', order: order++, appended: false });
        segments.push({ id: 'verse_end', label: rangeMatch[2], order: order++, appended: false });
      }
    } else {
      segments.push({ id: 'verses', label: afterColon, order: order++, appended: false });
    }
  }
  
  return segments;
}
