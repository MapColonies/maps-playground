import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { unreadChats, markUnread, markRead, isUnread } from './unreadChats';

describe('unreadChats store', () => {
	beforeEach(() => {
		// Start each test from an empty set.
		for (const k of get(unreadChats)) markRead(k);
	});

	it('starts empty', () => {
		expect(get(unreadChats).size).toBe(0);
	});

	it('markUnread flags a key and isUnread reports it', () => {
		markUnread('chat:A');
		expect(get(unreadChats).has('chat:A')).toBe(true);
		expect(isUnread(get(unreadChats), 'chat:A')).toBe(true);
		expect(isUnread(get(unreadChats), 'chat:B')).toBe(false);
	});

	it('markRead clears a flagged key', () => {
		markUnread('chat:A');
		markRead('chat:A');
		expect(get(unreadChats).has('chat:A')).toBe(false);
	});

	it('markUnread is idempotent and reassigns for reactivity', () => {
		markUnread('chat:A');
		const first = get(unreadChats);
		markUnread('chat:A');
		const second = get(unreadChats);
		// Same membership, but a new Set instance so Svelte re-renders subscribers.
		expect(second).not.toBe(first);
		expect(second.size).toBe(1);
	});

	it('markRead on an absent key is a no-op', () => {
		markRead('chat:missing');
		expect(get(unreadChats).size).toBe(0);
	});
});
