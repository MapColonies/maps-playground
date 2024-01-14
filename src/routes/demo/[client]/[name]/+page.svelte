<script lang="ts">
	import Editor from '$lib/components/editor.svelte';
	import Sandpack from '$lib/components/sandpack.svelte';
	import type { File } from '$lib/types.js';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	export let data;

	const files = writable<File[]>([]);

	$: files.set(data.files);

	setContext('files', files);

	let value = '';
</script>

<div class="flex flex-row h-full dark:bg-gray-900">
	<div class="flex-1">
		<Editor />
		<!-- <CodeMirror bind:value lang={javascript()} theme={oneDark}/> -->
	</div>
	<div class="flex-1">
		<Sandpack
			packageJson={JSON.stringify({
				main: 'ol.js',
				dependencies: { ol: 'latest' }
			})}
		/>
	</div>
</div>
