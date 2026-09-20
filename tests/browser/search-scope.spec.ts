import { test, expect } from '@playwright/test';

test('late source pagination cannot restore higher-level previews after another-tab downgrade', async ({
	page
}) => {
	await page.goto('/?view=memory', { waitUntil: 'networkidle' });
	let captured!: () => void;
	const capturedResponse = new Promise<void>((resolve) => (captured = resolve));
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	let restrictedId = '';
	await page.route('**/search?*', async (route) => {
		const response = await route.fetch();
		const data = await response.json();
		restrictedId = data.sources.find((source: { level: number }) => source.level > 1)?.id || '';
		captured();
		await gate;
		await route.fulfill({ response, json: data }).catch(() => {});
	});
	await page.getByRole('button', { name: 'Browse all source passages' }).click();
	await capturedResponse;
	expect(restrictedId).not.toBe('');
	const switched = await page.request.post('/session', {
		form: { personaId: 'p3', level: '1' },
		headers: { origin: new URL(page.url()).origin }
	});
	expect(switched.ok()).toBe(true);
	await expect(page.locator('.access-pill')).toContainText('L1', { timeout: 10000 });
	release();
	await page.waitForTimeout(400);
	await expect(page.locator(`a[href="/source/${encodeURIComponent(restrictedId)}"]`)).toHaveCount(
		0
	);
	await expect(page.locator('.source-row .badge').filter({ hasText: /L[23]/ })).toHaveCount(0);
});

test('reviewer navigation proceeds while a background state poll is pending', async ({ page }) => {
	await page.goto('/?view=how-to-use', { waitUntil: 'networkidle' });
	let entered!: () => void;
	const pending = new Promise<void>((resolve) => (entered = resolve));
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/state', async (route) => {
		const response = await route.fetch();
		entered();
		await gate;
		await route.fulfill({ response }).catch(() => {});
	});
	await pending;
	await page.getByRole('link', { name: 'How it works', exact: true }).click();
	await expect(page).toHaveURL(/view=about/);
	await expect(
		page.getByRole('heading', { name: 'How it works', level: 1, exact: true })
	).toBeVisible();
	release();
});

test('an unsigned legacy session starts a fresh workspace with one upgrade notice', async ({
	page,
	context
}) => {
	const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:34342';
	await context.addCookies([{ name: 'relex_workspace', value: 'prepared-baseline', url: origin }]);
	await page.goto('/?view=design', { waitUntil: 'networkidle' });
	await expect(page.getByText('Session security was updated.', { exact: false })).toBeVisible();
	const first = await (await page.request.get('/state')).json();
	expect(first.workspaceId).not.toBe('prepared-baseline');
	const signed = (await context.cookies()).find((cookie) => cookie.name === 'relex_workspace')!;
	expect(signed.value).toMatch(/\.[A-Za-z0-9_-]{43}$/);
	expect(signed.httpOnly).toBe(true);
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByText('Session security was updated.', { exact: false })).toHaveCount(0);
	expect((await (await page.request.get('/state')).json()).workspaceId).toBe(first.workspaceId);
});
