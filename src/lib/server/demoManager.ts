import { env } from '$env/dynamic/private';
import { demoSchema } from '$lib/schemas/demoIndex';
import type { DemoIndex } from '$lib/types';
import { createCache } from 'async-cache-dedupe';
import { getStringObject } from './s3wrapper';
import Ajv from 'ajv/dist/jtd';

const indexKey = env['INDEX_KEY'] as string;
const [ttl, stale] = [env.ITEMS_TIMEOUT, env.ITEMS_STALE].map((value) => {
	const parsed = parseInt(value);
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
