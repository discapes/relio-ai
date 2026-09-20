import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
process.env.DATA_DIR = 'data/preference-evaluation';
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory.ts');
const wf = await import('../src/lib/server/workflows.ts');
const ctx = memory.context(`preference-${Date.now()}`, 'ana');
const start = Date.now();
try {
	const answer = await wf.answerQuestion(
		ctx,
		'Mua kiinnostaa erityisesti bakeryn integraation eteneminen; nosta asiakkaalta odottavat päätökset mun briiffiin.'
	);
	console.log(JSON.stringify(answer));
	const preferences = wf.preferences(ctx);
	assert.ok(preferences.length);
	assert.equal(wf.preferences(memory.context(ctx.workspaceId, 'marco')).length, 0);
	const result = { status: 'passed', seconds: (Date.now() - start) / 1000, answer, preferences };
	writeFileSync('docs/live_preference.json', JSON.stringify(result, null, 2));
	console.log(result);
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}
