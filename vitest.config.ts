/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';
import path from 'node:path';

export default defineConfig({
	plugins: [svelte({ preprocess: preprocess(), hot: false })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
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
