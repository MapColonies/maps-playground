import { getDemoIndex, getFile } from '$lib/server/demoManager.js';
import { demoViewsTotal } from '$lib/server/metrics';
import type { Link, File } from '$lib/types';

export async function load({ params }): Promise<{
	links: Link[];
	files: File[];
	demoName: string;
	displayName?: string;
	description?: string;
}> {
	const { client, name: demoName } = params;

	demoViewsTotal.inc({ client, name: demoName });

	const demoMetadata = (await getDemoIndex())[client][demoName];

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
		description: demoMetadata.description
	};
}
