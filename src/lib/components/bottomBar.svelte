<script lang="ts">
	import {
		BottomNav,
		BottomNavItem,
		Tooltip,
		BottomNavHeader,
		BottomNavHeaderItem
	} from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import BottomHeaderItem from './bottomHeaderItem.svelte';
	import classNames from 'classnames';

	export let clients: { name: string; defaultItem: string }[];
	export let items: { name: string; displayName?: string }[];
	export let activeClient: string | undefined;

	$: outerDiv = classNames('-translate-x-0', $$props.outerDiv);
</script>

<BottomNav
	position="static"
	navType="custom"
	outerDiv={outerDiv}
	innerDefault="overflow-x-scroll justify-center"
	innerDiv="flex flex-row"
>
	<BottomNavHeader slot="header">
		{#each clients as client (client.name)}
			<BottomHeaderItem
				itemName={client.name}
				on:click={() =>
					client.name === activeClient || goto('/demo/' + client.name + '/' + client.defaultItem)}
				active={client.name === activeClient}
				innerClass="grid max-w-fit grid-cols-{clients.length > 12
					? 12
					: clients.length} gap-1 p-1 mx-auto my-2 bg-gray-100 rounded-lg dark:bg-gray-600"
			/>
		{/each}
	</BottomNavHeader>
	{#each items as item}
		<BottomNavItem
			on:click={() => goto('/demo/' + activeClient + '/' + item.name)}
			id="group-{item.name}"
			btnDefault="basis-0 items-center justify-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 group"
		>
			{item.displayName || item.name}
			<!-- {#if item.displayName === 'basic openlayers'}
			<img src="/f22.png"/>
			{:else}
			<img src="/logo-light.svg"/>
			{/if} -->
			<Tooltip arrow={false}>{item.displayName}</Tooltip>
		</BottomNavItem>
	{/each}
</BottomNav>
