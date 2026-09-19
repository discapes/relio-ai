import { test, expect } from '@playwright/test';

test('starter loads as a blank page', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle('Solution 3');
	await expect(page.locator('body')).toHaveText('');
	await expect(page.locator('button, input, nav, header, footer, main, table, dialog')).toHaveCount(
		0
	);
});
