import { writable } from 'svelte/store';

// Chat keys of examples whose agent replied while the user was elsewhere. Drives
// the unread dot in the bottom nav; cleared when the example is viewed.
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
