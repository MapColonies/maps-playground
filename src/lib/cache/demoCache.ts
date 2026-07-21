import type { File } from '$lib/types';

const NAMESPACE = 'demo-cache:v1';

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
		const files = JSON.parse(raw) as File[];
		return Array.isArray(files) ? files : null;
	} catch {
		return null;
	}
}

export function saveCache(key: string, files: File[]): void {
	if (!available()) return;
	try {
		localStorage.setItem(key, JSON.stringify(files));
	} catch {
		// Ignore quota / private-mode write failures — caching is best-effort.
	}
}

export function clearCache(key: string): void {
	if (!available()) return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Ignore — clearing is best-effort.
	}
}
