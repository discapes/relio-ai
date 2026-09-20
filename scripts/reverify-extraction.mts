import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
process.env.DATA_DIR = mkdtempSync(resolve(tmpdir(), 'receipt-balanced-'));
process.env.DISABLE_BACKGROUND = '1';
const drafts = JSON.parse(readFileSync('docs/model_quality_extraction_drafts.json', 'utf8'))
	.drafts as { focusFirstDocument: string; output: unknown }[];
const original = globalThis.fetch;
const calls: unknown[] = [];
globalThis.fetch = async (...args) => {
	const request = JSON.parse(String(args[1]?.body));
	const prompt = request.messages.at(-1).content;
	if (prompt.startsWith('Extract up to')) {
		const documents: string[] = JSON.parse(
			prompt.match(/focused on these documents: (\[[^\n]+?\])/)[1]
		);
		const draft = drafts.find((item) => item.focusFirstDocument === documents[0]);
		if (!draft) throw new Error('No captured extraction exists for this source partition');
		return Response.json({ choices: [{ message: { content: JSON.stringify(draft.output) } }] });
	}
	const started = Date.now();
	const response = await original(...args);
	const body = await response.clone().json();
	calls.push({
		durationMs: Date.now() - started,
		output: JSON.parse(body.choices?.[0]?.message?.content || '{}')
	});
	writeFileSync('/tmp/receipt-balanced-verification.json', JSON.stringify(calls, null, 2));
	return response;
};
const memory = await import('../src/lib/server/memory');
const workflow = await import('../src/lib/server/workflows');
const ctx = memory.context('prepared-baseline', 'p1', 3);
const started = Date.now();
await workflow.extractMemory(ctx);
const claims = memory.claims(ctx);
const documents = [
	...new Set(claims.flatMap((claim) => claim.sourceIds.map((id) => id.split('#')[0])))
];
writeFileSync('/tmp/receipt-balanced-claims.json', JSON.stringify(claims, null, 2));
writeFileSync(
	'docs/model_quality_extraction.json',
	JSON.stringify(
		{
			durationMs: Date.now() - started,
			count: claims.length,
			documents,
			transcriptClaims: claims.filter((claim) =>
				claim.sourceIds.some((id) => id.startsWith('transcripts/'))
			).length,
			claims,
			calls
		},
		null,
		2
	)
);
console.log(
	JSON.stringify({
		dataDirectory: process.env.DATA_DIR,
		count: claims.length,
		documents: documents.length,
		durationMs: Date.now() - started
	})
);
