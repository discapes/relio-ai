import { context } from '../src/lib/server/memory.ts';
import { extractMemory } from '../src/lib/server/workflows.ts';
const start = Date.now();
console.log(
	'L3 verified claims',
	await extractMemory(context('prepared-baseline', 'p1', 3)),
	'seconds',
	(Date.now() - start) / 1000
);
