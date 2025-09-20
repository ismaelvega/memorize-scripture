import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Expected environment variable: OPENAI_API_KEY

const systemPrompt = `You are an assistant helping a user memorize Bible verses in Spanish.
Given the original verse text and the user's attempt, provide:
1. A concise encouragement sentence.
2. Up to 3 specific corrections (missing words, misplaced phrases, accent / punctuation issues) referencing fragments.
3. A short actionable tip (<= 15 words).
Keep total under 120 words. Do NOT quote very long spans—keep snippets short. Respond in Spanish.`;

interface Body {
	verseText: string;
	attemptText: string;
	reference?: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json() as Body;
		if (!body?.verseText || !body?.attemptText) {
			return new Response(JSON.stringify({ error: 'Faltan los campos verseText o attemptText' }), { status: 400 });
		}
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return new Response(JSON.stringify({ error: 'OPENAI_API_KEY no está configurada' }), { status: 500 });
		}
		const openai = new OpenAI({ apiKey });

		const userPrompt = `Referencia: ${body.reference || 'N/A'}\n\nVerso original:\n${body.verseText}\n\nIntento del usuario:\n${body.attemptText}`;

		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			temperature: 0.4,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			max_tokens: 220
		});

		const text = completion.choices?.[0]?.message?.content?.trim() || '';
		return new Response(JSON.stringify({ feedback: text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	} catch (e:any) {
		console.error('Error de retroalimentación de IA', e);
		const status = e?.status || 500;
		return new Response(JSON.stringify({ error: 'RETROALIMENTACION_AI_FALLIDA' }), { status });
	}
}

