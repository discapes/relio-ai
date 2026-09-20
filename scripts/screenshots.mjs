import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.SCREENSHOT_URL || 'https://receipt-workspace.hai1.iffe.eu';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1050 },
		deviceScaleFactor: 1
	});
	const page = await context.newPage();
	for (const [name, path] of [
		['desktop', '/'],
		['email', '/?view=email'],
		['memory', '/?view=memory'],
		['people', '/?view=people']
	]) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: name !== 'memory' });
	}
	await page.goto(base + '/?view=memory', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Graph', exact: true }).click();
	await page.screenshot({ path: 'docs/screenshots/graph.png', fullPage: true });
	await page.goto(base + '/submission/design', { waitUntil: 'networkidle' });
	await page.screenshot({ path: 'docs/screenshots/submission.png', fullPage: true });
	await page.goto(base + '/?view=memory', { waitUntil: 'networkidle' });
	await page.locator('a[href^="/source/"]').first().click();
	await page.locator('.source-text').waitFor();
	await page.screenshot({ path: 'docs/screenshots/source.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(base, { waitUntil: 'networkidle' });
	await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
} finally {
	await browser.close();
}
