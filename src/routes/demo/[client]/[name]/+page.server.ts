import { getDemoIndex, getFile } from '$lib/server/demoManager.js';
import type { Link, File } from '$lib/types';

export async function entries(): Promise<Array<{ client: string; name: string }>> {
	const index = await getDemoIndex();
	const out: Array<{ client: string; name: string }> = [];
	for (const [client, demos] of Object.entries(index)) {
		for (const name of Object.keys(demos)) {
			out.push({ client, name });
		}
	}
	return out;
}

export async function load({
	params
}): Promise<{ links: Link[]; files: File[]; demoName: string }> {
	const { client, name: demoName } = params;

	const demoMetadata = (await getDemoIndex())[client][demoName];

	const files = await Promise.all(
		demoMetadata.files.map(async (fileName) => {
			const content = await getFile(fileName);
			return { name: fileName, content };
		})
	);

	return { links: demoMetadata.links, files, demoName };
}
