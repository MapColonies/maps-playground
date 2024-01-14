import { getDemoIndex, getFile } from '$lib/server/demoManager.js';
import type { File } from '$lib/types';

export async function load({
	params
}): Promise<{ files: File[]; demoName: string }> {
	const { client, name: demoName } = params;

	const demoMetadata = (await getDemoIndex())[client][demoName];

	const files = await Promise.all(
		demoMetadata.files.map(async (fileName) => {
			const content = await getFile(fileName);
			return { name: fileName.split('/').at(-1) as string, content };
		})
	);

	return { files, demoName };
}
