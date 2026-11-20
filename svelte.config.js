import preprocess from 'svelte-preprocess';
import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

const isGhPages = process.env.BUILD_TARGET === 'gh-pages';
const basePath = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		preprocess({
			postcss: true
		})
	],

	kit: {
		adapter: isGhPages
			? adapterStatic({
					pages: 'build',
					assets: 'build',
					fallback: '404.html',
					precompress: false,
					strict: false
			  })
			: adapterNode(),
		paths: {
			base: basePath
		}
	}
};

export default config;
