import type { File } from '$lib/types';

const NAMESPACE = 'demo-cache:v1';

interface CacheEntry {
	files: File[];
	savedAt: number;
}

function available(): boolean {
	return typeof localStorage !== 'undefined';
}

export function cacheKey(client: string, name: string): string {
	return `${NAMESPACE}:${client}/${name}`;
}

export function loadCache(key: string): File[] | null {
	if (!available()) return null;
	const raw = localStorage.getItem(key);
	if (raw === null) return null;
	try {
		const entry = JSON.parse(raw) as CacheEntry;
		return Array.isArray(entry.files) ? entry.files : null;
	} catch {
		return null;
	}
}

export function saveCache(key: string, files: File[]): void {
	if (!available()) return;
	const entry: CacheEntry = { files, savedAt: Date.now() };
	localStorage.setItem(key, JSON.stringify(entry));
}

export function clearCache(key: string): void {
	if (!available()) return;
	localStorage.removeItem(key);
}
