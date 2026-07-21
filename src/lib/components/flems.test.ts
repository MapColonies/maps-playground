import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Flems from './flems.svelte';
import type { File, Link } from '$lib/types';

interface FlemsCall {
	config: { files: File[]; links: Link[] };
}

function stubFlems() {
	const setCalls: FlemsCall['config'][] = [];
	let onchangeHandler: ((state: { files: File[] }) => void) | undefined;
	const initCalls: FlemsCall['config'][] = [];

	const factory = vi.fn((_el: unknown, config: FlemsCall['config']) => {
		initCalls.push(config);
		return {
			onchange: (fn: (state: { files: File[] }) => void) => {
				onchangeHandler = fn;
			},
			set: (config: FlemsCall['config']) => setCalls.push(config)
		};
	});

	// The component references a bare global `flems` (the `<div id="flems">`),
	// which browsers expose as a named window property but jsdom does not resolve
	// for a bare identifier. Provide it so onMount can call window.Flems(flems, ...).
	vi.stubGlobal('flems', document.createElement('div'));
	vi.stubGlobal('Flems', factory);
	return {
		factory,
		initCalls,
		setCalls,
		fire: (state: { files: File[] }) => onchangeHandler?.(state)
	};
}

const files: File[] = [{ name: 'index.js', content: 'x' }];
const links: Link[] = [{ name: 'cesium', url: '/libs/cesium.js', type: 'js' }];

describe('flems.svelte', () => {
	beforeEach(() => localStorage.clear());

	it('mounts window.Flems once with files and origin-prefixed links', () => {
		const flems = stubFlems();
		render(Flems, { props: { files, links } });

		expect(flems.factory).toHaveBeenCalledTimes(1);
		const config = flems.initCalls[0];
		expect(config.files).toEqual(files);
		expect(config.links[0].url).toBe(window.location.origin + '/libs/cesium.js');
	});

	it('maps onchange state to {name, content} only, stripping extra keys', () => {
		const flems = stubFlems();
		const onChange = vi.fn();
		render(Flems, { props: { files, links, onChange } });

		flems.fire({ files: [{ name: 'a.js', content: 'hi', mode: 'js' } as unknown as File] });

		expect(onChange).toHaveBeenCalledWith([{ name: 'a.js', content: 'hi' }]);
	});

	it('calls instance.set when the files prop changes', async () => {
		const flems = stubFlems();
		const { component } = render(Flems, { props: { files, links } });

		await component.$set({ files: [{ name: 'b.js', content: 'y' }] });

		expect(flems.setCalls.length).toBeGreaterThanOrEqual(1);
		expect(flems.setCalls.at(-1)?.files).toEqual([{ name: 'b.js', content: 'y' }]);
	});

	it('does not throw on mount when no onChange prop is supplied', () => {
		stubFlems();
		expect(() => render(Flems, { props: { files, links } })).not.toThrow();
	});
});
