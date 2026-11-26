import { expect, test as base, type Locator, type Page } from '@playwright/test';

const DEFAULT_DATA = '1011';
const DEFAULT_CODEWORD_FROM_ARTICLE = '10110001';
const BIT_LABELS = ['d0', 'd1', 'd2', 'd3', 'p0', 'p1', 'p2', 'q'];
const H_COLUMNS_FROM_ARTICLE = ['1011', '1110', '1101', '0111', '1000', '0100', '0010', '0001'];

const locales = [
	{
		lang: 'zh-Hans',
		path: '/blog/fec-introduction/',
		title: 'FEC 入门：汉明码、伴随式与 SECDED',
		heading: '亲手试试：8 个比特的纠错',
		languageNav: '文章语言',
		languageName: '中文',
		generalHeading: '一般的汉明码',
		secded: '这种扩展汉明码在 20 世纪的计算机存储系统中非常流行',
		one: '随机翻转一位',
		two: '随机翻转两位',
		clear: '清除错误',
		count: (n: number) => `实际注入：${n} 位错误${n >= 3 ? '，超出 SECDED 保证范围，可能误纠或漏检。' : ''}`,
		clean: '未检测到错误',
		removedHints: [
			'点击切换 0 / 1，自动重新编码并译码。改变数据不会清除错误掩码。',
			'当前内存 = 原始码字 XOR 错误掩码。点击内存中的任意位切换对应掩码位，再点一次即可还原。',
			'快捷按钮会替换当前掩码：随机选取一位数据，或在全部 8 位中随机选取两位不同的比特（包含校验位）。',
			'真实结果 · 仅供教学对照',
			'S = 000 且 T = 0，按无错处理；这不保证没有多比特错误。',
			'已超出 SECDED 保证范围：三位及以上错误可能导致误纠或漏检。',
			...BIT_LABELS.map((label) => `T = 1，四位伴随式与 H 的 ${label} 列匹配。`),
			'S ≠ 000 且 T = 0。在至多两位错误的假设下，这是双错，只检出、不纠正。',
		],
		corrected: (label: string) => `按单错纠正：翻转 ${label}`,
		uncorrectable: '检测到不可纠正的错误',
		outputData: '译码输出 · d0 d1 d2 d3',
		noOutput: '不输出有效数据',
		match: '输出数据与原始数据一致。',
		mismatch: '输出数据与原始数据不同：发生了误纠或漏检。',
		rejected: '译码器拒绝输出有效数据，不把受损数据当作正确结果。',
		inputName: (label: string, bit: number) => `输入 ${label}：${bit}，点击翻转`,
		memoryName: (label: string, bit: number) => `内存 ${label}：${bit}，已翻转，点击切换`,
		scrollHint: '窄屏下可横向滑动查看全部 8 位。',
		noscript: '此交互示例需要启用 JavaScript。正文与公式仍可正常阅读。',
	},
	{
		lang: 'en',
		path: '/blog/fec-introduction-en/',
		title: 'FEC Basics: Hamming Codes, Syndromes, and SECDED',
		heading: 'Try it: error correction in 8 bits',
		languageNav: 'Article language',
		languageName: 'English',
		generalHeading: 'General Hamming codes',
		secded: 'Extended Hamming codes were very popular in computer storage systems during the twentieth century.',
		one: 'One random bit error',
		two: 'Two random bit errors',
		clear: 'Clear errors',
		count: (n: number) => `Actually injected: ${n} bit error${n === 1 ? '' : 's'}${n >= 3 ? ', outside the SECDED guarantee; may be miscorrected or go undetected.' : ''}`,
		clean: 'No error detected',
		removedHints: [
			'Click to toggle 0 / 1. Encoding and decoding update automatically; changing data keeps the error mask.',
			'Memory now = original codeword XOR error mask. Click any memory bit to toggle its mask bit; click again to restore it.',
			'Shortcuts replace the current mask: choose one random data bit, or two distinct bits from all 8 positions, including parity bits.',
			'What actually happened · teaching reference only',
			'S = 000 and T = 0: treat as error-free. This does not rule out multiple errors.',
			'Outside the SECDED guarantee: 3 or more errors may cause miscorrection or go undetected.',
			...BIT_LABELS.map((label) => `T = 1; the four-bit syndrome matches column ${label} of H.`),
			'S ≠ 000 and T = 0. Assuming at most two errors, this is a double error: detect, but do not correct.',
		],
		corrected: (label: string) => `Single-error correction: flip ${label}`,
		uncorrectable: 'Uncorrectable error detected',
		outputData: 'Decoded data · d0 d1 d2 d3',
		noOutput: 'No valid data output',
		match: 'The output data matches the original.',
		mismatch: 'The output data differs from the original: a miscorrection or undetected error.',
		rejected: 'The decoder refuses to output valid data instead of accepting the corrupted word.',
		inputName: (label: string, bit: number) => `Input ${label}: ${bit}, click to flip`,
		memoryName: (label: string, bit: number) => `Memory ${label}: ${bit}, flipped, click to toggle`,
		scrollHint: 'On narrow screens, scroll sideways to see all 8 bits.',
		noscript: 'Enable JavaScript to use this example. The article and formulas remain readable without it.',
	},
] as const;

type Locale = (typeof locales)[number];

const test = base.extend<{ browserGuard: void }>({
	browserGuard: [async ({ page, context, baseURL }, use) => {
		if (!baseURL) throw new Error('The local Playwright baseURL is required.');
		const origin = new URL(baseURL).origin;
		const errors: string[] = [];
		const recordError = (error: Error) => errors.push(error.message);
		page.on('pageerror', recordError);
		await context.route('**/*', async (route) => {
			if (new URL(route.request().url()).origin === origin) {
				await route.continue();
			} else {
				await route.abort('blockedbyclient');
			}
		});
		await use();
		page.off('pageerror', recordError);
		expect(errors, 'No uncaught page errors, with external resources including giscus blocked').toEqual([]);
	}, { auto: true }],
});

test.use({ serviceWorkers: 'block' });

function action(demo: Locator, name: string) {
	return demo.locator(`[data-action="${name}"]`);
}

async function expectBits(demo: Locator, selector: string, word: string) {
	await expect(demo.locator(selector)).toHaveText(word.split(''));
}

