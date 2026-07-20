<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import Flems from '$lib/components/flems.svelte';
	import type { File } from '$lib/types';
	import { cacheKey, loadCache, saveCache, clearCache } from '$lib/cache/demoCache';

	export let data;

	const parsedDebounce = Number.parseInt(env.PUBLIC_CACHE_DEBOUNCE_MS ?? '', 10);
	const debounceMs = Number.isNaN(parsedDebounce) || parsedDebounce < 0 ? 500 : parsedDebounce;

	let files: File[] = data.files;
	let fromCache = false;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let mounted = false;
	let loadedKey = '';

	// SvelteKit reuses this component across same-route demo switches (bottomBar
	// navigates via goto), updating only `data`. Recompute the cache key reactively
	// so navigation reloads the right demo instead of keeping stale files.
	$: key = cacheKey($page.params.client, $page.params.name);

	function loadForKey(k: string) {
		if (saveTimer) clearTimeout(saveTimer);
		const cached = loadCache(k);
		files = cached ?? data.files;
		fromCache = cached !== null;
		loadedKey = k;
	}

	// Read from localStorage only after mount (client-only, post-hydration) so the
	// first client render matches SSR output and hydration stays clean.
	onMount(() => {
		mounted = true;
		loadForKey(key);
	});

	$: if (mounted && key !== loadedKey) loadForKey(key);

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});

	function handleChange(edited: File[]) {
		const savingKey = key;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveCache(savingKey, edited), debounceMs);
	}

	function handleClear() {
		if (!window.confirm('Discard your edits and reload the original example?')) return;
		if (saveTimer) clearTimeout(saveTimer);
		clearCache(key);
		files = data.files;
		fromCache = false;
	}
</script>

<div class="h-full flex flex-col">
	{#if fromCache}
		<div
			class="flex items-center justify-between gap-3 px-4 py-2 text-sm bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
		>
			<span class="flex items-center gap-2">
				<span aria-hidden="true">⟳</span> Loaded from cache
			</span>
			<button
				type="button"
				on:click={handleClear}
				class="rounded-md px-2.5 py-1 text-xs font-medium bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100"
			>
				Clear cache
			</button>
		</div>
	{/if}

	<div class="flex-1 min-h-0 flex flex-row gap-3 p-3 bg-gray-50 dark:bg-gray-900">
		<div
			class="flex-1 min-w-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800"
		>
			<Flems {files} links={data.links} onChange={handleChange} />
		</div>
		<aside
			class="w-80 shrink-0 flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800"
		>
			<header class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
					{data.displayName || data.demoName}
				</h2>
			</header>
			<div class="flex-1 overflow-y-auto px-4 py-3">
				{#if data.description}
					<p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
						{data.description}
					</p>
				{:else}
					<p class="text-sm italic text-gray-400 dark:text-gray-500">No description provided.</p>
				{/if}
			</div>
		</aside>
	</div>
</div>
