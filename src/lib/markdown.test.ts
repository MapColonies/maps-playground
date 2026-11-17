import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('renders inline markdown to HTML', () => {
		const html = renderMarkdown('a **bold** and `code` word');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<code>code</code>');
	});

	it('renders fenced code blocks as pre/code with a language class', () => {
		const html = renderMarkdown('```js\nconst zoom = 4;\n```');
		expect(html).toContain('<pre>');
		expect(html).toMatch(/<code[^>]*class="[^"]*language-js/);
		expect(html).toContain('const zoom = 4;');
	});

	it('strips dangerous markup from model output', () => {
		const html = renderMarkdown('hi <img src=x onerror=alert(1)> <script>alert(2)</script>');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<script>');
	});

	it('opens links in a new tab with noopener', () => {
		const html = renderMarkdown('[docs](https://example.com)');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});
});
