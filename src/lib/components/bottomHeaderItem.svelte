<script lang="ts">
	import classNames from 'classnames';
	export let itemName: string = '';
	export let active: boolean = false;
	export let unread: boolean = false;
	export let defaultClass: string =
		'px-5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700 rounded-lg';
	export let activeClass: string =
		'px-5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-300 dark:text-gray-900 rounded-lg';

	$: btnClass = classNames('relative', active ? activeClass : defaultClass);
</script>

<button class={btnClass} {...$$restProps} on:click>
	{#if unread}
		<span
			class="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"
			aria-label="Unread agent response"
			title="The agent replied on an example under this client"
		/>
	{/if}
	{itemName}
</button>
