import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { tokenize, diffTokensLCS, normalizeForCompare } from '../../../lib/utils';

// Simple caching of client (Next.js edge/server runtime re-use)
let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/*
Request body: { targetText: string, attemptText: string }
Response: GradeResponse (approx)
We prompt the model to:
- Identify missing essential words (allow minor paraphrase)
- Identify extra / incorrect words
- Provide accuracy percent heuristic
We still run local token diff as a fallback alignment visual.
*/

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('Falta OPENAI_API_KEY', { status: 500 });
  }
  try {
    const { targetText, attemptText } = await req.json();
    const target = String(targetText||'').trim();
    const attempt = String(attemptText||'').trim();

    if (!target || !attempt) return new Response('Solicitud incorrecta', { status: 400 });

    // Local rough diff (reuse naive for visualization)
  const targetTokens = tokenize(target);
  const attemptTokens = tokenize(attempt);
  const diff = diffTokensLCS(targetTokens, attemptTokens, { normalize: normalizeForCompare });
  // Derive naive punctuation-aware counts (mirror /api/grade)
  const punctRe = /[\p{P}\p{S}]/u;
  const scorer = diff.filter(d => d.status !== 'punct');
  const targetCount = scorer.filter(d => d.status !== 'extra').length; // tokens originating from target excluding punctuation
  const missedTokens = scorer.filter(d => d.status === 'missing').map(d => d.token);
  const extraTokens = scorer.filter(d => d.status === 'extra').map(d => d.token).filter(t => !punctRe.test(t));

    const system = 'You grade scripture memorization attempts. Be concise.';
    const user = `Target verse:\n${target}\n\nAttempt:\n${attempt}\n\nInstructions: Compare allowing minor paraphrase that preserves meaning. List missed essential words (critical nouns, verbs, key connectors) that are absent or substantively changed. List extra or incorrect words that change meaning. Suggest accuracy percent (0-100). JSON output with keys: accuracy, missedWords (array), extraWords (array), paraphraseOk (boolean), feedback (string). No markdown.`;

    const openai = getClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    let parsed: any = {};
    try { parsed = JSON.parse(completion.choices[0].message.content || '{}'); } catch {}
    const accuracy = typeof parsed.accuracy === 'number' ? Math.min(100, Math.max(0, parsed.accuracy)) : 0;
    const missedWords: string[] = Array.isArray(parsed.missedWords)? parsed.missedWords : [];
    const extraWords: string[] = Array.isArray(parsed.extraWords)? parsed.extraWords : [];
    const paraphraseOk = !!parsed.paraphraseOk;
    const feedback: string | undefined = typeof parsed.feedback === 'string'? parsed.feedback : undefined;

    // If model gave 0 accuracy or empty arrays, fall back to local heuristic (excluding punctuation) for a baseline.
    let finalAccuracy = accuracy;
    if (!finalAccuracy && targetCount>0) {
      const correct = scorer.filter(d => d.status==='match').length;
      finalAccuracy = Math.round((correct/targetCount)*100);
    }
    const finalMissed = missedWords.length? missedWords : missedTokens;
    const finalExtra = extraWords.length? extraWords : extraTokens;
    return Response.json({ accuracy: finalAccuracy, missedWords: finalMissed, extraWords: finalExtra, paraphraseOk, feedback, diff, gradedBy: 'llm' });
  } catch (e:any) {
    console.error(e);
    return new Response('Error al calificar con LLM', { status: 500 });
  }
}
