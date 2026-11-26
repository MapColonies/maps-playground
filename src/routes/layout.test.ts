import { afterEach, describe, expect, it, vi } from 'vitest';

describe('root layout prerender', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('prerenders for the gh-pages build', async () => {
		vi.stubEnv('BUILD_TARGET', 'gh-pages');
		const { prerender } = await import('./+layout');
		expect(prerender).toBe(true);
	});

	it('renders per request for the Node build', async () => {
		vi.stubEnv('BUILD_TARGET', '');
		const { prerender } = await import('./+layout');
		expect(prerender).toBe(false);
	});
});
