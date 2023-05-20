import { getDemoIndex } from '$lib/server/demoManager';
import { redirect } from '@sveltejs/kit';

export async function load(): Promise<void> {
	const index = await getDemoIndex();
	const firstClient = Object.keys(index)[0];
	const firstDemo = Object.keys(index[firstClient])[0];
	throw redirect(307, `/demo/${firstClient}/${firstDemo}`);
}
