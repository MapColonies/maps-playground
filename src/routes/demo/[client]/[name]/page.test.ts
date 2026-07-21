import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, writable, type Writable } from 'svelte/store';
import { cacheKey } from '$lib/cache/demoCache';
import type { File } from '$lib/types';

const dataFiles: File[] = [{ name: 'index.js', content: 'ORIGINAL' }];
const editedFiles: File[] = [{ name: 'index.js', content: 'EDITED' }];

interface RenderOpts {
	envDebounce?: string; // value of PUBLIC_CACHE_DEBOUNCE_MS, or undefined to omit
	client?: string;
	name?: string;
}

interface PageStore {
	params: { client: string; name: string };
}

async function renderPage(opts: RenderOpts = {}) {
	const client = opts.client ?? 'acme';
	const name = opts.name ?? 'demo1';
	const pageStore: Writable<PageStore> = writable({ params: { client, name } });

	// Reset BEFORE any dynamic import so the page, its mocked child, and the
	// mock-state module all live in one fresh module graph with a single shared
	// flemsMockProps instance.
	vi.resetModules();

	vi.doMock('$env/dynamic/public', () => ({
		env: opts.envDebounce === undefined ? {} : { PUBLIC_CACHE_DEBOUNCE_MS: opts.envDebounce }
	}));
	vi.doMock('$app/stores', () => ({ page: pageStore }));
	vi.doMock('$lib/components/flems.svelte', async () => ({
		default: (await import('../../../../test/FlemsMock.svelte')).default
	}));

	// Import the mock-state module from the SAME fresh graph the child writes to.
	const { flemsMockProps } = await import('../../../../test/flemsMockState');
	flemsMockProps.set(null);

	const Page = (await import('./+page.svelte')).default;
	const result = render(Page, {
		props: {
			// Full PageData shape: the page only reads files/links/demoName/displayName/
			// description, but svelte-check enforces the load function's complete type.
			data: {
				clients: [{ name: client, defaultItem: name }],
				items: [{ name }],
				activeClient: client,
				links: [],
				files: dataFiles,
				demoName: name,
				displayName: '',
				description: ''
			}
		}
	});

	const mockProps = flemsMockProps;
	// Simulate a user edit by invoking the onChange the page handed the mock child.
	const edit = (files: File[]) => get(mockProps)?.onChange?.(files);
	const currentFiles = () => get(mockProps)?.files;

	return { ...result, pageStore, key: cacheKey(client, name), mockProps, edit, currentFiles };
}

describe('+page.svelte', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.resetModules();
		vi.doUnmock('$env/dynamic/public');
		vi.doUnmock('$app/stores');
		vi.doUnmock('$lib/components/flems.svelte');
	});

	it('shows no banner and uses server files when the cache is empty', async () => {
		const { currentFiles } = await renderPage();
		expect(screen.queryByText('Loaded from cache')).toBeNull();
		expect(currentFiles()).toEqual(dataFiles);
	});

	it('loads cached files and shows the banner on mount', async () => {
		const key = cacheKey('acme', 'demo1');
		localStorage.setItem(key, JSON.stringify(editedFiles));
		const { currentFiles } = await renderPage();
		expect(screen.getByText('Loaded from cache')).toBeInTheDocument();
		expect(currentFiles()).toEqual(editedFiles);
	});

	it('debounces a save at the default 500ms when env is unset', async () => {
		const { key, edit } = await renderPage();
		edit(editedFiles);
		vi.advanceTimersByTime(499);
		expect(localStorage.getItem(key)).toBeNull();
		vi.advanceTimersByTime(1);
		expect(JSON.parse(localStorage.getItem(key) as string)).toEqual(editedFiles);
	});

	it('honours a custom debounce interval from env (3000ms)', async () => {
		const { key, edit } = await renderPage({ envDebounce: '3000' });
		edit(editedFiles);
		vi.advanceTimersByTime(2999);
		expect(localStorage.getItem(key)).toBeNull();
		vi.advanceTimersByTime(1);
		expect(localStorage.getItem(key)).not.toBeNull();
	});

	it('allows a zero debounce (drift: 0 is accepted, not coerced to 500)', async () => {
		const { key, edit } = await renderPage({ envDebounce: '0' });
		edit(editedFiles);
		vi.advanceTimersByTime(0);
		expect(JSON.parse(localStorage.getItem(key) as string)).toEqual(editedFiles);
	});

	it('falls back to 500ms for a negative value', async () => {
		const { key, edit } = await renderPage({ envDebounce: '-5' });
		edit(editedFiles);
		vi.advanceTimersByTime(499);
		expect(localStorage.getItem(key)).toBeNull();
		vi.advanceTimersByTime(1);
		expect(localStorage.getItem(key)).not.toBeNull();
	});

	it('falls back to 500ms for a non-numeric value', async () => {
		const { key, edit } = await renderPage({ envDebounce: 'abc' });
		edit(editedFiles);
		vi.advanceTimersByTime(500);
		expect(localStorage.getItem(key)).not.toBeNull();
	});

	it('collapses rapid edits into a single persisted save', async () => {
		const { key, edit } = await renderPage();
		edit([{ name: 'index.js', content: 'A' }]);
		vi.advanceTimersByTime(200);
		edit([{ name: 'index.js', content: 'B' }]);
		vi.advanceTimersByTime(500);
		expect(JSON.parse(localStorage.getItem(key) as string)).toEqual([
			{ name: 'index.js', content: 'B' }
		]);
	});

	it('keeps the cache and banner when Clear is cancelled', async () => {
		const key = cacheKey('acme', 'demo1');
		localStorage.setItem(key, JSON.stringify(editedFiles));
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		await renderPage();
		await fireEvent.click(screen.getByText('Clear cache'));
		expect(localStorage.getItem(key)).not.toBeNull();
		expect(screen.getByText('Loaded from cache')).toBeInTheDocument();
	});

	it('clears the cache, resets files, and hides the banner when Clear is confirmed', async () => {
		const key = cacheKey('acme', 'demo1');
		localStorage.setItem(key, JSON.stringify(editedFiles));
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const { currentFiles } = await renderPage();
		await fireEvent.click(screen.getByText('Clear cache'));
		expect(localStorage.getItem(key)).toBeNull();
		expect(screen.queryByText('Loaded from cache')).toBeNull();
		expect(currentFiles()).toEqual(dataFiles);
	});

	it('reloads cache state when the route params change', async () => {
		const otherKey = cacheKey('acme', 'demo2');
		localStorage.setItem(otherKey, JSON.stringify(editedFiles));
		const { pageStore, currentFiles } = await renderPage({ name: 'demo1' });
		expect(screen.queryByText('Loaded from cache')).toBeNull();

		pageStore.set({ params: { client: 'acme', name: 'demo2' } });
		await Promise.resolve();
		expect(await screen.findByText('Loaded from cache')).toBeInTheDocument();
		expect(currentFiles()).toEqual(editedFiles);
	});
});
