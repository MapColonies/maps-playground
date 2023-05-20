import { getDemoIndex } from '$lib/server/demoManager';
import memoize from 'micro-memoize';
import { deepEqual } from 'fast-equals';
import type { DemoIndex, DemoMetadata } from '$lib/types.js';
import { error } from '@sveltejs/kit';

type LoadResult = {
	clients: { name: string; defaultItem: string }[];
	items: Pick<DemoMetadata, 'displayName'> & { name: string }[];
	activeClient: string | undefined;
};

function getResultFromIndex(index: DemoIndex, client?: string): LoadResult {
	return {
		clients: Object.entries(index).map(([name, metadata]) => ({
			name,
			defaultItem: Object.keys(metadata)[0]
		})),
		items: client
			? Object.entries(index[client]).map(([key, metadata]) => ({
					name: key,
					displayName: metadata.displayName
			  }))
			: [],
		activeClient: client
	};
}

const memoized = memoize(getResultFromIndex, { isEqual: deepEqual });

export async function load({ params }): Promise<LoadResult> {
	const { client, name: demoName } = params;
	const index = await getDemoIndex();

	if (client === undefined || index[client] === undefined) {
		throw error(404, `no client named ${client} found.`)
	}

	if (demoName === undefined || index[client][demoName] === undefined) {
		throw error(404, `no demo named ${demoName} found in client ${client} found.`)
	}

	return memoized(index, client);
}
