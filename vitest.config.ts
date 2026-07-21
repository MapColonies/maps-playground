/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';
import path from 'node:path';

export default defineConfig({
	plugins: [svelte({ preprocess: preprocess(), hot: false })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			// SvelteKit virtual modules have no resolver under the plain `svelte`
			// vitest plugin (no `sveltekit()`), so Vite fails to transform any
			// component importing them. Alias them to inert stubs; per-test
			// `vi.doMock` overrides these at runtime with the real behaviour.
			'$app/stores': path.resolve('./src/test/virtual/app-stores.ts'),
			'$env/dynamic/public': path.resolve('./src/test/virtual/env-dynamic-public.ts')
		},
		// Resolve Svelte's browser build under jsdom. In @testing-library/svelte v5
		// this is handled by the svelteTesting() vite plugin, which does not exist
		// in v4 (required here for Svelte 3), so we set the condition explicitly.
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		globals: true,
		// './vitest-setup.ts' adds jest-dom matchers + per-test cleanup of storage/mocks.
		// '@testing-library/svelte/vitest' is the v4 auto-cleanup (act + cleanup) that the
		// v5 svelteTesting() plugin would otherwise register.
		setupFiles: ['@testing-library/svelte/vitest', './vitest-setup.ts']
	}
});
