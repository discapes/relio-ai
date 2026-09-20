import { writeFileSync } from 'node:fs';
process.env.DISABLE_BACKGROUND = '1';
const original = globalThis.fetch;
const responses: unknown[] = [];
globalThis.fetch = async (...args) => {
	const response = await original(...args);
	const raw = await response.clone().json();
	const text = raw.choices?.[0]?.message?.content;
	let value;
	try {
		value = JSON.parse(text);
	} catch {
		value = { text };
	}
	responses.push(value);
	writeFileSync('/tmp/receipt-extraction-responses.json', JSON.stringify(responses, null, 2));
	return response;
};
const { context } = await import('../src/lib/server/memory.ts');
const { extractMemory } = await import('../src/lib/server/workflows.ts');
console.log(await extractMemory(context('prepared-baseline', 'p1', 3)));
