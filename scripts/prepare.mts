import { context, personas } from '../src/lib/server/memory.ts';
import { generateBrief, extractMemory } from '../src/lib/server/workflows.ts';
import type { Level } from '../src/lib/types.ts';
// Prepare visible briefs first; semantic extraction follows at each evidence boundary.
for (const persona of personas.filter((p) => p.projects.includes('acme'))) {
	for (let level = 1; level <= persona.level; level++) {
		const ctx = context('prepared-baseline', persona.id, level as Level);
		const start = Date.now();
		try {
			await generateBrief(ctx);
			console.log(
				`${persona.id} L${level}: brief ready in ${((Date.now() - start) / 1000).toFixed(1)}s`
			);
		} catch (error) {
			console.error(`${persona.id} L${level}:`, error);
		}
	}
}
for (const level of [1, 2, 3] as Level[]) {
	const start = Date.now();
	try {
		const count = await extractMemory(context('prepared-baseline', 'p1', level));
		console.log(
			`L${level}: ${count} verified claims in ${((Date.now() - start) / 1000).toFixed(1)}s`
		);
	} catch (error) {
		console.error(`L${level} extraction:`, error);
	}
}
