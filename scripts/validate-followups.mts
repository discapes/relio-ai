import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
process.env.DISABLE_BACKGROUND = '1';
process.env.DATA_DIR = 'data/followup-evaluation';
const memory = await import('../src/lib/server/memory.ts');
const wf = await import('../src/lib/server/workflows.ts');
const ctx = memory.context(`followups-${Date.now()}`, 'ana');
const results: any[] = [];
async function step(name: string, fn: () => Promise<unknown>) {
	const start = Date.now();
	try {
		results.push({ name, status: 'passed', seconds: 0, result: await fn() });
	} catch (e) {
		results.push({
			name,
			status: 'failed',
			seconds: 0,
			error: e instanceof Error ? e.message : String(e)
		});
	}
	results.at(-1).seconds = (Date.now() - start) / 1000;
	writeFileSync('docs/live_followups.json', JSON.stringify(results, null, 2));
	console.log(name, results.at(-1).status, results.at(-1).seconds);
}
await step('Routine scheduling updates memory and calendar with no unnecessary reply', async () => {
	const mail = wf.sendMail(ctx, {
		id: 'routine-final',
		subject: 'Bakery evidence review',
		to: ['priya.nair@acme-org.example'],
		cc: [wf.AGENT_EMAIL],
		body: 'For everyone’s calendar: the bakery evidence review is Thursday 9 July 2026 at 10:00 Helsinki time. I will prepare the comparison of prepared extracts and a separate environment, including the earlier access decision and setup estimate. Priya will bring updated Acme requirements. This is a scheduling update; the earlier access decision remains in place. Ana'
	});
	await wf.processMail(ctx, mail.id);
	const data = wf.workspaceData(ctx);
	const sent = data.mails.find((m) => m.id === mail.id)!;
	assert.equal(sent.status, 'Memory updated');
	assert.ok(data.meetings.some((m) => m.id === 'meeting-routine-final'));
	return { mail: sent, meetings: data.meetings };
});
await step('Finnish natural-language goal becomes private personal memory', async () => {
	const answer = await wf.answerQuestion(
		ctx,
		'Mua kiinnostaa erityisesti bakeryn integraation eteneminen; nosta asiakkaalta odottavat päätökset mun briiffiin. Muista tämä jatkossa.'
	);
	const prefs = wf.preferences(ctx);
	assert.ok(prefs.some((p) => /bakery|leipomo/i.test(p.text)));
	assert.equal(wf.preferences(memory.context(ctx.workspaceId, 'marco')).length, 0);
	return { answer, preferences: prefs };
});
console.log(ctx.workspaceId);
