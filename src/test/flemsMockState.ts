import { writable } from 'svelte/store';
import type { File, Link } from '$lib/types';

export interface FlemsMockProps {
	files: File[];
	links: Link[];
	onChange?: (files: File[]) => void;
}

// The mock component writes its latest props here; tests read them to drive edits.
export const flemsMockProps = writable<FlemsMockProps | null>(null);
