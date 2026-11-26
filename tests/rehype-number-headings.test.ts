import assert from 'node:assert/strict';
import test from 'node:test';
import type { Element, ElementContent, Root } from 'hast';
import rehypeNumberHeadings from '../src/lib/rehype-number-headings.ts';

const heading = (depth: number, value: string): Element => ({
	type: 'element',
	tagName: `h${depth}`,
	properties: {},
	children: [{ type: 'text', value }],
});

function textOf(node: ElementContent): string {
	if (node.type === 'text') {
		return node.value;
	}
	return node.type === 'element' ? node.children.map(textOf).join('') : '';
}

function numbered(...children: ElementContent[]): string[] {
	const tree: Root = { type: 'root', children };
	rehypeNumberHeadings()(tree);
	return tree.children.filter((node): node is Element => node.type === 'element').map((node) => textOf(node));
}

test('h2, h3 and h4 become 1, 1.2 and 1.2.3 without a trailing dot', () => {
	assert.deepEqual(
		numbered(heading(2, 'Encoder'), heading(3, 'Tables'), heading(4, '5b/6b'), heading(3, 'State machine'), heading(2, 'Decoder')),
		['1 Encoder', '1.1 Tables', '1.1.1 5b/6b', '1.2 State machine', '2 Decoder'],
	);
});

test('deeper counters reset when a shallower heading starts', () => {
	assert.deepEqual(
		numbered(heading(2, 'A'), heading(4, 'deep'), heading(2, 'B'), heading(3, 'b'), heading(3, 'c')),
		['1 A', '1.0.1 deep', '2 B', '2.1 b', '2.2 c'],
	);
});

test('an h1 in the body is left alone and does not count', () => {
	assert.deepEqual(numbered(heading(1, 'Title'), heading(2, 'A'), heading(2, 'B')), ['Title', '1 A', '2 B']);
});

test('the number sits in its own span ahead of the existing heading content', () => {
	const section: Element = {
		type: 'element',
		tagName: 'h3',
		properties: {},
		children: [{ type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'text', value: 'GF(2)' }] }],
	};
	const tree: Root = { type: 'root', children: [heading(2, 'A'), section] };
	rehypeNumberHeadings()(tree);
	assert.deepEqual(section.children[0], {
		type: 'element',
		tagName: 'span',
		properties: { className: ['heading-number'] },
		children: [{ type: 'text', value: '1.1 ' }],
	});
	assert.equal(textOf(section.children[1]), 'GF(2)');
});
