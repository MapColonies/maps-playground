// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/demoManager.js', () => ({
	getDemoIndex: async () => ({
		openlayers: { basic: { files: [], links: [], displayName: 'Basic', description: '' } }
	}),
	getFile: async () => ''
}));

import { load } from './+page.server';
import { demoViewsTotal } from '$lib/server/metrics';

async function viewCount(client: string, name: string): Promise<number> {
	const metric = (await (await import('$lib/server/metrics')).register.getMetricsAsJSON()).find(
		(m) => m.name === 'demo_views_total'
	);
	const match = (metric?.values ?? []).find(
		(v) => v.labels.client === client && v.labels.name === name
	);
	return match?.value ?? 0;
}

describe('demo view counter', () => {
	it('increments demo_views_total labeled by client and name', async () => {
		const before = await viewCount('openlayers', 'basic');
		await load({ params: { client: 'openlayers', name: 'basic' } } as any);
		expect(await viewCount('openlayers', 'basic')).toBe(before + 1);
		expect(demoViewsTotal).toBeDefined();
	});
});
