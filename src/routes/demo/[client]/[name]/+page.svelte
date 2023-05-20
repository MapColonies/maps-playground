<script lang="ts">
	import type { File, Link } from '$lib/types';

	import Flems from '$lib/components/flems.svelte';

	export let data;
</script>

<Flems files={data.files} links={data.links} />
