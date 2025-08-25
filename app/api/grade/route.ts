import { NextRequest } from 'next/server';
import { tokenize, diffTokensLCS, normalizeForCompare } from '../../../lib/utils';

function naiveGrade(targetText: string, attemptText: string) {
  const targetTokens = tokenize(String(targetText||''));
  const attemptTokens = tokenize(String(attemptText||''));
  const diff = diffTokensLCS(targetTokens, attemptTokens, { normalize: normalizeForCompare });
  // Exclude punctuation tokens from scoring
  const scoring = diff.filter(d=> d.status !== 'punct');
  const matchCount = scoring.filter(d=> d.status==='match').length;
  const targetCount = targetTokens.filter(t=> !/^[\p{P}\p{S}]$/u.test(t) && !/^[,.;:¿?¡!()"'«»\-]+$/u.test(t)).length;
  const missedWords = scoring.filter(d=> d.status==='missing').map(d=>d.token);
  const extraWords = scoring.filter(d=> d.status==='extra').map(d=>d.token);
  const accuracy = targetCount? Math.round((matchCount/targetCount)*100) : 0;
  return { accuracy, missedWords, extraWords, diff };
}

export async function POST(req: NextRequest) {
  try {
    const { targetText, attemptText } = await req.json();
    const target = String(targetText||'').trim();
    const attempt = String(attemptText||'').trim();
    if (!target || !attempt) return new Response('Bad Request', { status: 400 });
    const base = naiveGrade(target, attempt);
    return Response.json({ ...base, paraphraseOk:false, feedback: base.accuracy===100? 'Perfect! Keep reinforcing it.' : 'Focus on the missed words and try again.', gradedBy: 'naive' });
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
}
