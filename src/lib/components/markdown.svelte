<script lang="ts">
	import { onMount } from 'svelte';
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import remarkFrontmatter from 'remark-frontmatter';
	import remarkGfm from 'remark-gfm';
	import remarkRehype from 'remark-rehype';
	import rehypeStringify from 'rehype-stringify';
	import rehypeMermaid from 'rehype-mermaidjs'
	import rehypePrism from '@mapbox/rehype-prism';

	export let content: string;

	let divEl: HTMLDivElement;
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeMermaid)
		.use(rehypePrism)
		.use(rehypeStringify);

	onMount(async () => {
		divEl.innerHTML = String(await processor.process(content));
	});
</script>

<div bind:this={divEl} class="unreset p-2 h-full overflow-y-scroll dark:bg-gray-900 dark:text-white" />

<style global>
	@import '../../../node_modules/prismjs/themes/prism-tomorrow.css';
</style>
