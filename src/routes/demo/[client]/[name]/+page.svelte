<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import Flems from '$lib/components/flems.svelte';
	import AgentChat from '$lib/components/agentChat.svelte';
	import type { File } from '$lib/types';
	import {
		cacheKey,
		loadCache,
		saveCache,
		clearCache,
		chatKey,
		loadChat,
		saveChat
	} from '$lib/cache/demoCache';
	import type { ChatMessage } from '$lib/types';
	import { markUnread, markRead } from '$lib/stores/unreadChats';

	export let data;

	const parsedDebounce = Number.parseInt(env.PUBLIC_CACHE_DEBOUNCE_MS ?? '', 10);
	const debounceMs = Number.isNaN(parsedDebounce) || parsedDebounce < 0 ? 500 : parsedDebounce;

	let files: File[] = data.files;
	let chat: ChatMessage[] = [];
	let fromCache = false;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let mounted = false;
	let loadedKey = '';

	// Reactive keys so navigation reloads the right demo instead of stale files/chat.
	$: key = cacheKey($page.params.client, $page.params.name);
	$: chatK = chatKey($page.params.client, $page.params.name);

	function loadForKey(k: string) {
		if (saveTimer) clearTimeout(saveTimer);
		const cached = loadCache(k);
		files = cached ?? data.files;
		fromCache = cached !== null;
		// Chat history is per-example; restore this example's thread (or start empty).
		const ck = chatKey($page.params.client, $page.params.name);
		chat = loadChat(ck) ?? [];
		// Viewing an example clears its unread agent-response flag.
		markRead(ck);
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
		// Flems echoes an onChange with the initial files on mount; ignore changes that
		// match the current baseline so merely opening an example never caches or banners.
		if (JSON.stringify(edited) === JSON.stringify(files)) return;
		const savingKey = key;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveCache(savingKey, edited);
			// Show the cache banner only if still viewing the example we just saved.
			if (savingKey === key) fromCache = true;
		}, debounceMs);
	}

	// Agent edits persist to their origin example even after the user navigated away.
	function handleAgentFiles(next: File[], originKey: string) {
		if (saveTimer) clearTimeout(saveTimer);
		saveCache(originKey, next);
		if (originKey === key) {
			files = next;
			fromCache = true;
		}
	}

	// Persist chat immediately (discrete events, not keystrokes) to its origin
	// example; reflect only if still viewing it.
	function handleChatChange(next: ChatMessage[], originKey: string) {
		saveChat(originKey, next);
		if (originKey === chatK) {
			chat = next;
		} else if (next.at(-1)?.role === 'assistant') {
			// Reply for an example we navigated away from — flag its unread dot.
			markUnread(originKey);
		}
	}

	function handleClear() {
		if (!window.confirm('Discard your edits and reload the original example?')) return;
		if (saveTimer) clearTimeout(saveTimer);
		// Only the file edits are discarded; the agent chat thread is kept intact.
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
				<span aria-hidden="true">⟳</span> Example loaded from cache
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
		{#if data.agentEnabled}
			<aside
				class="w-96 shrink-0 flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800"
			>
				<AgentChat
					{files}
					chatCacheKey={chatK}
					fileCacheKey={key}
					onFilesChange={handleAgentFiles}
					messages={chat}
					onMessagesChange={handleChatChange}
					demoName={data.displayName || data.demoName}
					description={data.description}
				/>
			</aside>
		{/if}
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
