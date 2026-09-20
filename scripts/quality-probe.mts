import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
process.env.DATA_DIR = mkdtempSync(resolve(tmpdir(), 'receipt-quality-'));
process.env.DISABLE_BACKGROUND = '1';
const calls: unknown[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
	const started = Date.now();
	const request = JSON.parse(String(args[1]?.body));
	const prompt = request.messages?.at(-1)?.content || '';
	const response = await originalFetch(...args);
	const raw = await response.clone().json();
	let output;
	try {
		output = JSON.parse(raw.choices?.[0]?.message?.content || '{}');
	} catch {
		output = raw.choices?.[0]?.message?.content;
	}
	calls.push({
		durationMs: Date.now() - started,
		promptCharacters: prompt.length,
		task: prompt.slice(0, 180),
		repair: prompt.includes('previous response failed validation'),
		finishReason: raw.choices?.[0]?.finish_reason,
		usage: raw.usage,
		output
	});
	writeFileSync('/tmp/receipt-quality-calls.json', JSON.stringify(calls, null, 2));
	return response;
};
const memory = await import('../src/lib/server/memory');
const workflow = await import('../src/lib/server/workflows');
const ctx = memory.context('quality-review', 'p1', 3);
const question =
	'Find one thing in the archive that was agreed and then never done. Show the trail from the agreement to the present, and say who would have needed to notice.';
const started = Date.now();
try {
	const answer = await workflow.answerQuestion(ctx, question, 'chat');
	writeFileSync(
		'docs/model_quality_p8.json',
		JSON.stringify({ question, durationMs: Date.now() - started, answer, calls }, null, 2)
	);
	console.log(
		JSON.stringify({
			durationMs: Date.now() - started,
			citations: answer.citations.length,
			text: answer.text,
			trace: answer.trace
		})
	);
} catch (error) {
	writeFileSync(
		'docs/model_quality_p8.json',
		JSON.stringify(
			{ question, durationMs: Date.now() - started, error: String(error), calls },
			null,
			2
		)
	);
	throw error;
}
