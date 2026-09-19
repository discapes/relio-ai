import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: 'tests/browser',
	workers: 1,
	use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:34342', headless: true, screenshot: 'off' },
	webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
		command: 'npm run build && npm start',
		url: 'http://127.0.0.1:34342',
		reuseExistingServer: false,
		env: { DATA_DIR: './test-results/data', DISABLE_BACKGROUND: '1', ORIGIN: 'http://127.0.0.1:34342' }
	}
});
