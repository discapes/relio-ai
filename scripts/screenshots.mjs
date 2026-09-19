import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
	for (const [name, width, height] of [
		['desktop', 1440, 1050],
		['mobile', 390, 844]
	]) {
		const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
		await page.goto('http://127.0.0.1:34342/', { waitUntil: 'networkidle' });
		await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
		await page.close();
	}
} finally {
	await browser.close();
}
