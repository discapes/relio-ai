import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('workspace, memory, source viewer and simulator form one navigable product', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'Good morning, Ana.' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Your morning brief' })).toBeVisible();
	await page.getByRole('link', { name: 'Project memory' }).click();
	await expect(page.getByRole('heading', { name: 'Project memory', exact: true })).toBeVisible();
	const source = page.locator('a[href^="/source/"]').first();
	await expect(source).toBeVisible();
	await source.click();
	await expect(page.locator('.source-text')).toBeVisible();
	await page.goto('/?view=email', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'Acme, in your inbox.' })).toBeVisible();
	await page.getByRole('button', { name: 'New message', exact: true }).click();
	await page.locator('[name=to]').fill('lena.fischer@acme-org.example');
	await page.locator('[name=subject]').fill('Private mailbox test');
	await page
		.locator('[name=body]')
		.fill('Only the employee mailbox receives this unique scheduling detail: ALPHA-9941.');
	await page.getByRole('button', { name: 'Send message', exact: true }).click();
	await expect(page.getByText('Private mailbox test').first()).toBeVisible();
	await page.goto('/?view=memory');
	const search = page.getByPlaceholder(/Search/).first();
	await search.fill('ALPHA-9941');
	await expect(
		page.getByText('Only the employee mailbox receives this unique scheduling detail: ALPHA-9941.')
	).toHaveCount(0);
});

test('private preferences persist and demo identities isolate them', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const memory = page
		.getByRole('button', { name: /What.*remember|Personal memory|Remembered/i })
		.first();
	if (await memory.count()) await memory.click();
	await page.locator('[name=text]').first().fill('Follow bakery decisions under PRIVATE-9822.');
	await page
		.getByRole('button', { name: /Remember|Save preference|Save goal/i })
		.first()
		.click();
	await expect(
		page.getByText('Follow bakery decisions under PRIVATE-9822.', { exact: true })
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByText('Follow bakery decisions under PRIVATE-9822.', { exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Switch view', exact: true }).click();
	await page.locator('[name=personaId]').selectOption('p2');
	await page.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Good morning, Marco.' })).toBeVisible();
	await expect(
		page.getByText('Follow bakery decisions under PRIVATE-9822.', { exact: true })
	).toHaveCount(0);
});

test('foreign-project persona receives no Acme sources and source routes enforce clearance', async ({
	page
}) => {
	await page.goto('/?view=memory');
	const sourcePath = await page.locator('a[href^="/source/"]').first().getAttribute('href');
	const switched = await page.request.post('/session', {
		form: { personaId: 'other', level: '3' },
		headers: { origin: new URL(page.url()).origin }
	});
	expect(switched.ok()).toBe(true);
	await page.goto('/?view=memory');
	await expect(page.locator('a[href^="/source/"]')).toHaveCount(0);
	const response = await page.request.get(sourcePath!);
	expect(response.status()).toBe(404);
});

test('desktop and mobile core controls have no serious accessibility failures', async ({
	page
}) => {
	for (const viewport of [
		{ width: 1440, height: 1000 },
		{ width: 390, height: 844 }
	]) {
		await page.setViewportSize(viewport);
		await page.goto('/', { waitUntil: 'networkidle' });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
			true
		);
		const result = await new AxeBuilder({ page }).analyze();
		expect(
			result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
		).toEqual([]);
	}
});

test('reviewer pages stay in the sidebar, expose intended material and scope practice sources', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	for (const [label, view] of [
		['Design', 'design'],
		['How to use', 'how-to-use'],
		['How it works', 'about'],
		['Practice answers', 'practice']
	]) {
		await page.getByRole('link', { name: label, exact: true }).click();
		await expect(page).toHaveURL(new RegExp('view=' + view));
		await expect(page.getByRole('heading', { name: label, level: 1, exact: true })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
		const accessibility = await new AxeBuilder({ page }).analyze();
		expect(
			accessibility.violations.filter(
				(item) => item.impact === 'critical' || item.impact === 'serious'
			)
		).toEqual([]);
	}
	expect(await page.locator('article a[href^="/source/"]').count()).toBeGreaterThan(0);
	await page.locator('article a[href^="/source/"]').first().click();
	await expect(page.locator('.source-text')).toBeVisible();
	await page.goBack();
	await expect(
		page.getByRole('heading', { name: 'Practice answers', level: 1, exact: true })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open submission documents' })).toHaveCount(0);
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
	const switched = await page.request.post('/session', {
		form: { personaId: 'p3', level: '1' },
		headers: { origin: new URL(page.url()).origin }
	});
	expect(switched.ok()).toBe(true);
	await page.goto('/?view=practice');
	await expect(page.locator('article a[href^="/source/"]')).toHaveCount(0);
	await page.goto('/?view=design');
	await expect(page.getByRole('heading', { name: 'Design', level: 1, exact: true })).toBeVisible();
	for (const path of [
		'/submission/design',
		'/submission/answers',
		'/submission/quality',
		'/submission/answers/download'
	]) {
		expect((await page.request.get(path)).status()).toBe(404);
	}
});

test('view switching has one entry, closes on navigation, and identifies inference hosting', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Demo controls', exact: true })).toHaveCount(0);
	await expect(page.getByText('Customer project', { exact: true })).toHaveCount(0);
	const toggle = page.getByRole('button', { name: 'Switch view', exact: true });
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('button', { name: 'Start a fresh demo' })).toBeVisible();
	await page.getByRole('link', { name: 'People', exact: true }).click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator('#view-settings')).toHaveCount(0);
	await page.getByRole('link', { name: 'Project memory' }).click();
	await toggle.click();
	await page.locator('.person-name').first().click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await page.getByRole('link', { name: 'Project memory' }).click();
	await toggle.click();
	await page.locator('a[href^="/source/"]').first().click();
	await expect(page.locator('.source-text')).toBeVisible();
	await page.goBack();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await page.getByRole('link', { name: 'How it works', exact: true }).click();
	await expect(page.getByText(/Verda.*formerly DataCrunch/).first()).toBeVisible();
	await expect(page.locator('.lucide-sparkles')).toHaveCount(0);
	for (const width of [900, 390]) {
		await page.setViewportSize({ width, height: 900 });
		await expect(toggle).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
			true
		);
	}
	const typography = await page.locator('footer').evaluate((el) => ({
		size: getComputedStyle(el).fontSize,
		muted: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()
	}));
	expect(typography.size).toBe('15px');
	expect(typography.muted).toBe('#546467');
});
