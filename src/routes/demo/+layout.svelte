<script>
	import BottomBar from '$lib/components/bottomBar.svelte';

	export let data;
</script>

<div class="h-full flex flex-col">
	<div class="flex-grow min-h-0">
		<slot />
	</div>
	<BottomBar
		outerDiv="flex-none h-inherit"
		clients={data.clients}
		items={data.items}
		activeClient={data.activeClient}
	/>
</div>
