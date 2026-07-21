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
			'$app/stores': path.resolve('./src/test/virtual/app-stores.ts'),
			'$env/dynamic/public': path.resolve('./src/test/virtual/env-dynamic-public.ts')
		},
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['@testing-library/svelte/vitest', './vitest-setup.ts']
	}
});
