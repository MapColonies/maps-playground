import { env } from '$env/dynamic/private';
import { demoSchema } from '$lib/schemas/demoIndex';
import type { DemoIndex } from '$lib/types';
import { createCache } from 'async-cache-dedupe';
import { getStringObject } from './s3wrapper';
import Ajv from 'ajv/dist/jtd';

const indexKey = env['INDEX_KEY'] as string;
const [ttl, stale] = [env.ITEMS_TIMEOUT, env.ITEMS_STALE].map((value) => {
	const parsed = parseInt(value ?? '');
	if (Number.isNaN(parsed)) {
		return 0;
	}
	return parsed;
});

const cache = createCache({
	ttl, // seconds
	stale, // number of seconds to return data after ttl has expired
	storage: { type: 'memory', options: { invalidation: true } }
});

const cacheInstance = cache.define(
	'getObject',
	{
		references: (args, key) => {
			return key;
		}
	},
	getStringObject
);

const ajv = new Ajv();
const parse = ajv.compileParser(demoSchema);

export async function getDemoIndex(): Promise<DemoIndex> {
	const demoString = await cacheInstance.getObject(indexKey);

	const demoIndex = parse(demoString);

	if (demoIndex === undefined) {
		cacheInstance.invalidateAll(indexKey);
		throw new Error(parse.message);
	}

	return demoIndex;
}

export async function getFile(key: string): Promise<string> {
	return await cacheInstance.getObject(key);
}

// Build a reference block covering EVERY example in the playground: a catalog of
// each example (client, name, description, file list) followed by the deduped
// source of those files. Fed to the agent so it can draw on the whole playground
// as reference material while staying focused on the current example.
// currentFileNames are skipped from the source dump since they already appear in
// the agent's main file list. Any failure degrades to '' so the agent still runs.
export async function buildExampleLibrary(currentFileNames: string[] = []): Promise<string> {
	let index: DemoIndex;
	try {
		index = await getDemoIndex();
	} catch {
		return '';
	}

	const skip = new Set(currentFileNames);
	const catalog: string[] = [];
	const fileKeys = new Set<string>();
	for (const [client, demos] of Object.entries(index)) {
		for (const [name, meta] of Object.entries(demos)) {
			catalog.push(
				`### ${client} / ${meta.displayName ?? name}\n` +
					(meta.description ? `${meta.description}\n` : '') +
					`Files: ${meta.files.join(', ')}`
			);
			for (const f of meta.files) if (!skip.has(f)) fileKeys.add(f);
		}
	}

	const contents = await Promise.all(
		[...fileKeys].map(async (key) => {
			try {
				return `--- ${key} ---\n${await getFile(key)}`;
			} catch {
				return '';
			}
		})
	);

	return [
		'Catalog of every example in the playground:',
		...catalog,
		"Source of the reference files above (the current example's own files are omitted — they appear in the main file list):",
		...contents.filter(Boolean)
	].join('\n\n');
}
