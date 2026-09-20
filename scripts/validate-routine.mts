import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
process.env.DISABLE_BACKGROUND = '1';
process.env.DATA_DIR = 'data/routine-evaluation';
const memory = await import('../src/lib/server/memory.ts');
const wf = await import('../src/lib/server/workflows.ts');
const ctx = memory.context(`routine-${Date.now()}`, 'ana');
const start = Date.now();
try {
	const mail = wf.sendMail(ctx, {
		id: 'calendar-note',
		subject: 'Bakery evidence review',
		to: ['priya.nair@acme-org.example'],
		cc: [wf.AGENT_EMAIL],
		body: 'For everyone’s calendar: the bakery evidence review is Thursday 9 July 2026 at 10:00 Helsinki time. I will prepare the comparison of prepared extracts and a separate environment, including the earlier access decision and setup estimate. Priya will bring updated Acme requirements. The earlier access decision remains in place. Ana'
	});
	await wf.processMail(ctx, mail.id);
	const data = wf.workspaceData(ctx);
	const sent = data.mails.find((m) => m.id === mail.id)!;
	assert.equal(sent.status, 'Memory updated');
	assert.ok(data.meetings.some((m) => m.id === 'meeting-calendar-note'));
	const result = {
		status: 'passed',
		seconds: (Date.now() - start) / 1000,
		mail: sent,
		meetings: data.meetings
	};
	writeFileSync('docs/live_routine.json', JSON.stringify(result, null, 2));
	console.log(result);
} catch (error) {
	const result = {
		status: 'failed',
		seconds: (Date.now() - start) / 1000,
		error: error instanceof Error ? error.message : String(error)
	};
	writeFileSync('docs/live_routine.json', JSON.stringify(result, null, 2));
	console.log(result);
}
