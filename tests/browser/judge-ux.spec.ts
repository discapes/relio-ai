import { test, expect } from '@playwright/test';

test('access selection, topic graph and source return preserve the visible task', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Switch view', exact: true }).click();
	await expect(page.locator('select[name=level]')).toHaveValue('3');
	await page.getByRole('button', { name: 'Switch view', exact: true }).click();
	await page.getByRole('button', { name: 'Ask your project', exact: true }).click();
	await expect(page.locator('#question')).toBeFocused();
	await page.goto('/?view=memory&tab=graph', { waitUntil: 'networkidle' });
	const picker = page.getByRole('combobox', { name: 'Select a graph topic' });
	const options = await picker.locator('option').allTextContents();
	expect(options.length).toBeGreaterThan(1);
	expect(options[0].length).toBeGreaterThan(20);
	await picker.selectOption({ index: 1 });
	const selected = await picker.inputValue();
	const statement = await page.locator('.graph-selected p').innerText();
	await page.locator('.graph-detail a').first().click();
	await expect(page.locator('.source-text')).toBeVisible();
	await page.getByRole('link', { name: 'Back to graph' }).click();
	await expect(picker).toHaveValue(selected);
	await expect(page.locator('.graph-selected p')).toHaveText(statement);
	await page.screenshot({ path: '/tmp/relio-ux-graph-desktop.png' });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: '/tmp/relio-ux-graph-mobile.png' });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
});

test('sending a reply focuses the new message rather than archive history', async ({ page }) => {
	await page.goto('/?view=email', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: '1. Schedule the bakery review' }).click();
	await page.getByRole('checkbox', { name: 'Include project memory' }).uncheck();
	await page.locator('#mail-body').fill('New message focus check. No project update requested.');
	await page.getByRole('button', { name: 'Send message', exact: true }).click();
	const sent = page.locator('.mail-message').filter({ hasText: 'New message focus check.' });
	await expect(sent).toBeFocused();
	await expect(sent).toBeInViewport();
	await expect(sent.locator('[role=status]')).toBeVisible();
	await page.screenshot({ path: '/tmp/relio-ux-sent-desktop.png' });
});
