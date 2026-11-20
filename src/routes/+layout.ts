import { isGhPagesBuild } from '$lib/buildTarget';

export const prerender = isGhPagesBuild;
