<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import type { File, ChatMessage } from '$lib/types';
	import { renderMarkdown } from '$lib/markdown';
	import { highlightWithin } from '$lib/highlight';

	export let files: File[];
	// Async ops capture these at start, so a late response commits to the example
	// it was asked about even after the user navigates elsewhere.
	export let chatCacheKey = '';
	export let fileCacheKey = '';
	export let onFilesChange: (files: File[], originKey: string) => void = () => undefined;
	export let demoName: string | undefined = undefined;
	export let description: string | undefined = undefined;
	export let messages: ChatMessage[] = [];
	export let onMessagesChange: (messages: ChatMessage[], originKey: string) => void = () =>
		undefined;

	// Slash commands handled entirely client-side — they never reach the model.
	const COMMANDS = [
		{ name: '/clear', desc: 'Clear the conversation history' },
		{ name: '/compact', desc: 'Summarize the conversation to save context' }
	];

	// Persist to the origin example; reflect in the view only if it's still shown.
	function commitMessages(next: ChatMessage[], originKey: string) {
		if (originKey === chatCacheKey) messages = next;
		onMessagesChange(next, originKey);
	}

	// Two-flag stick-to-bottom scroll:
	//   autoFollow — released when the user scrolls up, re-armed at the bottom.
	//   forcePin — transient hard pin for first render and example switches, where
	//     layout-driven scroll events would otherwise flip autoFollow off.
	let scrollEl: HTMLDivElement;
	let autoFollow = true;
	let forcePin = true;
	let shownKey = chatCacheKey;
	$: if (chatCacheKey !== shownKey) {
		shownKey = chatCacheKey;
		forcePin = true;
		autoFollow = true;
	}
	function atBottom() {
		return scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 40;
	}
	function onThreadScroll() {
		// During forcePin, ignore layout scrolls — only user scrolling toggles autoFollow.
		if (scrollEl && !forcePin) autoFollow = atBottom();
	}
	afterUpdate(() => {
		if (scrollEl) highlightWithin(scrollEl);
		if (!scrollEl || !(forcePin || autoFollow)) return;
		scrollEl.scrollTop = scrollEl.scrollHeight;
		if (typeof requestAnimationFrame !== 'undefined') {
			requestAnimationFrame(() => {
				if (scrollEl && (forcePin || autoFollow)) scrollEl.scrollTop = scrollEl.scrollHeight;
				forcePin = false;
			});
		} else {
			forcePin = false;
		}
	});

	// Explicit actions (send/reply) jump to the tail even if the user scrolled up.
	function followBottom() {
		autoFollow = true;
		forcePin = true;
	}

	let input = '';
	// Per-example in-flight set: keeps the Thinking indicator and disabled Send on
	// the waiting chat, and lets examples run requests concurrently.
	let busyKeys = new Set<string>();
	$: currentBusy = busyKeys.has(chatCacheKey);
	function setBusy(key: string, on: boolean) {
		const next = new Set(busyKeys);
		if (on) next.add(key);
		else next.delete(key);
		busyKeys = next;
	}
	let error = '';
	let models: string[] = [];
	let selectedModel = '';
	let showInfo = false;
	let activeSuggestion = 0;
	let hideSuggestions = false;

	// Show command suggestions while the user is typing a "/word" with no space yet.
	$: suggestions =
		!hideSuggestions && /^\/\S*$/.test(input)
			? COMMANDS.filter((c) => c.name.startsWith(input.toLowerCase()))
			: [];
	$: if (activeSuggestion >= suggestions.length) activeSuggestion = 0;

	onMount(async () => {
		try {
			const res = await fetch('/api/agent/models');
			if (!res.ok) throw new Error(`status ${res.status}`);
			const data = await res.json();
			models = data.models ?? [];
			selectedModel = data.default ?? models[0] ?? '';
		} catch (e) {
			error = `Could not load models: ${(e as Error).message}`;
		}
	});

	function runCommand(name: string) {
		input = '';
		hideSuggestions = true;
		if (name === '/clear') {
			error = '';
			// Persist the emptied thread for this example (overrides its cache).
			commitMessages([], chatCacheKey);
		} else if (name === '/compact') {
			compact();
		}
	}

	function clearInputState() {
		input = '';
		hideSuggestions = false;
		activeSuggestion = 0;
	}

	async function compact() {
		if (currentBusy) return;
		if (messages.length < 2) {
			error = 'Nothing to compact yet.';
			return;
		}
		const originKey = chatCacheKey;
		const history = messages;
		error = '';
		setBusy(originKey, true);
		try {
			const res = await fetch('/api/agent/compact', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages: history, model: selectedModel })
			});
			if (!res.ok) throw new Error(`request failed (${res.status})`);
			const data = (await res.json()) as { summary: string };
			const summary = (data.summary ?? '').trim();
			if (summary) {
				if (originKey === chatCacheKey) followBottom();
				commitMessages(
					[{ role: 'assistant', content: `Summary of earlier conversation:\n${summary}` }],
					originKey
				);
			}
		} catch (e) {
			if (originKey === chatCacheKey) error = `compact failed: ${(e as Error).message}`;
		} finally {
			setBusy(originKey, false);
		}
	}

	async function send() {
		const text = input.trim();
		if (!text || currentBusy) return;
		// Intercept exact slash commands before they reach the model.
		if (COMMANDS.some((c) => c.name === text.toLowerCase())) {
			runCommand(text.toLowerCase());
			return;
		}
		// Bind this request to the example it was issued from.
		const originChat = chatCacheKey;
		const originFile = fileCacheKey;
		const originFiles = files;
		error = '';
		const outgoing: ChatMessage[] = [...messages, { role: 'user', content: text }];
		followBottom();
		commitMessages(outgoing, originChat);
		clearInputState();
		setBusy(originChat, true);
		try {
			const res = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					files: originFiles.map((f) => ({ name: f.name, content: f.content })),
					messages: outgoing,
					model: selectedModel,
					demoName,
					description
				})
			});
			if (!res.ok) throw new Error(`request failed (${res.status})`);
			const data = (await res.json()) as { reply: string; files: File[] };
			const filesChanged = JSON.stringify(data.files) !== JSON.stringify(originFiles);
			const reply = data.reply?.trim() || (filesChanged ? '(updated the files)' : '(no response)');
			if (originChat === chatCacheKey) followBottom();
			commitMessages([...outgoing, { role: 'assistant', content: reply }], originChat);
			if (filesChanged) {
				onFilesChange(data.files, originFile);
			}
		} catch (e) {
			if (originChat === chatCacheKey) error = `request failed: ${(e as Error).message}`;
		} finally {
			setBusy(originChat, false);
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (suggestions.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				activeSuggestion = (activeSuggestion + 1) % suggestions.length;
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				activeSuggestion = (activeSuggestion - 1 + suggestions.length) % suggestions.length;
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				hideSuggestions = true;
				return;
			}
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				runCommand(suggestions[activeSuggestion].name);
				return;
			}
		}
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="flex h-full flex-col">
	<header class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Agent</h2>
			<!-- Info shows on hover (and keyboard focus for a11y), not on click. -->
			<div
				class="relative"
				role="note"
				on:mouseenter={() => (showInfo = true)}
				on:mouseleave={() => (showInfo = false)}
				on:focusin={() => (showInfo = true)}
				on:focusout={() => (showInfo = false)}
			>
				<button
					type="button"
					aria-label="About chat commands"
					title="About chat commands"
					class="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					i
				</button>
				{#if showInfo}
					<div
						class="absolute right-0 top-8 z-10 w-64 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
					>
						<p class="mb-2 font-semibold text-gray-900 dark:text-white">Chat commands</p>
						<p class="mb-1">
							<code class="font-mono font-semibold">/clear</code> — wipe the conversation history for
							this example.
						</p>
						<p>
							<code class="font-mono font-semibold">/compact</code> — summarize the conversation into
							a short recap to save context and tokens.
						</p>
					</div>
				{/if}
			</div>
		</div>
		<select
			bind:value={selectedModel}
			class="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		>
			{#each models as m}
				<option value={m}>{m}</option>
			{/each}
		</select>
	</header>

	<div
		bind:this={scrollEl}
		on:scroll={onThreadScroll}
		class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
	>
		{#each messages as m}
			{#if m.role === 'user'}
				<div class="text-sm text-gray-900 dark:text-white">
					<span class="font-medium">You:</span>
					<span class="whitespace-pre-wrap">{m.content}</span>
				</div>
			{:else}
				<div class="text-sm">
					<span class="font-medium text-blue-700 dark:text-blue-300">Agent:</span>
					<!-- Model output is untrusted; renderMarkdown sanitizes (DOMPurify) before {@html}. -->
					<div class="chat-md mt-1 text-gray-900 dark:text-gray-100">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html renderMarkdown(m.content)}
					</div>
				</div>
			{/if}
		{/each}
		{#if currentBusy}
			<div class="text-sm italic text-gray-400">Thinking…</div>
		{/if}
		{#if error}
			<div
				class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
			>
				{error}
			</div>
		{/if}
	</div>

	<div class="relative border-t border-gray-200 p-3 dark:border-gray-700">
		{#if suggestions.length > 0}
			<ul
				class="absolute bottom-full left-3 right-3 z-10 mb-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				{#each suggestions as s, i}
					<li>
						<button
							type="button"
							on:click={() => runCommand(s.name)}
							class="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 {i ===
							activeSuggestion
								? 'bg-gray-100 dark:bg-gray-700'
								: ''}"
						>
							<span class="font-mono font-semibold text-gray-900 dark:text-white">{s.name}</span>
							<span class="text-xs text-gray-500 dark:text-gray-400">{s.desc}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<textarea
			bind:value={input}
			on:keydown={onKeydown}
			on:input={() => {
				hideSuggestions = false;
				activeSuggestion = 0;
			}}
			rows="2"
			placeholder="Ask the agent to edit this demo…"
			class="w-full resize-none rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>
		<button
			type="button"
			on:click={send}
			disabled={currentBusy}
			class="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			Send
		</button>
	</div>
</div>
