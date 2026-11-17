import { describe, it, expect } from 'vitest';
import Ajv from 'ajv/dist/jtd';
import { demoSchema } from './demoIndex';
import type { DemoIndex } from '$lib/types';

const ajv = new Ajv();
const validate = ajv.compile(demoSchema);

const valid: DemoIndex = {
	acme: {
		'first-demo': {
			displayName: 'First',
			description: 'A demo',
			image: 'thumb.png',
			files: ['index.js'],
			links: [{ name: 'cesium', url: '/libs/cesium.js', type: 'js' }]
		}
	}
};

describe('demoSchema (JTD)', () => {
	it('accepts a well-formed index', () => {
		expect(validate(valid)).toBe(true);
	});

	it('accepts a demo with all optional metadata omitted', () => {
		const minimal: DemoIndex = {
			acme: { d: { files: ['a.js'], links: [] } }
		};
		expect(validate(minimal)).toBe(true);
	});

	it('rejects an invalid link type', () => {
		const bad = {
			acme: { d: { files: ['a.js'], links: [{ name: 'x', url: '/x', type: 'html' }] } }
		};
		expect(validate(bad)).toBe(false);
	});

	it('rejects a demo missing the required files property', () => {
		const bad = { acme: { d: { links: [] } } };
		expect(validate(bad)).toBe(false);
	});
});
