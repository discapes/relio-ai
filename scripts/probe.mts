import { context } from '../src/lib/server/memory.ts';
import { answerQuestion, extractMemory, generateBrief } from '../src/lib/server/workflows.ts';
const ctx = context('capability-probe', 'ana');
for (const [name, fn] of [
	[
		'question',
		() => answerQuestion(ctx, 'What exactly did Acme approve in January 2025 UAT sign-off?')
	],
	['extract', () => extractMemory(ctx)],
	['brief', () => generateBrief(ctx)]
] as const) {
	const start = Date.now();
	try {
		const result = await fn();
		console.log(JSON.stringify({ task: name, seconds: (Date.now() - start) / 1000, result }));
	} catch (e) {
		console.error(name, e);
	}
}
