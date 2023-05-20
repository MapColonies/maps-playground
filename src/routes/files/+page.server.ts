import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load(): Promise<{
	files: { name: string; path: string; urlPath: string }[];
}> {
	try {
		const files = await readdir('./static/libs', { withFileTypes: true, recursive: true });

		return {
			files: files
				.filter((file) => file.isFile())
				.map((file) => ({
					name: file.name,
					path: file.path,
					urlPath: join(file.path.substring(6), file.name)
				}))
		};
	} catch (err) {
		console.log(err);

		throw error(500, 'failed checking files');
	}
}