async function expectAscendingOrder(demo: Locator, locale: Locale) {
	await expect(demo.locator('[data-input] .bit-label')).toHaveText(BIT_LABELS.slice(0, 4));
	await expect(demo.locator('.reference-bit .bit-label')).toHaveText(BIT_LABELS);
	await expect(demo.locator('[data-memory] .bit-label')).toHaveText(BIT_LABELS);
	await expect(demo.locator('[data-output-bit] small')).toHaveText(BIT_LABELS);
	await expect(demo.locator('[data-output] > .hint').last()).toHaveText(locale.outputData);
	await expect(demo.locator('[data-syndrome] + small')).toHaveText('[s0, s1, s2]');
	await expect(demo.locator('.matrix-check')).toContainText('r · Hᵀ = [s0, s1, s2, s3]');
	await expect(demo.locator('.math-help > p').first()).toContainText(`[${BIT_LABELS.join(', ')}]`);
}

async function openDemo(page: Page, locale: Locale) {
	await page.goto(locale.path);
	const demo = page.locator('hamming-demo#hamming84-demo');
	await expect(demo).toHaveCount(1);
	await expect(demo).toHaveAttribute('lang', locale.lang);
	await expect(demo).toHaveAccessibleName(locale.heading);
	await expect(demo.getByRole('heading', { name: locale.heading, exact: true })).toBeVisible();
	await expect(demo.locator('button')).toHaveCount(15);
	await expect(demo.locator('button:disabled')).toHaveCount(0);
	await expectAscendingOrder(demo, locale);
	return demo;
}

function xorWord(word: string, flipped: readonly number[]) {
	return [...word].map((bit, index) => String(Number(bit) ^ Number(flipped.includes(index)))).join('');
}

async function expectMemory(demo: Locator, word: string, flipped: readonly number[] = []) {
	await expectBits(demo, '[data-memory] [data-value]', word);
	await expect.poll(() => demo.locator('[data-memory]').evaluateAll((bits) =>
		bits.map((bit) => bit.getAttribute('aria-pressed')),
	)).toEqual(BIT_LABELS.map((_, index) => String(flipped.includes(index))));
	await expect(demo.locator('[data-memory] [data-change]')).toHaveText(
		BIT_LABELS.map((_, index) => flipped.includes(index) ? '≠' : '·'),
	);
}

async function readErrorMask(demo: Locator) {
	return demo.locator('[data-memory][aria-pressed="true"]').evaluateAll((bits) =>
		bits.map((bit) => Number(bit.getAttribute('data-memory'))),
	);
}

async function clickRandomPreset(demo: Locator, name: 'one' | 'two', indices: readonly number[]) {
	const current = await readErrorMask(demo);
	expect([...indices].sort((left, right) => left - right), 'Preset target must differ from the current DOM mask').not.toEqual(current);
	const currentMask = current.reduce((mask, index) => mask | (1 << index), 0);
	const candidates: number[][] = [];
	for (let first = 0; first < 8; first++) {
		if (name === 'one') {
			candidates.push([first]);
		} else {
			for (let second = first + 1; second < 8; second++) candidates.push([first, second]);
		}
	}
	const remaining = candidates.filter((candidate) =>
		candidate.reduce((mask, index) => mask | (1 << index), 0) !== currentMask,
	);
	const position = remaining.findIndex((candidate) =>
		candidate.length === indices.length && candidate.every((index) => indices.includes(index)),
	);
	expect(position).toBeGreaterThanOrEqual(0);
	const sample = (position + 0.5) / remaining.length;
	const page = demo.page();
	await page.evaluate((value) => {
		const original = Math.random;
		let calls = 0;
		Object.assign(window, {
			__restoreHammingRandom: () => {
				Math.random = original;
				return calls;
			},
		});
		Math.random = () => {
			if (++calls > 1) throw new Error('Unexpected extra random sample');
			return value;
		};
	}, sample);
	let calls: number;
	try {
		await action(demo, name).click();
	} finally {
		calls = await page.evaluate(() => {
			const scope = window as Window & { __restoreHammingRandom?: () => number };
			const count = scope.__restoreHammingRandom!();
			delete scope.__restoreHammingRandom;
			return count;
		});
	}
	expect(calls).toBe(1);
}

async function expectChecks(demo: Locator, syndrome: string, overall: number, fullSyndrome: string) {
	await expect(demo.locator('[data-syndrome]')).toHaveText(syndrome);
	await expect(demo.locator('[data-overall]')).toHaveText(String(overall));
	await expect(demo.locator('[data-full-syndrome]')).toHaveText(fullSyndrome);
}

async function expectOutput(
	demo: Locator,
	codeword: string,
	data: string,
	actual: string,
	correctedIndex: number | null = null,
	mismatch = false,
) {
	await expect(demo.locator('[data-output]')).toBeVisible();
	await expectBits(demo, '[data-output-bit] [data-value]', codeword);
	await expect(demo.locator('[data-data]')).toHaveText(data.split('').join(' '));
	await expect(demo.locator('[data-comparison]')).toBeVisible();
	await expect(demo.locator('[data-comparison]')).toHaveAttribute('data-mismatch', String(mismatch));
	await expect(demo.locator('[data-actual]')).toHaveText(actual);
	const corrected = demo.locator('[data-output-bit][data-corrected="true"]');
	await expect(corrected).toHaveCount(correctedIndex === null ? 0 : 1);
	if (correctedIndex !== null) await expect(corrected).toHaveAttribute('data-output-bit', String(correctedIndex));
}

