import { expect, test } from '@playwright/test';

const LINKS = '.internal-links a';

async function navRects(page: import('@playwright/test').Page) {
	return page.locator(LINKS).evaluateAll((links) =>
		links.map((a) => {
			const r = a.getBoundingClientRect();
			return { x: r.x, width: r.width };
		}),
	);
}

test('active nav link does not shift the nav bar', async ({ page }) => {
	await page.goto('/');
	const home = await navRects(page);

	await page.getByRole('link', { name: 'Blog', exact: true }).click();
	await expect(page.locator('.internal-links a.active')).toHaveText('Blog');
	expect(await navRects(page)).toEqual(home);

	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('.internal-links a.active')).toHaveText('Home');
	expect(await navRects(page)).toEqual(home);
});

test('the blog index uses a page heading and highlights post titles and dates on hover', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/blog/');

	const main = page.getByRole('main');
	await expect(main.getByRole('heading', { level: 1 })).toHaveText('Blog');
	const posts = main.getByRole('listitem');
	await expect(main.getByRole('heading', { level: 2 })).toHaveCount(await posts.count());

	const post = posts.first();
	const title = post.getByRole('heading', { level: 2 });
	await title.hover();
	await expect(title).toHaveCSS('color', 'rgb(35, 55, 255)');
	await expect(post.locator('time')).toHaveCSS('color', 'rgb(35, 55, 255)');
});

test('the blog index displays publication dates in UTC', async ({ page }) => {
	await page.goto('/blog/');

	const dates = await page.locator('main time').evaluateAll((elements) => {
		const format = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
		return elements.map((element) => ({
			text: element.textContent?.trim(),
			expected: format.format(new Date((element as HTMLTimeElement).dateTime)),
		}));
	});
	expect(dates.length).toBeGreaterThan(0);
	expect(dates.map(({ text }) => text)).toEqual(dates.map(({ expected }) => expected));
});

test('the RSS feed lists newest posts first, breaking date ties by ID', async ({ page, request }) => {
	const response = await request.get('/rss.xml');
	await expect(response).toBeOK();

	const items = await page.evaluate((xml) => {
		const feed = new DOMParser().parseFromString(xml, 'application/xml');
		return Array.from(feed.querySelectorAll('channel > item'), (item) => ({
			date: Date.parse(item.querySelector('pubDate')!.textContent!),
			id: new URL(item.querySelector('link')!.textContent!).pathname.slice('/blog/'.length, -1),
		}));
	}, await response.text());
	expect(items.length).toBeGreaterThan(1);
	expect(items.every(({ date }) => Number.isFinite(date))).toBe(true);
	expect(items).toEqual(items.toSorted((a, b) => b.date - a.date || a.id.localeCompare(b.id, 'en')));
});
