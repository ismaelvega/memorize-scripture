// Tokenize text into words & punctuation.
// Previous implementation used /\w+|[^\s\w]+/ which is ASCII-only; accented letters (é, í, ó, á, ñ, etc.)
// are not matched by \w so they were split off into separate tokens. We switch to Unicode property escapes
// to treat any letter (\p{L}) or number (\p{N}) as part of a word. Fallback provided for environments
// lacking Unicode property escape support.
export function tokenize(text: string): string[] {
  try {
    const re = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+/gu; // words or runs of non-space, non-letter/number (punctuation)
    return (text.match(re) || []).map(t => t.trim()).filter(Boolean);
  } catch {
    // Fallback (may split accented letters)
    return (text.match(/\w+|[^\s\w]+/g) || []).map(t => t.trim()).filter(Boolean);
  }
}

export function accuracyColor(a: number) {
  if (a >= 85) return 'bg-green-500';
  if (a >= 60) return 'bg-blue-500';
  return 'bg-amber-500';
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function classNames(...c: (string | undefined | false)[]) {
  return c.filter(Boolean).join(' ');
}

// Compute an alignment-based diff using Longest Common Subsequence (LCS) so that
// insertions/deletions do not cascade into many false mismatches.
export function normalizeForCompare(token: string): string {
  // Use NFD decomposition; strip combining acute (U+0301) and diaeresis (U+0308) only.
  // Keeps tilde (U+0303) so 'ñ' stays distinct.
  return token
    .normalize('NFD')
    .replace(/[\u0301\u0308]/g, '')
    .toLowerCase();
}

export function diffTokensLCS(
  a: string[],
  b: string[],
  opts?: { normalize?: (s: string) => string }
): { token: string; status: 'match'|'missing'|'extra'|'punct' }[] {
  const norm = opts?.normalize;
  const n = a.length, m = b.length;
  // DP table of LCS lengths
  const dp: number[][] = Array.from({ length: n+1 }, ()=> Array(m+1).fill(0));
  for (let i= n-1; i>=0; i--) {
    for (let j= m-1; j>=0; j--) {
      if ((norm? norm(a[i]) : a[i]) === (norm? norm(b[j]) : b[j])) dp[i][j] = 1 + dp[i+1][j+1];
      else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  // Reconstruct path producing tokens with statuses.
  const diff: { token: string; status: 'match'|'missing'|'extra'|'punct' }[] = [];
  const isPunct = (t: string) => /^[\p{P}\p{S}]$/u.test(t) || /^[,.;:¿?¡!()"'«»\-]+$/u.test(t);
  let i=0, j=0;
  while (i < n && j < m) {
    if ((norm? norm(a[i]) : a[i]) === (norm? norm(b[j]) : b[j])) {
      // classify punctuation matches distinctly
      const status = isPunct(a[i]) ? 'punct' : 'match';
      diff.push({ token: a[i], status }); i++; j++;
    } else if (dp[i+1][j] >= dp[i][j+1]) {
      const status = isPunct(a[i]) ? 'punct' : 'missing';
      diff.push({ token: a[i], status }); i++;
    } else {
      const status = isPunct(b[j]) ? 'punct' : 'extra';
      diff.push({ token: b[j], status }); j++;
    }
  }
  while (i < n) { diff.push({ token: a[i], status: isPunct(a[i]) ? 'punct':'missing' }); i++; }
  while (j < m) { diff.push({ token: b[j], status: isPunct(b[j]) ? 'punct':'extra' }); j++; }
  return diff;
}
