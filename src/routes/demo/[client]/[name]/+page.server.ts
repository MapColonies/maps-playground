import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDemoIndex, getFile } from '$lib/server/demoManager.js';
import { demoViewsTotal } from '$lib/server/metrics';
import { isGhPagesBuild } from '$lib/buildTarget';
import type { Link, File } from '$lib/types';

// SvelteKit calls entries() on every build, prerendered or not.
export async function entries(): Promise<Array<{ client: string; name: string }>> {
	if (!isGhPagesBuild) return [];
	const index = await getDemoIndex();
	const out: Array<{ client: string; name: string }> = [];
	for (const [client, demos] of Object.entries(index)) {
		for (const name of Object.keys(demos)) {
			out.push({ client, name });
		}
	}
	return out;
}

export async function load({ params }): Promise<{
	links: Link[];
	files: File[];
	demoName: string;
	displayName?: string;
	description?: string;
	agentEnabled: boolean;
}> {
	const { client, name: demoName } = params;

	const demoMetadata = (await getDemoIndex())[client]?.[demoName];
	if (!demoMetadata) {
		throw error(404, `no demo named ${demoName} found in client ${client}`);
	}

	demoViewsTotal.inc({ client, name: demoName });

	const files = await Promise.all(
		demoMetadata.files.map(async (fileName) => {
			const content = await getFile(fileName);
			return { name: fileName, content };
		})
	);

	return {
		links: demoMetadata.links,
		files,
		demoName,
		displayName: demoMetadata.displayName,
		description: demoMetadata.description,
		agentEnabled: env.AGENT_ENABLED === 'true'
	};
}
