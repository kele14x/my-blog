import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests live in tests/e2e and are run by Playwright's own runner.
 * They are kept out of tests/*.test.ts so that `npm test` (node --test) and
 * `npm run test:e2e` never try to claim each other's files.
 */
const PORT = 4399;
// Astro binds to ::1 by default, so ask for 127.0.0.1 explicitly; otherwise
// a browser resolving localhost over IPv4 cannot reach the preview server.
const HOST = '127.0.0.1';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	reporter: [['list']],
	use: {
		baseURL: `http://${HOST}:${PORT}`,
		trace: 'retain-on-failure',
	},
	webServer: {
		command: `npm run build && npm run preview -- --host ${HOST} --port ${PORT}`,
		env: { TZ: 'America/Los_Angeles' }, // Catch UTC dates rendered as the previous day.
		url: `http://${HOST}:${PORT}/`,
		reuseExistingServer: true,
		timeout: 120_000,
	},
	projects: [
		{
			name: 'chrome',
			// Reuse the locally installed Google Chrome instead of downloading
			// Playwright's bundled browsers.
			use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		},
	],
});
