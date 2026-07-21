// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { register } from './metrics';

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
