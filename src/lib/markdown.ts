import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

let hookRegistered = false;

// Open model-supplied links in a new tab and strip the opener reference.
function registerHooks() {
	if (hookRegistered) return;
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A' && node.getAttribute('href')) {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});
	hookRegistered = true;
}

// Render untrusted model output to sanitized HTML. Code blocks are left for
// highlight.js to colorize on the live DOM after insertion. On the server
// (no window) DOMPurify can't run, so fall back to escaped plain text.
export function renderMarkdown(src: string): string {
	const text = src ?? '';
	if (typeof window === 'undefined') {
		return escapeHtml(text);
	}
	registerHooks();
	const html = marked.parse(text, { async: false }) as string;
	return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
