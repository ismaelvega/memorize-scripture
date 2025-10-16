import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
  const re = /<sup>(\d+)<\/sup>&nbsp;|[A-Za-z0-9À-ÖØ-öø-ÿ']+|[^\sA-Za-z0-9À-ÖØ-öø-ÿ]+/g;
  const tokens: Token[] = [];
  let currentVerse: number | undefined = undefined;

  const matches = text.matchAll(re);
  for (const match of matches) {
    const verseMatch = match[1];
    if (verseMatch) {
      currentVerse = parseInt(verseMatch, 10);
    } else {
      tokens.push({ text: match[0].trim(), verse: currentVerse });
    }
  }

  return tokens.filter(t => t.text);
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

    // Handle punctuation on either side at the front of the stream
    if (isPunct(ta.text)) {
      // Show punctuation from target as neutral (punct) so it's ignored in scoring
      prefix.push({ token: ta.text, status: "punct", verse: ta.verse })
      i++
      continue
    }
    if (isPunct(tb.text)) {
      // Punctuation typed by the user that isn't in target at this position
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