async function expectSnapshot(
	demo: Locator,
	locale: Locale,
	flipped: readonly number[] = [],
	correction: number | 'reject' | null = null,
	data = DEFAULT_DATA,
	codeword = DEFAULT_CODEWORD_FROM_ARTICLE,
) {
	await expectBits(demo, '[data-input] [data-value]', data);
	await expectBits(demo, '[data-original]', codeword);
	const received = xorWord(codeword, flipped);
	await expectMemory(demo, received, flipped);
	const count = demo.locator('[data-count]');
	await expect(count).toHaveCount(1);
	await expect(count).toHaveJSProperty('tagName', 'P');
	await expect(count).toBeVisible();
	await expect(count).toHaveAttribute('role', 'status');
	await expect(count).toHaveAttribute('aria-live', 'polite');
	await expect(count).toHaveAttribute('data-outside', String(flipped.length >= 3));
	await expect(count).toHaveText(locale.count(flipped.length));
	await expect(demo.locator('[data-warning], [data-reason]')).toHaveCount(0);
	await expectRemovedMessages(demo);
	const full = Array.from({ length: 4 }, (_, row) => flipped.reduce(
		(bit, index) => bit ^ Number(H_COLUMNS_FROM_ARTICLE[index][row]), 0,
	));
	await expectChecks(demo, full.slice(0, 3).join(' '), flipped.length % 2, `[${full.join(', ')}]`);
	if (correction === 'reject') {
		await expect(demo.locator('[data-readout]')).toHaveAttribute('data-state', 'uncorrectable');
		await expect(demo.locator('[data-verdict]')).toHaveText(locale.uncorrectable);
		await expect(demo.locator('[data-output]')).toBeVisible();
		await expect(demo.locator('[data-data]')).toBeVisible();
		await expect(demo.locator('[data-data]')).toHaveText(locale.noOutput);
		await expectBits(demo, '[data-output-bit] [data-value]', '————————');
		await expect(demo.locator('[data-output-bit][data-corrected="true"]')).toHaveCount(0);
		await expect(demo.locator('[data-comparison]')).toBeVisible();
		await expect(demo.locator('[data-comparison]')).toHaveAttribute('data-mismatch', 'false');
		await expect(demo.locator('[data-actual]')).toBeVisible();
		await expect(demo.locator('[data-actual]')).toHaveText(locale.rejected);
	} else {
		const label = correction === null ? null : BIT_LABELS[correction];
		await expect(demo.locator('[data-readout]')).toHaveAttribute('data-state', label === null ? 'clean' : 'corrected');
		await expect(demo.locator('[data-verdict]')).toHaveText(label === null ? locale.clean : locale.corrected(label));
		const output = correction === null ? received : xorWord(received, [correction]);
		const mismatch = output.slice(0, 4) !== data;
		await expectOutput(demo, output, output.slice(0, 4), mismatch ? locale.mismatch : locale.match, correction, mismatch);
	}
}

async function expectRemovedMessages(demo: Locator) {
	const renderedText = await demo.innerText();
	expect(locales.flatMap((locale) => locale.removedHints).filter((hint) => renderedText.includes(hint))).toEqual([]);
}

async function expectExplanations(demo: Locator, locale: Locale) {
	await expect(demo.locator('.step')).toHaveCount(3);
	await expect(demo.locator('.section-help')).toHaveCount(2);
	await expect(demo.locator('[data-step="write"] > .section-help')).toHaveCount(0);
	for (const name of ['inject', 'read']) {
		const step = demo.locator(`.step[data-step="${name}"]`);
		await expect(step.locator(':scope > .section-help:last-child')).toHaveCount(1);
		await expect(step.locator(':scope > .section-help > *')).toHaveCount(1);
	}
	await expect(demo.locator('[data-step="inject"] > .section-help > .scroll-hint')).toHaveText(locale.scrollHint);
	await expect(demo.locator('.math-help')).toHaveCount(1);
	await expect(demo.locator('.read-step > .section-help > .math-help')).toHaveCount(1);
	await expect(demo.locator('[data-comparison] > .hint, .boundary, [data-warning], [data-reason]')).toHaveCount(0);
	await expectRemovedMessages(demo);
}

async function expectPlacement(demo: Locator, locale: Locale) {
	const previous = demo.locator('xpath=preceding-sibling::*[not(self::script or self::style)][1]');
	await expect(previous).toHaveJSProperty('tagName', 'P');
	await expect(previous).toContainText(locale.secded);
	await expect(previous).toContainText('SECDED');
	const next = demo.locator('xpath=following-sibling::*[not(self::script or self::style)][1]');
	await expect(next).toHaveJSProperty('tagName', 'H2');
	// Post headings start with an automatic section number, such as "3 General Hamming codes".
	await expect(next).toHaveText(new RegExp(`^\\d+(\\.\\d+)* ${locale.generalHeading}$`));
}

async function expectContained(page: Page, demo: Locator) {
	const widths = await page.evaluate(() => ({
		viewport: document.documentElement.clientWidth,
		document: document.documentElement.scrollWidth,
		body: document.body.scrollWidth,
	}));
	expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
	expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
	const bounds = await demo.boundingBox();
	expect(bounds).not.toBeNull();
	expect(bounds!.x).toBeGreaterThanOrEqual(0);
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(widths.viewport + 1);
}

async function expectSizingContract(demo: Locator, locale: Locale) {
	await expect(demo.locator('.stable-text')).toHaveCount(4);
	await expect(demo.locator('.sizing-text')).toHaveCount(24);
	for (const group of [
		{
			selector: '.stable-text.error-count',
			actual: '[data-count]',
			texts: Array.from({ length: 9 }, (_, count) => locale.count(count)),
		},
		{
			selector: '.verdict-block > .stable-text',
			actual: '[data-verdict]',
			texts: [locale.clean, ...BIT_LABELS.map(locale.corrected), locale.uncorrectable],
		},
		{
			selector: '[data-output] > .stable-text',
			actual: '[data-data]',
			texts: [locale.noOutput, '0 0 0 0'],
		},
		{
			selector: '.comparison.stable-text[data-comparison]',
			actual: '[data-actual]',
			texts: [locale.match, locale.rejected, locale.mismatch],
		},
	]) {
		const wrapper = demo.locator(group.selector);
		const actual = wrapper.locator(`:scope > p${group.actual}:last-child`);
		const sizers = wrapper.locator(':scope > p.sizing-text');
		await expect(wrapper).toHaveCount(1);
		await expect(wrapper).toHaveCSS('display', 'grid');
		await expect(wrapper.locator(':scope > *')).toHaveCount(group.texts.length + 1);
		await expect(actual).toHaveCount(1);
		await expect(actual).toBeVisible();
		await expect(sizers).toHaveCount(group.texts.length);
		expect((await sizers.allTextContents()).map((text) => text.trim()).sort()).toEqual([...group.texts].sort());
		await expect(wrapper.locator('.sizing-text:visible')).toHaveCount(0);
		await expect(wrapper.locator('.sizing-text:not([aria-hidden="true"])')).toHaveCount(0);
		expect(await wrapper.ariaSnapshot(), `${group.actual}: no accessible sizing duplicates`).toBe(await actual.ariaSnapshot());
	}
	await expect(demo.locator('.verdict-block > .hint')).toHaveCount(1);
	await expect(demo.locator('.verdict-block > .stable-text .hint')).toHaveCount(0);
	await expect(demo.locator('.comparison > .sizing-text.mismatch')).toHaveText(locale.mismatch);
	await expect(demo.getByRole('status')).toHaveCount(2);
}

