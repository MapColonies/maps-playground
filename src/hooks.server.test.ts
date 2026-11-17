// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { handle } from './hooks.server';
import { register } from '$lib/server/metrics';

function makeEvent(pathname: string, method = 'GET', routeId: string | null = '/') {
	return {
		url: new URL(`http://localhost${pathname}`),
		request: new Request(`http://localhost${pathname}`, { method }),
		route: { id: routeId }
	} as any;
}

async function requestCount(): Promise<number> {
	const metric = (await register.getMetricsAsJSON()).find((m) => m.name === 'http_requests_total');
	return (metric?.values ?? []).reduce((sum, v) => sum + v.value, 0);
}

describe('handle hook', () => {
	it('serves /metrics as prometheus text and does not count it', async () => {
		const before = await requestCount();
		const res = await handle({
			event: makeEvent('/metrics'),
			resolve: async () => new Response('should-not-be-used')
		} as any);
		expect(res.headers.get('content-type')).toContain('text/plain');
		expect(await res.text()).toContain('http_requests_total');
		expect(await requestCount()).toBe(before);
	});

	it('counts a normal request labeled by route id', async () => {
		const before = await requestCount();
		const res = await handle({
			event: makeEvent('/demo/openlayers/basic', 'GET', '/demo/[client]/[name]'),
			resolve: async () => new Response('ok', { status: 200 })
		} as any);
		expect(res.status).toBe(200);
		expect(await requestCount()).toBe(before + 1);
	});
});
