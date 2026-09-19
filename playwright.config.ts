import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: 'tests/browser',
	workers: 1,
	use: { baseURL: 'http://127.0.0.1:34342', headless: true, screenshot: 'off' },
	webServer: {
		command: 'npm run build && npm start',
		url: 'http://127.0.0.1:34342',
		reuseExistingServer: false,
		env: { DATA_DIR: './test-results/data', ORIGIN: 'http://127.0.0.1:34342' }
	}
});
