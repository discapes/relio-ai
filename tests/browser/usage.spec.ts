import { test, expect } from '@playwright/test';

test('analytics records navigation and controls without duplicate requests or changed behavior', async ({
	page
}) => {
	const batches: any[] = [];
	await page.route('**/usage', async (route) => {
		batches.push(...(JSON.parse(route.request().postData() || '{}').events || []));
		await route.fulfill({ status: 204 });
	});
	await page.goto('/');
	await page.getByRole('link', { name: 'People', exact: true }).click();
	await expect(page).toHaveURL(/view=people/);
	await page.getByPlaceholder('Find a person').fill('Lena');
	await page.getByRole('button', { name: 'Switch view', exact: true }).click();
	await expect(page.locator('select[name=level]')).toBeVisible();
	await expect.poll(() => batches.filter((event) => event.kind === 'navigation').length).toBe(1);
	expect(batches.some((event) => event.kind === 'click' && event.label === 'People')).toBe(true);
	expect(batches.some((event) => event.kind === 'change' && event.value === 'Lena')).toBe(true);
	expect(new Set(batches.map((event) => event.eventId)).size).toBe(batches.length);
	await page.screenshot({ path: '/tmp/relio-usage-desktop.png' });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: '/tmp/relio-usage-mobile.png' });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
});

test('failed analytics transport leaves navigation and form controls usable', async ({ page }) => {
	await page.route('**/usage', (route) => route.abort());
	await page.goto('/');
	await page.getByRole('button', { name: 'Switch view', exact: true }).click();
	await page.locator('select[name=personaId]').selectOption('p2');
	await page.getByRole('button', { name: 'Apply', exact: true }).click();
	await page.getByRole('link', { name: 'People', exact: true }).click();
	await expect(page).toHaveURL(/view=people/);
	await expect(page.getByRole('heading', { name: 'People & context', exact: true })).toBeVisible();
});
