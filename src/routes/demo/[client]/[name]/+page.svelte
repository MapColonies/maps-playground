<script lang="ts">
	import Flems from '$lib/components/flems.svelte';

	export let data;
</script>

<div class="h-full flex flex-row gap-3 p-3 bg-gray-50 dark:bg-gray-900">
	<div
		class="flex-1 min-w-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800"
	>
		<Flems files={data.files} links={data.links} />
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
