import { expect, test } from '@playwright/test';

const TOGGLE = '#theme-toggle';
const LIGHT_BG = 'rgb(255, 255, 255)';
const DARK_BG = 'rgb(20, 22, 28)';

/** background-color of <body> resolved by the browser. */
async function bodyBackground(page: import('@playwright/test').Page) {
	return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe('auto selection on load', () => {
	test('picks light from a light system preference', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
	});

	test('picks dark from a dark system preference', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect(await bodyBackground(page)).toBe(DARK_BG);
	});

	test('reacts to system preference changes until the user chooses', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await page.emulateMedia({ colorScheme: 'dark' });
		await expect.poll(() => bodyBackground(page)).toBe(DARK_BG);
	});
});

test.describe('manual toggle', () => {
	test('flips between light and dark', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		const toggle = page.locator(TOGGLE);

		await toggle.click(); // dark -> light
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);

		await toggle.click(); // light -> dark
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect(await bodyBackground(page)).toBe(DARK_BG);

		await toggle.click(); // dark -> light again
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
	});

	test('chosen theme ignores later system changes', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await page.locator(TOGGLE).click(); // choose light
		await page.emulateMedia({ colorScheme: 'dark' });
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
	});

	test('choice is not persisted: reload returns to the system preference', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await page.locator(TOGGLE).click(); // choose dark
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		const storage = await page.evaluate(() => ({
			local: localStorage.length,
			session: sessionStorage.length,
			cookies: document.cookie,
		}));
		expect(storage).toEqual({ local: 0, session: 0, cookies: '' });

		await page.reload();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
	});

	test('choice is not persisted: navigating to another page returns to the system preference', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await page.locator(TOGGLE).click(); // choose dark
		await page.getByRole('link', { name: 'Blog', exact: true }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
	});
});

test('dark theme keeps article text readable', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/blog/8b10b-encoding-en/');
	const heading = page.locator('.prose h1');
	await expect(heading).toHaveCSS('color', 'rgb(235, 238, 245)');
	// Code blocks keep their dark Shiki background on both themes.
	const pre = page.locator('pre.astro-code').first();
	await expect(pre).toHaveCSS('background-color', 'rgb(36, 41, 46)');
});