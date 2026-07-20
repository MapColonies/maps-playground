<script lang="ts">
	import { onMount } from 'svelte';
	import type { File, Link } from '$lib/types';
	export let files: File[];
	export let links: Link[];
	export let onChange: ((files: File[]) => void) | undefined = undefined;

	const flemsBaseConfig = {
		shareButton: false,
		linkTabs: false,
		theme: 'material',
		selected: '.js',
		autoHeight: false
	};

	let flemsInstance: any;

	function wireOnChange() {
		if (!flemsInstance || !onChange) return;
		flemsInstance.onchange = (state: { files: File[] }) =>
			onChange?.(state.files.map((f) => ({ name: f.name, content: f.content })));
	}

	$: if (flemsInstance) {
		flemsInstance.set({
			...flemsBaseConfig,
			files,
			links: links.map((link) => ({ ...link, url: window.location.origin + link.url }))
		});
	}

	onMount(async () => {
		// @ts-ignore
		flemsInstance = window.Flems(flems, {
			...flemsBaseConfig,
			files,
			links: links.map((link) => ({ ...link, url: window.location.origin + link.url }))
		});
		wireOnChange();
	});
</script>

<div id="flems" class="h-full" />
