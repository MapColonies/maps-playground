// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('grafana dashboard copies stay in sync', () => {
	it('repo-root and chart copies are byte-identical', () => {
		const root = readFileSync('grafana/maps-playground-dashboard.json', 'utf8');
		const chart = readFileSync('helm/grafana/maps-playground-dashboard.json', 'utf8');
		expect(chart).toBe(root);
	});
});
