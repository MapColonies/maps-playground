<script lang="ts">
	import { onMount } from 'svelte';
	import type { File, ChatMessage } from '$lib/types';

	export let files: File[];
	export let onFilesChange: (files: File[]) => void;
	export let demoName: string | undefined = undefined;
	export let description: string | undefined = undefined;

	let messages: ChatMessage[] = [];
	let input = '';
	let busy = false;
	let error = '';
	let models: string[] = [];
	let selectedModel = '';

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

	async function send() {
		const text = input.trim();
		if (!text || busy) return;
		error = '';
		const outgoing: ChatMessage[] = [...messages, { role: 'user', content: text }];
		messages = outgoing;
		input = '';
		busy = true;
		try {
			const res = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					files: files.map((f) => ({ name: f.name, content: f.content })),
					messages: outgoing,
					model: selectedModel,
					demoName,
					description
				})
			});
			if (!res.ok) throw new Error(`request failed (${res.status})`);
			const data = (await res.json()) as { reply: string; files: File[] };
			const filesChanged = JSON.stringify(data.files) !== JSON.stringify(files);
			const reply = data.reply?.trim() || (filesChanged ? '(updated the files)' : '(no response)');
			messages = [...outgoing, { role: 'assistant', content: reply }];
			if (filesChanged) {
				onFilesChange(data.files);
			}
		} catch (e) {
			error = `request failed: ${(e as Error).message}`;
		} finally {
			busy = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="flex h-full flex-col">
	<header class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Agent</h2>
		<select
			bind:value={selectedModel}
			class="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		>
			{#each models as m}
				<option value={m}>{m}</option>
			{/each}
		</select>
	</header>

	<div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
		{#each messages as m}
			<div
				class="text-sm {m.role === 'user'
					? 'text-gray-900 dark:text-white'
					: 'text-blue-700 dark:text-blue-300'}"
			>
				<span class="font-medium">{m.role === 'user' ? 'You' : 'Agent'}:</span>
				<span class="whitespace-pre-wrap">{m.content}</span>
			</div>
		{/each}
		{#if busy}
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

	<div class="border-t border-gray-200 p-3 dark:border-gray-700">
		<textarea
			bind:value={input}
			on:keydown={onKeydown}
			rows="2"
			placeholder="Ask the agent to edit this demo…"
			class="w-full resize-none rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>
		<button
			type="button"
			on:click={send}
			disabled={busy}
			class="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			Send
		</button>
	</div>
</div>
