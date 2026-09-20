import { test, expect } from '@playwright/test';

test('source names navigate to selected People profiles with organization and appropriate preparation', async ({
	page
}) => {
	await page.goto('/source/' + encodeURIComponent('emails/15_uat-signoff#message-003'));
	await expect(page.locator('.source-text .person-name').first()).toBeVisible();
	const header = page.locator('.source-meta .person-name').first();
	await expect(header).toHaveText('Ana Duarte');
	await header.click();
	await expect(page).toHaveURL(/view=people&person=/);
	await expect(page.locator('.person-detail h2')).toHaveText('Ana Duarte');
	await expect(page.locator('.person-detail .badge').first()).toHaveText('RELEX');
	await expect(page.getByRole('button', { name: 'Prepare collaboration brief' })).toHaveCount(0);
	await expect(
		page.locator('.person-detail .evidence, .person-detail [role="status"]')
	).toBeVisible();
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.locator('.person-detail h2')).toHaveText('Ana Duarte');
	await page.locator('#organization').selectOption('customer');
	await expect(page.locator('.people-list button')).toHaveCount(5);
	await page.locator('.people-list button').filter({ hasText: 'Lena Fischer' }).click();
	await expect(page.locator('.person-detail .badge').first()).toHaveText('Acme · Customer');
	await expect(page.getByRole('button', { name: 'Prepare customer conversation' })).toHaveCount(0);
	await expect(
		page.locator('.person-detail .evidence, .person-detail [role="status"]')
	).toBeVisible();
	await page.goto('/source/' + encodeURIComponent('emails/15_uat-signoff#message-003'));
	await expect(page.locator('.source-mail .person-name').first()).toBeVisible();
	await expect(page.locator('.source-neighbours .person-name').first()).toBeVisible();
	const link = page.locator('.source-text .person-name').filter({ hasText: /Lena/ }).first();
	await link.click();
	await expect(page.locator('.person-detail h2')).toHaveText('Lena Fischer');
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.locator('.person-detail h2')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
	await page.screenshot({ path: 'test-results/people-mobile.png', fullPage: true });
});
