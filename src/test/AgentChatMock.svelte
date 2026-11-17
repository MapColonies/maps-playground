<script lang="ts">
	// Minimal stand-in for agentChat.svelte: no network, just the collapse control
	// so the page's panel-collapse behaviour can be tested in isolation.
	export let onCollapse: (() => void) | null = null;
</script>

<div data-testid="agent-chat-mock">
	{#if onCollapse}
		<button type="button" aria-label="Collapse agent panel" on:click={onCollapse}>«</button>
	{/if}
</div>
