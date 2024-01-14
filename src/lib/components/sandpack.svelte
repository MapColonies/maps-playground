<script lang="ts">
	import {
		loadSandpackClient,
		type ClientOptions,
		type SandboxSetup,
		type SandpackBundlerFiles,
		type SandpackClient
	} from '@codesandbox/sandpack-client';
	import { getContext, onMount } from 'svelte';
	import type { File } from '$lib/types.js';
	import type { Writable } from 'svelte/store';

	export let packageJson: string;
	const filesContext = getContext<Writable<File[]>>('files');

	let client: SandpackClient;

	function createSandpackFiles(files: File[]): SandpackBundlerFiles {
		const sandpackFiles: SandpackBundlerFiles = {};

		for (const file of files) {
			const ext = file.name.split('.').at(-1);
			let fileName = '/' + file.name;
			if (ext === 'html') {
				fileName = '/index.html';
			} else if (ext === 'md') {
				continue;
			}
			sandpackFiles[fileName] = { code: file.content };
		}

		return sandpackFiles;
	}

	$: if (client !== undefined) {
		client.updateSandbox({
			files: {
				// We infer dependencies and the entry point from package.json
				// '/package.json': {
				// 	code: JSON.stringify({ main: 'openlayers_basic.js', dependencies: { ol: 'latest', leaflet: 'latest', cesium:'1.104.0' } })
				// },
				// Main file
				...createSandpackFiles($filesContext)
			},
			template: 'static',
			entry: 'index.html'
		});
	}

	onMount(async () => {
		const content: SandboxSetup = {
			files: {
				'/package.json': {
					code: JSON.stringify({ main: 'index.js', dependencies: {} })
				}
			},
		};

		const options: ClientOptions = { showOpenInCodeSandbox: false };

		client = await loadSandpackClient('#sandpack', content, options);
	});
</script>

<iframe title="sandpack" id="sandpack" />
