import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import markdown from 'highlight.js/lib/languages/markdown';

// Core build + a lean set of languages the demos actually use, so we don't
// pull in highlight.js's full ~200-language registry.
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml); // also covers HTML
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('markdown', markdown);

// Colorize any code blocks under `root` that haven't been highlighted yet.
// highlightElement stamps data-highlighted, so re-renders skip finished blocks.
export function highlightWithin(root: HTMLElement): void {
	root.querySelectorAll<HTMLElement>('pre code').forEach((el) => {
		if (!el.dataset.highlighted) hljs.highlightElement(el);
	});
}
