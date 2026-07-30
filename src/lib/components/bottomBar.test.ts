import { render, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import { get, type Writable } from 'svelte/store';
import { page } from '$app/stores';

// The runtime store is the writable test double aliased in vitest.config, but
// svelte-check sees SvelteKit's readonly Page type — cast to set params.
const pageStore = page as unknown as Writable<{ params: { client: string; name: string } }>;
import BottomBar from './bottomBar.svelte';
import { markUnread, markRead, unreadChats } from '$lib/stores/unreadChats';
import { chatKey } from '$lib/cache/demoCache';

const clients = [
	{ name: 'ol', defaultItem: 'basic' },
	{ name: 'cesium', defaultItem: 'globe' }
];
const items = [{ name: 'basic' }, { name: 'wmts' }];

describe('bottomBar unread dots', () => {
	beforeEach(() => {
		for (const k of get(unreadChats)) markRead(k);
		pageStore.set({ params: { client: 'ol', name: 'basic' } });
	});

	it('shows no dot when nothing is unread', () => {
		const { queryByLabelText } = render(BottomBar, {
			props: { clients, items, activeClient: 'ol' }
		});
		expect(queryByLabelText('Unread agent response')).toBeNull();
	});

	it('shows a dot only on the example whose chat is unread', async () => {
		markUnread(chatKey('ol', 'wmts'));
		const { getAllByLabelText } = render(BottomBar, {
			props: { clients, items, activeClient: 'ol' }
		});
		// Exactly one dot — on wmts, not basic.
		await waitFor(() => expect(getAllByLabelText('Unread agent response')).toHaveLength(1));
	});

	it('removes the dot when the chat is marked read', async () => {
		markUnread(chatKey('ol', 'wmts'));
		const { queryByLabelText } = render(BottomBar, {
			props: { clients, items, activeClient: 'ol' }
		});
		await waitFor(() => expect(queryByLabelText('Unread agent response')).not.toBeNull());
		markRead(chatKey('ol', 'wmts'));
		await waitFor(() => expect(queryByLabelText('Unread agent response')).toBeNull());
	});

	it('shows a header dot for a non-active client with an unread example', async () => {
		// cesium is not active, so its example tabs are not rendered — the dot must
		// surface on the client-header tab instead.
		markUnread(chatKey('cesium', 'globe'));
		const { getAllByLabelText } = render(BottomBar, {
			props: { clients, items, activeClient: 'ol' }
		});
		await waitFor(() => expect(getAllByLabelText('Unread agent response')).toHaveLength(1));
	});

	it('does not show a header dot on the active client (its item dots already cover it)', () => {
		markUnread(chatKey('ol', 'wmts'));
		const { getAllByLabelText } = render(BottomBar, {
			props: { clients, items, activeClient: 'ol' }
		});
		// Exactly the one item dot on wmts — no redundant header dot on ol.
		expect(getAllByLabelText('Unread agent response')).toHaveLength(1);
	});

	it('clears the header dot when the client’s example is read', async () => {
		markUnread(chatKey('cesium', 'globe'));
		const { queryByLabelText } = render(BottomBar, {
			props: { clients, items, activeClient: 'ol' }
		});
		await waitFor(() => expect(queryByLabelText('Unread agent response')).not.toBeNull());
		markRead(chatKey('cesium', 'globe'));
		await waitFor(() => expect(queryByLabelText('Unread agent response')).toBeNull());
	});
});
