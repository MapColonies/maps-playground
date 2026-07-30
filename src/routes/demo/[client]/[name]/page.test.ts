import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, writable, type Writable } from 'svelte/store';
import { cacheKey, chatKey } from '$lib/cache/demoCache';
import type { File } from '$lib/types';

const dataFiles: File[] = [{ name: 'index.js', content: 'ORIGINAL' }];
const editedFiles: File[] = [{ name: 'index.js', content: 'EDITED' }];

interface RenderOpts {
	envDebounce?: string; // value of PUBLIC_CACHE_DEBOUNCE_MS, or undefined to omit
	client?: string;
	name?: string;
	agentEnabled?: boolean;
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
	// Stub AgentChat to avoid its onMount model fetch; keeps the collapse control.
	vi.doMock('$lib/components/agentChat.svelte', async () => ({
		default: (await import('../../../../test/AgentChatMock.svelte')).default
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
				description: '',
				agentEnabled: opts.agentEnabled ?? false
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
		vi.doUnmock('$lib/components/agentChat.svelte');
	});

	it('shows no banner and uses server files when the cache is empty', async () => {
		const { currentFiles } = await renderPage();
		expect(screen.queryByText('Example loaded from cache')).toBeNull();
		expect(currentFiles()).toEqual(dataFiles);
	});

	it('loads cached files and shows the banner on mount', async () => {
		const key = cacheKey('acme', 'demo1');
		localStorage.setItem(key, JSON.stringify(editedFiles));
		const { currentFiles } = await renderPage();
		expect(screen.getByText('Example loaded from cache')).toBeInTheDocument();
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

	it('ignores an onChange echoing the baseline files (no save, no banner)', async () => {
		const { key, edit } = await renderPage();
		edit(dataFiles);
		vi.advanceTimersByTime(500);
		expect(localStorage.getItem(key)).toBeNull();
		expect(screen.queryByText('Example loaded from cache')).toBeNull();
	});

	it('shows the banner as soon as an edit is persisted, without navigating away', async () => {
		const { edit } = await renderPage();
		expect(screen.queryByText('Example loaded from cache')).toBeNull();
		edit(editedFiles);
		vi.advanceTimersByTime(500);
		expect(await screen.findByText('Example loaded from cache')).toBeInTheDocument();
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
		expect(screen.getByText('Example loaded from cache')).toBeInTheDocument();
	});

	it('clears the cache, resets files, and hides the banner when Clear is confirmed', async () => {
		const key = cacheKey('acme', 'demo1');
		localStorage.setItem(key, JSON.stringify(editedFiles));
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const { currentFiles } = await renderPage();
		await fireEvent.click(screen.getByText('Clear cache'));
		expect(localStorage.getItem(key)).toBeNull();
		expect(screen.queryByText('Example loaded from cache')).toBeNull();
		expect(currentFiles()).toEqual(dataFiles);
	});

	it('keeps the agent chat thread when Clear cache is confirmed', async () => {
		const key = cacheKey('acme', 'demo1');
		const ck = chatKey('acme', 'demo1');
		const thread = [{ role: 'user', content: 'hi' }];
		localStorage.setItem(key, JSON.stringify(editedFiles));
		localStorage.setItem(ck, JSON.stringify(thread));
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		await renderPage();
		await fireEvent.click(screen.getByText('Clear cache'));
		expect(localStorage.getItem(key)).toBeNull();
		expect(JSON.parse(localStorage.getItem(ck) as string)).toEqual(thread);
	});

	it('collapses and re-expands the info panel', async () => {
		await renderPage();
		const collapse = screen.getByLabelText('Collapse info panel');
		expect(screen.queryByLabelText('Expand info panel')).toBeNull();

		await fireEvent.click(collapse);
		expect(screen.queryByLabelText('Collapse info panel')).toBeNull();
		expect(screen.getByLabelText('Expand info panel')).toBeInTheDocument();

		await fireEvent.click(screen.getByLabelText('Expand info panel'));
		expect(screen.getByLabelText('Collapse info panel')).toBeInTheDocument();
		expect(screen.queryByLabelText('Expand info panel')).toBeNull();
	});

	it('collapses and re-expands the agent panel', async () => {
		await renderPage({ agentEnabled: true });
		const collapse = screen.getByLabelText('Collapse agent panel');
		expect(screen.queryByLabelText('Expand agent panel')).toBeNull();

		await fireEvent.click(collapse);
		expect(screen.queryByLabelText('Collapse agent panel')).toBeNull();
		expect(screen.getByLabelText('Expand agent panel')).toBeInTheDocument();

		await fireEvent.click(screen.getByLabelText('Expand agent panel'));
		expect(screen.getByLabelText('Collapse agent panel')).toBeInTheDocument();
		expect(screen.queryByLabelText('Expand agent panel')).toBeNull();
	});

	it('reloads cache state when the route params change', async () => {
		const otherKey = cacheKey('acme', 'demo2');
		localStorage.setItem(otherKey, JSON.stringify(editedFiles));
		const { pageStore, currentFiles } = await renderPage({ name: 'demo1' });
		expect(screen.queryByText('Example loaded from cache')).toBeNull();

		pageStore.set({ params: { client: 'acme', name: 'demo2' } });
		await Promise.resolve();
		expect(await screen.findByText('Example loaded from cache')).toBeInTheDocument();
		expect(currentFiles()).toEqual(editedFiles);
	});
});
