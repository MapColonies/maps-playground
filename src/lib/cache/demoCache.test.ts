import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	cacheKey,
	loadCache,
	saveCache,
	clearCache,
	chatKey,
	loadChat,
	saveChat,
	clearChat
} from './demoCache';
import type { File, ChatMessage } from '$lib/types';

const files: File[] = [{ name: 'index.js', content: 'console.log(1);' }];
const chat: ChatMessage[] = [
	{ role: 'user', content: 'add a marker' },
	{ role: 'assistant', content: 'done' }
];

describe('cacheKey', () => {
	it('builds a namespaced key', () => {
		expect(cacheKey('acme', 'x')).toBe('demo-cache:v1:acme/x');
	});
});

describe('loadCache', () => {
	beforeEach(() => localStorage.clear());

	it('returns null on a miss', () => {
		expect(loadCache('demo-cache:v1:acme/x')).toBeNull();
	});

	it('returns the stored files array on a hit', () => {
		localStorage.setItem('k', JSON.stringify(files));
		expect(loadCache('k')).toEqual(files);
	});

	it('returns null when the stored JSON is not an array', () => {
		localStorage.setItem('k', JSON.stringify({ files }));
		expect(loadCache('k')).toBeNull();
		localStorage.setItem('k', '5');
		expect(loadCache('k')).toBeNull();
	});

	it('returns null when the stored value is corrupt JSON', () => {
		localStorage.setItem('k', '{bad');
		expect(loadCache('k')).toBeNull();
	});
});

describe('saveCache', () => {
	beforeEach(() => localStorage.clear());

	it('stores a bare JSON array (round-trips through loadCache)', () => {
		saveCache('k', files);
		// Drift: the code stores the array directly, NOT { files, savedAt }.
		expect(JSON.parse(localStorage.getItem('k') as string)).toEqual(files);
		expect(loadCache('k')).toEqual(files);
	});

	it('swallows quota / write errors without throwing', () => {
		const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('QuotaExceededError');
		});
		expect(() => saveCache('k', files)).not.toThrow();
		spy.mockRestore();
	});
});

describe('clearCache', () => {
	it('removes the entry', () => {
		localStorage.setItem('k', JSON.stringify(files));
		clearCache('k');
		expect(loadCache('k')).toBeNull();
	});
});

describe('chat cache', () => {
	beforeEach(() => localStorage.clear());

	it('builds a chat-namespaced key distinct from the files key', () => {
		expect(chatKey('acme', 'x')).toBe('demo-chat:v1:acme/x');
		expect(chatKey('acme', 'x')).not.toBe(cacheKey('acme', 'x'));
	});

	it('round-trips a messages array through save/load', () => {
		saveChat('c', chat);
		expect(loadChat('c')).toEqual(chat);
	});

	it('returns null on a miss and on non-array JSON', () => {
		expect(loadChat('c')).toBeNull();
		localStorage.setItem('c', JSON.stringify({ chat }));
		expect(loadChat('c')).toBeNull();
		localStorage.setItem('c', '{bad');
		expect(loadChat('c')).toBeNull();
	});

	it('clearChat removes the entry', () => {
		saveChat('c', chat);
		clearChat('c');
		expect(loadChat('c')).toBeNull();
	});

	it('keeps per-example threads independent', () => {
		const a = chatKey('acme', 'a');
		const b = chatKey('acme', 'b');
		saveChat(a, chat);
		expect(loadChat(b)).toBeNull();
		expect(loadChat(a)).toEqual(chat);
	});
});

describe('SSR guard', () => {
	it('no-ops when localStorage is undefined', () => {
		vi.stubGlobal('localStorage', undefined);
		expect(loadCache('k')).toBeNull();
		expect(() => saveCache('k', files)).not.toThrow();
		expect(() => clearCache('k')).not.toThrow();
		expect(loadChat('c')).toBeNull();
		expect(() => saveChat('c', chat)).not.toThrow();
		expect(() => clearChat('c')).not.toThrow();
		// No manual restore needed: the shared afterEach (vitest-setup.ts)
		// unstubs globals before clearing localStorage.
	});
});
