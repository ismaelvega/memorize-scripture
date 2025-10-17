// Central sanitization helpers for verse text.
// Keep this minimal and deterministic (no full HTML parser) but robust to
// common artifacts like spaced entities `& nbsp ;`, stray tags, and
// inconsistent <sup> formatting.

export function decodeEntitiesLoose(s: string) {
  return String(s)
    // accept spaced variants like & nbsp ;
    .replace(/&\s*nbsp\s*;/gi, ' ')
    .replace(/&\s*amp\s*;/gi, '&')
    .replace(/&\s*lt\s*;/gi, '<')
    .replace(/&\s*gt\s*;/gi, '>')
    .replace(/&\s*quot\s*;/gi, '"')
    // and compact forms as fallback
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');
}

export function normalizeSupTags(s: string) {
  // normalize any <sup> n </sup> variants to `<sup>N</sup>&nbsp;`
  return String(s).replace(/<sup>\s*(\d+)\s*<\/sup>\s*(?:&nbsp;)?/gi, (_m, n) => `<sup>${n}</sup>&nbsp;`);
}

export function stripTagsExceptSup(s: string) {
  // temporarily hide <sup>...</sup> sequences
  const placeholder = '___SUP_PLACEHOLDER___';
  const sups: string[] = [];
  let out = String(s).replace(/<sup>\s*(\d+)\s*<\/sup>&nbsp;/gi, (m) => {
    sups.push(m);
    return placeholder;
  });
  // remove other tags
  out = out.replace(/<[^>]+>/g, ' ');
  // restore sups in order
  let idx = 0;
  out = out.replace(new RegExp(placeholder, 'g'), () => sups[idx++] || '');
  return out;
}

export function sanitizeVerseText(raw: string, preserveSup = true): string {
  if (!raw) return '';
  let s = String(raw);
  s = decodeEntitiesLoose(s);
  s = s.replace(/\s*\/n\s*/gi, ' ');
  s = s.replace(/_/g, '');
  if (preserveSup) {
    s = normalizeSupTags(s);
    s = stripTagsExceptSup(s);
  } else {
    // remove all tags and decode
    s = s.replace(/<[^>]+>/g, ' ');
  }
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export default sanitizeVerseText;
