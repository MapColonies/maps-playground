import type { Handle } from '@sveltejs/kit';
import { httpRequestDuration, httpRequestsTotal, register } from '$lib/server/metrics';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/metrics' && event.request.method === 'GET') {
		const body = await register.metrics();
		return new Response(body, { headers: { 'content-type': register.contentType } });
	}

	const stop = httpRequestDuration.startTimer();
	const response = await resolve(event);
	const labels = {
		method: event.request.method,
		route: event.route.id ?? 'unknown',
		status_code: String(response.status)
	};
	stop(labels);
	httpRequestsTotal.inc(labels);
	return response;
};
