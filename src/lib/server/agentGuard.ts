import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Gate for the agent endpoints: dark unless AGENT_ENABLED=true, and same-origin
// enforced (a cross-origin request carries an Origin header, so a mismatch is
// denied). AGENT_ALLOWED_ORIGIN overrides the expected origin behind a proxy.
export function assertAgentAccess(request: Request, url: URL): void {
	if (env.AGENT_ENABLED !== 'true') {
		throw error(404, 'not found');
	}
	const origin = request.headers.get('origin');
	const allowed = env.AGENT_ALLOWED_ORIGIN || url.origin;
	if (origin && origin !== allowed) {
		throw error(403, 'forbidden');
	}
}
