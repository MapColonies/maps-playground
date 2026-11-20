// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const getDemoIndex = vi.fn(async () => ({
	openlayers: { basic: { files: [], links: [] }, wms: { files: [], links: [] } },
	cesium: { terrain: { files: [], links: [] } }
}));

vi.mock('$lib/server/demoManager.js', () => ({ getDemoIndex, getFile: async () => '' }));

describe('demo page entries', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
		getDemoIndex.mockClear();
	});

	it('lists every demo for the gh-pages build', async () => {
		vi.stubEnv('BUILD_TARGET', 'gh-pages');
		const { entries } = await import('./+page.server');
		expect(await entries()).toEqual([
			{ client: 'openlayers', name: 'basic' },
			{ client: 'openlayers', name: 'wms' },
			{ client: 'cesium', name: 'terrain' }
		]);
	});

	it('returns nothing and never reads the demo index for the Node build', async () => {
		vi.stubEnv('BUILD_TARGET', '');
		const { entries } = await import('./+page.server');
		expect(await entries()).toEqual([]);
		expect(getDemoIndex).not.toHaveBeenCalled();
	});
});
