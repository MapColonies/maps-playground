<script lang="ts">
	import type { File, Link } from '$lib/types';
	import { flemsMockProps } from './flemsMockState';

	export let files: File[];
	export let links: Link[];
	export let onChange: ((files: File[]) => void) | undefined = undefined;

	$: flemsMockProps.set({ files, links, onChange });
</script>

<div data-testid="flems-mock" />
