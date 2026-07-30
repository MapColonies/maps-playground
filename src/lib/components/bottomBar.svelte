<script lang="ts">
	import {
		BottomNav,
		BottomNavItem,
		Tooltip,
		BottomNavHeader,
		BottomNavHeaderItem
	} from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import BottomHeaderItem from './bottomHeaderItem.svelte';
	import { unreadChats } from '$lib/stores/unreadChats';
	import { chatKey, chatKeyPrefix } from '$lib/cache/demoCache';
	import classNames from 'classnames';

	export let clients: { name: string; defaultItem: string }[];
	export let items: { name: string; displayName?: string }[];
	export let activeClient: string | undefined;

	$: activeItem = $page.params.name;

	// Unread dot when the agent replied to this example while the user was elsewhere.
	$: isItemUnread = (name: string) =>
		activeClient !== undefined && $unreadChats.has(chatKey(activeClient, name));

	// Client-header dot when any of its examples is unread — how replies on a
	// non-active client surface, since only the active client's tabs are rendered.
	$: isClientUnread = (client: string) => {
		const prefix = chatKeyPrefix(client);
		for (const k of $unreadChats) if (k.startsWith(prefix)) return true;
		return false;
	};

	$: outerDiv = classNames('-translate-x-0', 'dark:bg-gray-800', $$props.outerDiv);
</script>

<BottomNav
	position="static"
	navType="custom"
	{outerDiv}
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
				unread={client.name !== activeClient && isClientUnread(client.name)}
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
			btnDefault={classNames(
				'relative basis-0 items-center justify-center ml-[4px] mb-1 rounded-lg p-4 group',
				item.name === activeItem
					? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
					: 'bg-gray-100 dark:bg-gray-600 text-gray-900 hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700'
			)}
		>
			{#if isItemUnread(item.name)}
				<span
					class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"
					aria-label="Unread agent response"
					title="The agent replied while you were on another example"
				/>
			{/if}
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
