import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = 'https://relio-ai.eu';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const checks = {};
const post = (name, form) =>
	page.request.post(`${base}/?/${name}`, {
		form,
		headers: { origin: base, 'x-sveltekit-action': 'true', accept: 'application/json' }
	});
try {
	for (let i = 0; i < 40; i++) {
		try {
			if ((await page.request.get(`${base}/state`)).ok()) break;
		} catch {}
		await new Promise((r) => setTimeout(r, 300));
	}
	await page.goto(base, { waitUntil: 'networkidle' });
	const before = await (await page.request.get(`${base}/state`)).json();
	checks.initialWorkspace = before.workspaceId;
	assert.equal((await page.request.get(`${base}/submission/answers`)).status(), 200);
	assert.equal((await page.request.get(`${base}/submission/answers/download`)).status(), 200);
	assert.equal(
		(
			await post('preference', {
				text: 'Persist the bakery preparation goal across service restart.'
			})
		).status(),
		200
	);
	assert.equal((await post('erase', { personId: 'kwame-boateng' })).status(), 200);
	const erased = await (await page.request.get(`${base}/state`)).json();
	assert.equal(erased.epoch, before.epoch + 1);
	checks.erasureEpoch = erased.epoch;
	assert.equal((await page.request.get(`${base}/submission/answers`)).status(), 403);
	assert.equal((await page.request.get(`${base}/submission/answers/download`)).status(), 403);
	checks.submissionReferencesWithdrawn = true;
	const removed = '/source/' + encodeURIComponent('emails/15_uat-signoff#message-001');
	const survives = '/source/' + encodeURIComponent('emails/15_uat-signoff#message-003');
	assert.equal((await page.request.get(base + removed)).status(), 404);
	assert.equal((await page.request.get(base + survives)).status(), 200);
	execFileSync('systemctl', ['--user', 'restart', 'receipt-workspace']);
	for (let i = 0; i < 30; i++) {
		try {
			if ((await page.request.get(`${base}/state`)).ok()) break;
		} catch {}
		await new Promise((r) => setTimeout(r, 300));
	}
	await page.reload({ waitUntil: 'networkidle' });
	const after = await (await page.request.get(`${base}/state`)).json();
	assert.equal(after.workspaceId, before.workspaceId);
	assert.equal(after.epoch, erased.epoch);
	assert.ok(
		(await page.textContent('body')).includes(
			'Persist the bakery preparation goal across service restart.'
		)
	);
	assert.equal((await page.request.get(base + removed)).status(), 404);
	assert.equal((await page.request.get(base + survives)).status(), 200);
	checks.preferencePersisted = true;
	checks.removedSource404 = true;
	checks.survivingSource200 = true;
	await post('reset', {});
	const reset = await (await page.request.get(`${base}/state`)).json();
	assert.notEqual(reset.workspaceId, before.workspaceId);
	checks.resetIsolated = true;
	const result = { status: 'passed', finished: new Date().toISOString(), checks };
	writeFileSync('docs/live_restart.json', JSON.stringify(result, null, 2));
	console.log(result);
} finally {
	await browser.close();
}
