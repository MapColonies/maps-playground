// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { register } from './metrics';

// The shared vitest-setup.ts afterEach hook calls `localStorage.clear()`, which assumes
// the jsdom environment. This file overrides to the `node` environment (prom-client is
// Node-only), so provide a minimal no-op shim to keep the shared teardown from throwing.
if (typeof globalThis.localStorage === 'undefined') {
	(globalThis as unknown as { localStorage: Pick<Storage, 'clear'> }).localStorage = {
		clear: () => void 0
	};
}

describe('metrics registry', () => {
	it('registers the three custom metrics', async () => {
		const names = (await register.getMetricsAsJSON()).map((m) => m.name);
		expect(names).toContain('http_requests_total');
		expect(names).toContain('http_request_duration_seconds');
		expect(names).toContain('demo_views_total');
	});

	it('collects default process metrics', async () => {
		const names = (await register.getMetricsAsJSON()).map((m) => m.name);
		expect(names).toContain('process_cpu_user_seconds_total');
	});
});
