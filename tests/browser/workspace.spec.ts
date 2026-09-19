import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('filtering, dialog keyboard behavior, and accessible desktop/mobile layout', async ({
	page
}) => {
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Search examples' }).fill('two');
	await expect(page.getByRole('cell', { name: 'Example two', exact: false })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'Example one', exact: false })).toHaveCount(0);
	await page.getByRole('textbox', { name: 'Search examples' }).fill('');
	await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('Review');
	await expect(page.getByRole('cell', { name: 'Example three', exact: false })).toBeVisible();
	await page.getByRole('button', { name: 'Preview dialog' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Preview dialog' })).toBeFocused();
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('settings persist with and without JavaScript', async ({ browser }) => {
	for (const javaScriptEnabled of [true, false]) {
		const context = await browser.newContext({ javaScriptEnabled });
		const page = await context.newPage();
		await page.goto('http://127.0.0.1:34342/settings');
		const name = javaScriptEnabled ? 'Example team' : 'Workspace';
		await page.getByLabel('Workspace name').fill(name);
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByRole('status')).toHaveText('Workspace name saved.');
		await page.reload();
		await expect(page.getByLabel('Workspace name')).toHaveValue(name);
		if (javaScriptEnabled)
			expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
		await context.close();
	}
});
