import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const directory = mkdtempSync(resolve(tmpdir(), 'relio-profile-'));
process.env.DATA_DIR = directory;
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory');
const workflows = await import('../src/lib/server/workflows');
const { database } = await import('../src/lib/server/database');
try {
	const ctx = memory.context('profile', 'p1', 3);
	workflows.prepareWorkspace(ctx);
	const operations = {
		people: () => memory.people(ctx),
		workspace: () => workflows.workspaceData(ctx),
		peopleLoad: () =>
			memory.withMemoryReads(() => {
				workflows.prepareWorkspace(ctx);
				const people = memory.people(ctx);
				const fingerprint = workflows.guidanceFingerprint(ctx);
				return {
					...workflows.workspaceData(ctx, people),
					personGuidance: workflows.preparedGuidance(ctx, 'charlotte-meyer', {
						fingerprint,
						personIds: new Set(people.map((p) => p.id))
					})
				};
			})
	};
	for (let sample = 1; sample <= 5; sample++) {
		const timings: Record<string, number> = { sample };
		for (const [name, run] of Object.entries(operations)) {
			const start = performance.now();
			run();
			timings[`${name}Ms`] = Math.round(performance.now() - start);
		}
		console.log(JSON.stringify(timings));
	}
} finally {
	database().close();
	rmSync(directory, { recursive: true, force: true });
}
