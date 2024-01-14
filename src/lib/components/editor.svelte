<script lang="ts">
	import { onMount } from 'svelte';
	import Monaco from './monaco.svelte';
	import type { File } from '$lib/types';
	import { TabItem, Tabs } from 'flowbite-svelte';
	import { getContext } from 'svelte';
	import Markdown from './markdown.svelte';
	import type { Writable } from 'svelte/store';

	let selected = 0;
	const filesContext = getContext<Writable<File[]>>('files');

	function getLanguage(fileName: string): string | undefined {
		const fileExt = fileName.split('.').at(-1);
		switch (fileExt) {
			case 'js':
				return 'javascript';
			case 'css':
				return 'css';
			case 'html':
				return 'html';
			default:
				return undefined;
		}
	}

	function onEditorChange(index: number) {
		return (e: CustomEvent<string>) => {
			const tempFiles = [...$filesContext]
			tempFiles.splice(index, 1, { content: e.detail, name: $filesContext[index].name })
			filesContext.set(
				tempFiles
			);
		};
	}
</script>

<div class="flex flex-col h-full">
	<div class="flex-none">
		<Tabs contentClass="hidden">
			{#each $filesContext as file, i}
				<TabItem open={i === selected} title={file.name} on:click={() => (selected = i)} />
			{/each}
		</Tabs>
	</div>
	<div class="flex-grow min-h-0">
		{#if $filesContext[selected].name.endsWith('md')}
			<Markdown content={$filesContext[selected].content} />
		{:else}
			<Monaco
				content={$filesContext[selected].content}
				language={getLanguage($filesContext[selected].name)}
				on:change={onEditorChange(selected)}
			/>
		{/if}
	</div>
</div>
