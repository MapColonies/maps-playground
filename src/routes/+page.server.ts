import { getDemoIndex } from '$lib/server/demoManager';
import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export async function load(): Promise<void> {
	const index = await getDemoIndex();
	const firstClient = Object.keys(index)[0];
	const firstDemo = Object.keys(index[firstClient])[0];
	throw redirect(307, `${base}/demo/${firstClient}/${firstDemo}`);
}