async function measureGeometry(demo: Locator) {
	return demo.evaluate((element) => {
		const root = element as HTMLElement;
		const panel = root.getBoundingClientRect();
		const metrics: Record<string, number> = { 'panel.width': panel.width, 'panel.height': panel.height };
		const problems: string[] = [];
		const check = (condition: boolean, message: string) => {
			if (!condition) problems.push(message);
		};
		const query = (selector: string) => root.querySelector<HTMLElement>(selector)!;
		const text = (selector: string) => query(selector).textContent!.trim();
		for (const [name, selector] of [
			['readout', '.readout[data-readout]'],
			['step', '[data-step]'],
			['controls', '.input-bits, .memory-scroll, .shortcuts, .math-help summary'],
			['help', '.section-help'],
			['stable', '.stable-text'],
			['original', '.reference-bit'],
			['result', '[data-output-bit]'],
			['button', 'button'],
		]) {
			root.querySelectorAll<HTMLElement>(selector).forEach((node, index) => {
				const rect = node.getBoundingClientRect();
				const scroll = node.closest<HTMLElement>('.memory-scroll');
				const prefix = `${name}.${index}`;
				metrics[`${prefix}.top`] = rect.top - panel.top;
				metrics[`${prefix}.left`] = rect.left - panel.left + (scroll && scroll !== node ? scroll.scrollLeft : 0);
				metrics[`${prefix}.height`] = rect.height;
				metrics[`${prefix}.width`] = rect.width;
			});
		}
		const fits = (node: HTMLElement, name: string) => {
			check(node.scrollHeight <= node.clientHeight + 1, `${name}: vertical clipping/overflow`);
			check(node.scrollWidth <= node.clientWidth + 1, `${name}: horizontal clipping/overflow`);
		};
		fits(root, 'panel');
		root.querySelectorAll<HTMLElement>('.readout, [data-step]').forEach((node, index) => fits(node, `section ${index}`));
		const lines: Record<string, number> = {};
		root.querySelectorAll<HTMLElement>('.stable-text').forEach((wrapper, index) => {
			const name = `stable ${index}`;
			const actual = wrapper.querySelector<HTMLElement>('[data-count], [data-verdict], [data-data], [data-actual]')!;
			const actualStyle = getComputedStyle(actual);
			const wrapperStyle = getComputedStyle(wrapper);
			check(wrapperStyle.display === 'grid', `${name}: must use grid`);
			check(wrapperStyle.overflowX === 'visible' && wrapperStyle.overflowY === 'visible', `${name}: must not clip`);
			check(actualStyle.gridRowStart !== 'auto' && actualStyle.gridColumnStart !== 'auto', `${name}: explicit overlap cell`);
			check(actualStyle.visibility === 'visible' && actual.getAttribute('aria-hidden') !== 'true', `${name}: actual text exposed`);
			fits(wrapper, name);
			for (const [childIndex, child] of Array.from(wrapper.children).entries()) {
				const node = child as HTMLElement;
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				const label = `${name}, child ${childIndex}`;
				const sizing = node.classList.contains('sizing-text');
				check(node.tagName === 'P', `${label}: paragraph`);
				check(style.gridArea === actualStyle.gridArea, `${label}: same overlap cell`);
				check(style.display !== 'none' && rect.height > 0 && rect.width > 0, `${label}: reserves layout space`);
				check(style.whiteSpace === 'normal', `${label}: normal wrapping`);
				check(style.overflowX === 'visible' && style.overflowY === 'visible', `${label}: no clipping`);
				check(['', 'none', '0'].includes(style.getPropertyValue('-webkit-line-clamp')), `${label}: no line clamp`);
				check(['', 'none', '0'].includes(style.getPropertyValue('line-clamp')), `${label}: no standard line clamp`);
				check(style.textOverflow !== 'ellipsis', `${label}: no ellipsis`);
				for (const property of ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing'] as const) {
					check(style[property] === actualStyle[property], `${label}: same ${property} as actual`);
				}
				if (wrapper.matches('.comparison')) {
					const bold = sizing ? node.classList.contains('mismatch') : wrapper.dataset.mismatch === 'true';
					check(style.fontWeight === (bold ? '700' : '400'), `${label}: comparison weight`);
				} else {
					check(style.fontWeight === actualStyle.fontWeight, `${label}: same font weight as actual`);
				}
				if (sizing) {
					check(node.getAttribute('aria-hidden') === 'true' && style.visibility === 'hidden', `${label}: hidden from sight and accessibility`);
					check(!node.hidden && style.pointerEvents === 'none' && style.userSelect === 'none', `${label}: noninteractive layout sizer`);
					check(!node.matches('[role], [aria-live], [tabindex]'), `${label}: no live or focus semantics`);
				}
				fits(node, label);
				const range = document.createRange();
				range.selectNodeContents(node);
				const rects = Array.from(range.getClientRects()).filter((line) => line.width > 0 && line.height > 0);
				check(rects.every((line) => line.left >= rect.left - 1 && line.right <= rect.right + 1
					&& line.top >= rect.top - 1 && line.bottom <= rect.bottom + 1), `${label}: wrapped text fits its box`);
				if (!sizing) {
					const key = ['data-count', 'data-verdict', 'data-data', 'data-actual'].find((attribute) => node.hasAttribute(attribute))!;
					lines[key] = new Set(rects.map((line) => Math.round(line.top))).size;
				}
			}
		});
		const viewport = document.documentElement.clientWidth;
		check(document.documentElement.scrollWidth <= viewport + 1, 'document: horizontal overflow');
		check(document.body.scrollWidth <= viewport + 1, 'body: horizontal overflow');
		check(panel.left >= -1 && panel.right <= viewport + 1, 'panel: outside viewport');
		check(root.querySelectorAll('[data-warning], [data-reason]').length === 0, 'removed explanation elements');
		const active = document.activeElement;
		const focusAttribute = ['data-input', 'data-memory', 'data-action'].find((attribute) => active?.hasAttribute(attribute));
		return {
			metrics,
			problems,
			lines,
			focus: focusAttribute ? `${focusAttribute}:${active!.getAttribute(focusAttribute)}` : null,
			detailsOpen: root.querySelector<HTMLDetailsElement>('.math-help')!.open,
			state: {
				input: Array.from(root.querySelectorAll('[data-input] [data-value]'), (node) => node.textContent).join(''),
				mask: Array.from(root.querySelectorAll('[data-memory]'), (node) => node.getAttribute('aria-pressed') === 'true'),
				count: text('[data-count]'),
				outside: query('[data-count]').dataset.outside,
				verdict: text('[data-verdict]'),
				status: query('[data-readout]').dataset.state,
				data: text('[data-data]'),
				actual: text('[data-actual]'),
				mismatch: query('[data-comparison]').dataset.mismatch,
			},
		};
	});
}

