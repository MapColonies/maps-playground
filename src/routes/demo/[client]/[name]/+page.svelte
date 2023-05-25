<script lang="ts">
	import Flems from '$lib/components/flems.svelte';

	export let data;
</script>

<Flems files={data.files} links={data.links} />
