import type { File, ChatMessage } from '$lib/types';

const NAMESPACE = 'demo-cache:v1';
const CHAT_NAMESPACE = 'demo-chat:v1';

function available(): boolean {
	return typeof localStorage !== 'undefined';
}

export function cacheKey(client: string, name: string): string {
	return `${NAMESPACE}:${client}/${name}`;
}

export function chatKey(client: string, name: string): string {
	return `${CHAT_NAMESPACE}:${client}/${name}`;
}

// Prefix shared by every chatKey of a client — lets callers test whether any of a
// client's examples matches without enumerating the client's item list.
export function chatKeyPrefix(client: string): string {
	return `${CHAT_NAMESPACE}:${client}/`;
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

export function loadChat(key: string): ChatMessage[] | null {
	if (!available()) return null;
	const raw = localStorage.getItem(key);
	if (raw === null) return null;
	try {
		const messages = JSON.parse(raw) as ChatMessage[];
		return Array.isArray(messages) ? messages : null;
	} catch {
		return null;
	}
}

export function saveChat(key: string, messages: ChatMessage[]): void {
	if (!available()) return;
	try {
		localStorage.setItem(key, JSON.stringify(messages));
	} catch {
		// Ignore — caching is best-effort.
	}
}

export function clearChat(key: string): void {
	if (!available()) return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Ignore — clearing is best-effort.
	}
}
