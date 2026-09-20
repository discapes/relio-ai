import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
process.env.DISABLE_BACKGROUND = '1';
const { context, people, personas } = await import('../src/lib/server/memory.ts');
const {
	preparedGuidance,
	preparePersonGuidance,
	registerGuidancePreparation,
	finishGuidancePreparation
} = await import('../src/lib/server/workflows.ts');
const { database } = await import('../src/lib/server/database.ts');
import type { Context, Level } from '../src/lib/types.ts';
const workspace = process.env.PREPARE_WORKSPACE || 'prepared-baseline';
const contexts: Context[] = personas
	.filter((p) => p.projects.includes('acme'))
	.flatMap((p) =>
		Array.from({ length: p.level }, (_, i) => context(workspace, p.id, (i + 1) as Level))
	);
const tasks = contexts
	.filter(
		(ctx) =>
			(!process.env.PREPARE_OWNER || ctx.persona.id === process.env.PREPARE_OWNER) &&
			(!process.env.PREPARE_LEVEL || ctx.level === Number(process.env.PREPARE_LEVEL))
	)
	.flatMap((ctx) => people(ctx).map((person) => ({ ctx, person })))
	.filter(
		({ person }) =>
			!process.env.PREPARE_PEOPLE || process.env.PREPARE_PEOPLE.split('|').includes(person.name)
	);
for (const ctx of new Set(tasks.map((task) => task.ctx))) registerGuidancePreparation(ctx);
process.once('exit', finishGuidancePreparation);
const dir = resolve(process.env.DATA_DIR || 'data');
mkdirSync(dir, { recursive: true });
const journal = resolve(dir, 'people-preparation.jsonl');
const concurrency = Math.max(1, Math.min(2, Number(process.env.PREPARE_CONCURRENCY || 2)));
let stopping = false;
process.on('SIGTERM', () => {
	stopping = true;
});
let index = 0,
	ready = 0,
	failed = 0;
function log(value: object) {
	const line = JSON.stringify({ at: new Date().toISOString(), ...value });
	appendFileSync(journal, line + '\n');
	console.log(line);
}
log({ event: 'start', workspace, total: tasks.length, concurrency });
async function worker() {
	while (index < tasks.length && !stopping) {
		const { ctx, person } = tasks[index++];
		const key = { workspace, owner: ctx.persona.id, level: ctx.level, person: person.name };
		if (preparedGuidance(ctx, person.id)) {
			ready++;
			log({ ...key, event: 'retained' });
			continue;
		}
		const started = Date.now();
		try {
			const answer = await preparePersonGuidance(ctx, person.id);
			ready++;
			log({
				...key,
				event: 'ready',
				seconds: (Date.now() - started) / 1000,
				answerId: answer.id,
				citations: answer.citations.length
			});
		} catch (error) {
			failed++;
			log({
				...key,
				event: 'failed',
				error: String(error),
				cause: error instanceof Error ? String(error.cause || '') : '',
				seconds: (Date.now() - started) / 1000
			});
		}
	}
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));
log({ event: stopping ? 'stopped' : 'complete', workspace, ready, failed, total: tasks.length });
database().exec('PRAGMA wal_checkpoint(PASSIVE)');
process.exitCode = failed ? 1 : 0;
