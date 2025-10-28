import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { sanitizeVerseText } from "./sanitize"

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
    const d = new Date(ts)
    return d.toLocaleString('es-ES', {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "2-digit",
    })
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

// Segment verse text into short chunks for sequence practice.
export function chunkVerseForSequenceMode(
  rawText: string,
  opts?: { wordsPerChunk?: number }
): SequenceChunkDefinition[] {
  const wordsPerChunk = Math.max(1, opts?.wordsPerChunk ?? 3);
  const sanitized = sanitizeVerseText(rawText, false);
  const tokens = tokenize(sanitized);
  if (!tokens.length) return [];

  const chunks: SequenceChunkDefinition[] = [];
  let current = '';
  let currentWords = 0;
  let pendingPrefix = ''; // punctuation that should prefix the next word (e.g. leading '¿')

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
        if (current) {
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
        flush();
      } else if (chunks.length) {
        const last = chunks[chunks.length - 1];
        last.text = squashSpaces(`${last.text}${value}`);
      } else {
        pendingPrefix += value;
      }
      return;
    }

    // If we had pending leading punctuation, prefix it directly to the word
    // without adding an extra space (e.g. '¿' + 'Está' -> '¿Está').
    const wordWithPrefix = pendingPrefix ? `${pendingPrefix}${value}` : value;
    pendingPrefix = '';

    current = current ? `${current} ${wordWithPrefix}` : wordWithPrefix;
    currentWords += 1;
    if (currentWords >= wordsPerChunk) {
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