async function appearance(demo: Locator) {
	return demo.evaluate((root) => {
		const style = (selector: string) => getComputedStyle(root.querySelector(selector)!);
		return {
			background: getComputedStyle(root).backgroundColor,
			foreground: getComputedStyle(root).color,
			readout: style('[data-readout]').backgroundColor,
			hint: style('.hint').color,
			controlBackground: style('[data-input="0"]').backgroundColor,
			controlForeground: style('[data-input="0"]').color,
			error: style('[data-memory="3"]').color,
			verdict: style('[data-verdict]').color,
		};
	});
}

for (const locale of locales) {
	test.describe(`Hamming (8,4) ${locale.lang}`, () => {
		test('starts with 1011 in ascending bit order, all 15 controls active, and only scroll/math help below the relevant steps', async ({ page }) => {
			const demo = await openDemo(page, locale);
			await expectSnapshot(demo, locale);
			for (const [index, bit] of DEFAULT_DATA.split('').entries()) {
				const input = demo.locator(`[data-input="${index}"]`);
				await expect(input).toHaveAttribute('aria-pressed', String(bit === '1'));
				await expect(input).toHaveAccessibleName(locale.inputName(BIT_LABELS[index], Number(bit)));
			}
			await expect(demo.locator('[data-action]')).toHaveCount(3);
			for (const name of ['one', 'two', 'clear'] as const) {
				await expect(action(demo, name)).toHaveAccessibleName(locale[name]);
			}
			await expect(demo.locator('[data-action="store"], [data-action="decode"], [data-draft]')).toHaveCount(0);
			await expect(demo.locator('[data-readout]')).toHaveAttribute('aria-live', 'polite');
			await expect(demo.locator('[data-readout]')).toHaveAttribute('aria-atomic', 'true');
			await expectExplanations(demo, locale);
			await expectSizingContract(demo, locale);
			await demo.locator('.math-help summary').click();
			await expect(demo.locator('[data-full-syndrome]')).toBeVisible();
		});

		for (const example of [
			{ index: 0, label: 'd0', received: '00110001', syndrome: '1 0 1', full: '[1, 0, 1, 1]' },
			{ index: 7, label: 'q', received: '10110000', syndrome: '0 0 0', full: '[0, 0, 0, 1]' },
		]) {
			test(`automatically corrects ${example.label} without writing the result back to memory or the mask`, async ({ page }) => {
				const demo = await openDemo(page, locale);
				const bit = demo.locator(`[data-memory="${example.index}"]`);
				await bit.click();
				await expect(bit).toHaveAccessibleName(locale.memoryName(example.label, Number(example.received[example.index])));
				await expectSnapshot(demo, locale, [example.index], example.index);
				await expectChecks(demo, example.syndrome, 1, example.full);
				await expectMemory(demo, example.received, [example.index]);
				await bit.click();
				await expectSnapshot(demo, locale);
				await bit.click();
				await expectSnapshot(demo, locale, [example.index], example.index);
			});
		}

		test('one replaces the mask with all eight single-bit errors, including parity/q, without consecutive repeats', async ({ page }) => {
			const demo = await openDemo(page, locale);
			for (const index of [4, 7]) await demo.locator(`[data-memory="${index}"]`).click();
			await expectSnapshot(demo, locale, [4, 7], 'reject');
			for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
				await clickRandomPreset(demo, 'one', [index]);
				await expectSnapshot(demo, locale, [index], index);
			}
		});

		test('two replaces the mask with all 28 distinct pairs, including parity/q, without consecutive repeats', async ({ page }) => {
			test.setTimeout(60_000);
			const demo = await openDemo(page, locale);
			for (const index of [0, 1, 2]) await demo.locator(`[data-memory="${index}"]`).click();
			await expectSnapshot(demo, locale, [0, 1, 2], 4);
			const pairs: number[][] = [];
			for (let first = 0; first < 8; first++) {
				for (let second = first + 1; second < 8; second++) pairs.push([first, second]);
			}
			expect(pairs).toHaveLength(28);
			for (const pair of pairs) {
				await clickRandomPreset(demo, 'two', pair);
				await expectSnapshot(demo, locale, pair, 'reject');
			}
			await action(demo, 'clear').click();
			await expectSnapshot(demo, locale);
		});

		test('random shortcuts are non-repeating with constant samples after manual masks and data changes', async ({ page }) => {
			test.setTimeout(60_000);
			const demo = await openDemo(page, locale);
			await demo.locator('[data-memory="0"]').click();
			await expectSnapshot(demo, locale, [0], 0);
			const manualSingle = await readErrorMask(demo);
			await demo.locator('[data-input="3"]').click();
			expect(await readErrorMask(demo)).toEqual(manualSingle);
			let data = '1010';
			let codeword = '10100110';
			await expectSnapshot(demo, locale, [0], 0, data, codeword);
			await page.evaluate(() => {
				const original = Math.random;
				let calls = 0;
				Object.assign(window, {
					__takeHammingRandomCalls: () => {
						const count = calls;
						calls = 0;
						return count;
					},
					__restoreHammingRandom: () => {
						Math.random = original;
					},
				});
				Math.random = () => {
					if (++calls > 1) throw new Error('Unexpected extra random sample');
					return 0;
				};
			});
			const takeCalls = () => page.evaluate(() => {
				const scope = window as Window & { __takeHammingRandomCalls?: () => number };
				return scope.__takeHammingRandomCalls!();
			});
			const clickZeroPreset = async (name: 'one' | 'two', indices: readonly number[]) => {
				const before = await readErrorMask(demo);
				expect(await takeCalls()).toBe(0);
				await action(demo, name).click();
				expect(await takeCalls()).toBe(1);
				const after = await readErrorMask(demo);
				expect(after).not.toEqual(before);
				expect(after).toHaveLength(name === 'one' ? 1 : 2);
				expect(after).toEqual(indices);
				if (name === 'two' && before.length === 2) {
					expect(after.filter((index) => before.includes(index))).toHaveLength(1);
				}
				await expectSnapshot(demo, locale, indices, name === 'one' ? indices[0] : 'reject', data, codeword);
			};
			try {
				for (const index of [1, 0, 1, 0]) await clickZeroPreset('one', [index]);
				await clickZeroPreset('two', [0, 1]);
				await clickZeroPreset('two', [0, 2]);
				for (const index of [1, 2]) await demo.locator(`[data-memory="${index}"]`).click();
				const manualPair = await readErrorMask(demo);
				expect(manualPair).toEqual([0, 1]);
				await expectSnapshot(demo, locale, manualPair, 'reject', data, codeword);
				await demo.locator('[data-input="3"]').click();
				data = DEFAULT_DATA;
				codeword = DEFAULT_CODEWORD_FROM_ARTICLE;
				expect(await readErrorMask(demo)).toEqual(manualPair);
				await expectSnapshot(demo, locale, manualPair, 'reject', data, codeword);
				for (const pair of [[0, 2], [0, 1], [0, 2], [0, 1]]) await clickZeroPreset('two', pair);
				await clickZeroPreset('one', [0]);
				await clickZeroPreset('two', [0, 1]);
				await action(demo, 'clear').click();
				expect(await takeCalls()).toBe(0);
				await expectSnapshot(demo, locale);
			} finally {
				await page.evaluate(() => {
					const scope = window as Window & {
						__takeHammingRandomCalls?: () => number;
						__restoreHammingRandom?: () => void;
					};
					scope.__restoreHammingRandom!();
					delete scope.__takeHammingRandomCalls;
					delete scope.__restoreHammingRandom;
				});
			}
		});

		for (const scenario of [
			{ name: 'single', mask: [3], correction: 3 },
			{ name: 'double', mask: [2, 3], correction: 'reject' },
			{ name: 'triple', mask: [0, 1, 2], correction: 4 },
			{ name: 'four-bit', mask: [3, 5, 6, 7], correction: null },
		] as const) {
			test(`d3 changes preserve the ${scenario.name} mask and syndrome, refresh output, and clear keeps the chosen input`, async ({ page }) => {
				const demo = await openDemo(page, locale);
				for (const index of scenario.mask) await demo.locator(`[data-memory="${index}"]`).click();
				await expectSnapshot(demo, locale, scenario.mask, scenario.correction);
				for (const [data, codeword] of [
					['1010', '10100110'],
					[DEFAULT_DATA, DEFAULT_CODEWORD_FROM_ARTICLE],
					['1010', '10100110'],
				]) {
					const d3 = demo.locator('[data-input="3"]');
					await d3.click();
					await expect(d3).toHaveAccessibleName(locale.inputName('d3', Number(data[3])));
					await expectSnapshot(demo, locale, scenario.mask, scenario.correction, data, codeword);
				}
				await action(demo, 'clear').click();
				await expectSnapshot(demo, locale, [], null, '1010', '10100110');
			});
		}

		test('Space and Enter immediately update d0/d3, toggle the persistent memory mask, and clear errors', async ({ page }) => {
			const demo = await openDemo(page, locale);
			const d0 = demo.locator('[data-input="0"]');
			await d0.focus();
			await d0.press('Space');
			await expect(d0).toBeFocused();
			await expect(d0).toHaveAttribute('aria-pressed', 'false');
			await expect(d0).toHaveAccessibleName(locale.inputName('d0', 0));
			await expectSnapshot(demo, locale, [], null, '0011', '00111010');
			await d0.press('Enter');
			await expect(d0).toHaveAttribute('aria-pressed', 'true');
			await expect(d0).toHaveAccessibleName(locale.inputName('d0', 1));
			await expectSnapshot(demo, locale);

			const q = demo.locator('[data-memory="7"]');
			await q.focus();
			await q.press('Space');
			await expect(q).toBeFocused();
			await expectSnapshot(demo, locale, [7], 7);
			await q.press('Enter');
			await expectSnapshot(demo, locale);
			await q.press('Space');
			await expectSnapshot(demo, locale, [7], 7);

			const d3 = demo.locator('[data-input="3"]');
			await d3.press('Space');
			await expect(d3).toHaveAttribute('aria-pressed', 'false');
			await expect(d3).toHaveAccessibleName(locale.inputName('d3', 0));
			await expectSnapshot(demo, locale, [7], 7, '1010', '10100110');
			await d3.press('Enter');
			await expect(d3).toHaveAccessibleName(locale.inputName('d3', 1));
			await expectSnapshot(demo, locale, [7], 7);
			await action(demo, 'clear').focus();
			await action(demo, 'clear').press('Enter');
			await expect(action(demo, 'clear')).toBeFocused();
			await expectSnapshot(demo, locale);
			await q.press('Space');
			await action(demo, 'clear').press('Space');
			await expectSnapshot(demo, locale);
		});

		test('three errors at 0, 1, 2 automatically miscorrect to 0101 via p0 without repairing memory', async ({ page }) => {
			const demo = await openDemo(page, locale);
			for (const index of [0, 1, 2]) await demo.locator(`[data-memory="${index}"]`).click();
			await expectSnapshot(demo, locale, [0, 1, 2], 4);
			await expectChecks(demo, '1 0 0', 1, '[1, 0, 0, 0]');
			await expectOutput(demo, '01011001', '0101', locale.mismatch, 4, true);
			await expectMemory(demo, '01010001', [0, 1, 2]);
			await action(demo, 'clear').click();
			await expectSnapshot(demo, locale);
		});

		test('four errors at 3, 5, 6, 7 automatically report clean despite an undetected mismatch', async ({ page }) => {
			const demo = await openDemo(page, locale);
			for (const index of [3, 5, 6, 7]) await demo.locator(`[data-memory="${index}"]`).click();
			await expectSnapshot(demo, locale, [3, 5, 6, 7]);
			await expectChecks(demo, '0 0 0', 0, '[0, 0, 0, 0]');
			await expectOutput(demo, '10100110', '1010', locale.mismatch, null, true);
			await expectMemory(demo, '10100110', [3, 5, 6, 7]);
		});

		test('sits immediately after SECDED and before general Hamming codes, with reciprocal language navigation', async ({ page }) => {
			const demo = await openDemo(page, locale);
			await expectPlacement(demo, locale);
			const other = locales.find((candidate) => candidate.lang !== locale.lang)!;
			const navigation = page.getByRole('navigation', { name: locale.languageNav, exact: true });
			const current = navigation.getByRole('link', { name: locale.languageName, exact: true });
			await expect(current).toHaveAttribute('href', locale.path);
			await expect(current).toHaveAttribute('aria-current', 'page');
			const alternate = navigation.getByRole('link', { name: other.languageName, exact: true });
			await expect(alternate).toHaveAttribute('href', other.path);
			await expect(alternate).toHaveAttribute('hreflang', other.lang);
			await alternate.click();
			await expect(page).toHaveURL(other.path);
			await expect(page.locator('html')).toHaveAttribute('lang', other.lang);
			await expect(demo).toHaveAccessibleName(other.heading);
			await expect(action(demo, 'clear')).toBeEnabled();
			await expectAscendingOrder(demo, other);
			await expectPlacement(demo, other);
			const back = page.getByRole('navigation', { name: other.languageNav, exact: true })
				.getByRole('link', { name: locale.languageName, exact: true });
			await expect(back).toHaveAttribute('href', locale.path);
			await expect(back).toHaveAttribute('hreflang', locale.lang);
			await back.click();
			await expect(page).toHaveURL(locale.path);
			await expect(demo).toHaveAccessibleName(locale.heading);
			await expect(action(demo, 'clear')).toBeEnabled();
			await expectAscendingOrder(demo, locale);
		});

		for (const width of [375, 320]) {
			test(`${width}px keeps horizontal scrolling inside memory and every button at least 44px`, async ({ page }) => {
				await page.setViewportSize({ width, height: 812 });
				const demo = await openDemo(page, locale);
				await page.evaluate(() => document.fonts.ready.then(() => undefined));
				await expectContained(page, demo);
				await expect(demo.locator('.scroll-hint')).toBeVisible();
				await expect(demo.locator('.scroll-hint')).toHaveText(locale.scrollHint);
				const sizes = await demo.locator('button').evaluateAll((buttons) => buttons.map((button) => {
					const rect = button.getBoundingClientRect();
					return { name: button.getAttribute('aria-label') ?? button.textContent, width: rect.width, height: rect.height };
				}));
				expect(sizes).toHaveLength(15);
				for (const size of sizes) {
					expect(size.width, `${size.name}: width`).toBeGreaterThanOrEqual(44);
					expect(size.height, `${size.name}: height`).toBeGreaterThanOrEqual(44);
				}
				const scroll = demo.locator('.memory-scroll');
				await expect(scroll).toHaveCSS('overflow-x', /auto|scroll/);
				const scrollSize = await scroll.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
				expect(scrollSize.scroll).toBeGreaterThan(scrollSize.client);
				await scroll.focus();
				await expect(scroll).toBeFocused();
				await scroll.press('ArrowRight');
				await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
				await demo.locator('[data-memory="7"]').click();
				await expectSnapshot(demo, locale, [7], 7);
				await expectContained(page, demo);
				await action(demo, 'clear').click();
				await expectSnapshot(demo, locale);
				await expectContained(page, demo);
			});
		}

		for (const theme of ['light', 'dark'] as const) {
			for (const width of theme === 'light' ? [320, 375, 768, 1280] : [320, 1280]) {
				for (const detailsOpen of [false, true]) {
					test(`${width}px ${theme}, details ${detailsOpen ? 'open' : 'closed'}: stable geometry across error counts, data changes, and shortcuts`, async ({ page }) => {
						test.setTimeout(60_000);
						await page.setViewportSize({ width, height: 900 });
						await page.emulateMedia({ colorScheme: theme });
						const demo = await openDemo(page, locale);
						await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
						await page.evaluate(() => document.fonts.ready.then(() => undefined));
						await expectSizingContract(demo, locale);
						await expectExplanations(demo, locale);
						const closedHeight = (await demo.boundingBox())!.height;
						if (detailsOpen) await demo.locator('.math-help summary').click();
						await expect(demo.locator('.math-help')).toHaveJSProperty('open', detailsOpen);
						const baseline = await measureGeometry(demo);
						if (detailsOpen) expect(baseline.metrics['panel.height']).toBeGreaterThan(closedHeight);
						let mask: number[] = [];
						let data = DEFAULT_DATA;
						let lastFocus: string | null = null;
						const checkState = async (name: string, measured?: Awaited<ReturnType<typeof measureGeometry>>) => {
							const geometry = measured ?? await measureGeometry(demo);
							expect(geometry.problems, name).toEqual([]);
							expect(Object.keys(geometry.metrics), `${name}: geometry landmarks`).toEqual(Object.keys(baseline.metrics));
							const deltas = Object.entries(baseline.metrics).map(([key, value]) => ({
								key,
								delta: Math.abs(geometry.metrics[key] - value),
							})).sort((left, right) => right.delta - left.delta);
							expect(deltas[0].delta, `${name}: largest changes ${JSON.stringify(deltas.slice(0, 5))}`).toBeLessThanOrEqual(1);
							expect(geometry.detailsOpen, `${name}: details preserved`).toBe(detailsOpen);
							if (lastFocus !== null) expect(geometry.focus, `${name}: native focus preserved`).toBe(lastFocus);
							const full = Array.from({ length: 4 }, (_, row) => mask.reduce(
								(bit, index) => bit ^ Number(H_COLUMNS_FROM_ARTICLE[index][row]), 0,
							)).join('');
							const rejected = mask.length % 2 === 0 && full !== '0000';
							const correction = mask.length % 2 === 1 ? H_COLUMNS_FROM_ARTICLE.indexOf(full) : null;
							if (correction !== null) expect(correction).toBeGreaterThanOrEqual(0);
							const received = xorWord(data === DEFAULT_DATA ? DEFAULT_CODEWORD_FROM_ARTICLE : '10100110', mask);
							const output = correction === null ? received : xorWord(received, [correction]);
							const mismatch = !rejected && output.slice(0, 4) !== data;
							expect(geometry.state, `${name}: live state`).toEqual({
								input: data,
								mask: BIT_LABELS.map((_, index) => mask.includes(index)),
								count: locale.count(mask.length),
								outside: String(mask.length >= 3),
								verdict: rejected ? locale.uncorrectable : correction === null ? locale.clean : locale.corrected(BIT_LABELS[correction]),
								status: rejected ? 'uncorrectable' : correction === null ? 'clean' : 'corrected',
								data: rejected ? locale.noOutput : output.slice(0, 4).split('').join(' '),
								actual: rejected ? locale.rejected : mismatch ? locale.mismatch : locale.match,
								mismatch: String(mismatch),
							});
							if (width <= 375 && mask.length >= 3) {
								expect(geometry.lines['data-count'], `${name}: count wraps instead of truncating`).toBeGreaterThan(1);
							}
							if (width <= 375 && mismatch) {
								expect(geometry.lines['data-actual'], `${name}: comparison wraps instead of truncating`).toBeGreaterThan(1);
							}
						};
						const clickControl = async (attribute: 'data-memory' | 'data-input' | 'data-action', value: string) => {
							const control = demo.locator(`[${attribute}="${value}"]`);
							await control.click();
							await expect(control).toBeFocused();
							lastFocus = `${attribute}:${value}`;
						};
						const setMask = async (next: readonly number[]) => {
							for (let index = 0; index < 8; index++) {
								if (mask.includes(index) !== next.includes(index)) await clickControl('data-memory', String(index));
							}
							mask = [...next];
						};
						const clear = async (name: string) => {
							await clickControl('data-action', 'clear');
							mask = [];
							await checkState(name);
						};
						await checkState('initial', baseline);
						for (let index = 0; index < 8; index++) {
							await setMask([index]);
							await checkState(`single ${BIT_LABELS[index]}`);
						}
						await setMask([4, 7]);
						await checkState('double parity/q rejection');
						for (const scenario of [
							{ name: 'triple miscorrection', mask: [0, 1, 2] },
							{ name: 'four-bit undetected error', mask: [3, 5, 6, 7] },
						]) {
							await setMask(scenario.mask);
							await checkState(scenario.name);
							for (const nextData of ['1010', DEFAULT_DATA]) {
								await clickControl('data-input', '3');
								data = nextData;
								await checkState(`${scenario.name}, raw data ${data}, mask retained`);
							}
						}
						await clear('clear before all counts');
						for (let count = 1; count <= 8; count++) {
							await setMask(Array.from({ length: count }, (_, index) => index));
							await checkState(`count ${count}`);
						}
						await clickControl('data-input', '3');
						data = '1010';
						await checkState('all eight errors, changed raw data');
						await clear('clear retains changed raw data');
						for (const preset of [
							{ name: 'one', indices: [2] },
							{ name: 'one', indices: [7] },
							{ name: 'two', indices: [4, 7] },
							{ name: 'two', indices: [5, 7] },
						] as const) {
							await clickRandomPreset(demo, preset.name, preset.indices);
							lastFocus = `data-action:${preset.name}`;
							mask = [...preset.indices];
							await checkState(`random ${preset.name}: ${preset.indices.join(', ')}`);
						}
						await clear('final clear');
						await expectSizingContract(demo, locale);
						await expectRemovedMessages(demo);
					});
				}
			}
		}

		test('component colors follow light and dark themes without changing the mask or decoded bits', async ({ page }) => {
			await page.emulateMedia({ colorScheme: 'light' });
			const demo = await openDemo(page, locale);
			await demo.locator('[data-memory="3"]').click();
			await expectSnapshot(demo, locale, [3], 3);
			await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
			const light = await appearance(demo);
			expect(light.foreground).not.toBe(light.background);
			expect(light.controlForeground).not.toBe(light.controlBackground);

			await page.emulateMedia({ colorScheme: 'dark' });
			await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
			await expect.poll(() => appearance(demo)).not.toEqual(light);
			const dark = await appearance(demo);
			for (const key of Object.keys(light) as (keyof typeof light)[]) {
				expect(dark[key], `${key} should follow the dark palette`).not.toBe(light[key]);
			}
			expect(dark.foreground).not.toBe(dark.background);
			expect(dark.controlForeground).not.toBe(dark.controlBackground);
			await expectOutput(demo, DEFAULT_CODEWORD_FROM_ARTICLE, DEFAULT_DATA, locale.match, 3);
			await expectMemory(demo, '10100001', [3]);
			await page.locator('#theme-toggle').click();
			await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
			await expect.poll(() => appearance(demo)).toEqual(light);
			await expectOutput(demo, DEFAULT_CODEWORD_FROM_ARTICLE, DEFAULT_DATA, locale.match, 3);
			await expectMemory(demo, '10100001', [3]);
		});

		test.describe('without JavaScript', () => {
			test.use({ javaScriptEnabled: false });

			test('renders the correct static example, localized notice, 15 disabled controls, and readable G/H formulas', async ({ page }) => {
				await page.goto(locale.path);
				const demo = page.locator('hamming-demo#hamming84-demo');
				await expect(demo).toHaveAttribute('lang', locale.lang);
				await expect(demo).toHaveAccessibleName(locale.heading);
				await expect(demo.locator('noscript p')).toBeVisible();
				await expect(demo.locator('noscript p')).toHaveText(locale.noscript);
				await expect(demo.locator('button')).toHaveCount(15);
				for (const button of await demo.locator('button').all()) await expect(button).toBeDisabled();
				await expectSnapshot(demo, locale);
				await expectAscendingOrder(demo, locale);
				await expectExplanations(demo, locale);
				await expectSizingContract(demo, locale);
				await expect(demo.locator('[data-action="store"], [data-action="decode"], [data-draft]')).toHaveCount(0);
				await demo.locator('.math-help summary').click();
				await expect(demo.locator('[data-full-syndrome]')).toBeVisible();
				await expect(page.getByRole('heading', { name: locale.title, level: 1, exact: true })).toBeVisible();
				await expectPlacement(demo, locale);
				await expect(page.locator('.prose > p').first()).toContainText('ECC');
				await expect(page.locator('.prose > p').first()).toBeVisible();
				for (const matrix of [
					{ symbol: 'G', row: '1&0&0&0&1&0&1&1' },
					{ symbol: 'H', row: '1&1&1&0&1&0&0&0' },
				]) {
					const formula = page.locator('.prose .katex-display').filter({
						has: page.locator('annotation').filter({ hasText: `\\bm{${matrix.symbol}} = \\begin{bmatrix}` }),
					}).last();
					await expect(formula.locator('.katex-html')).toBeVisible();
					await expect(formula.locator('annotation')).toContainText(matrix.row);
				}
			});
		});
	});
}
