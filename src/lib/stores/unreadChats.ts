import { writable } from 'svelte/store';

// Keys (chat cache keys) of examples whose agent produced a reply while the user
// was viewing a different example. Drives the "unread" dot in the bottom nav so a
// late, off-screen response is discoverable. Cleared when that example is viewed.
export const unreadChats = writable<Set<string>>(new Set());

// Always reassign a fresh Set — Svelte's store equality is by reference, so
// mutating in place would not notify subscribers.
export function markUnread(key: string): void {
	unreadChats.update((set) => {
		const next = new Set(set);
		next.add(key);
		return next;
	});
}

export function markRead(key: string): void {
	unreadChats.update((set) => {
		if (!set.has(key)) return set;
		const next = new Set(set);
		next.delete(key);
		return next;
	});
}

export function isUnread(set: Set<string>, key: string): boolean {
	return set.has(key);
}
