import { describe, it, expect, beforeEach } from 'vitest';
import { assertAgentAccess } from './agentGuard';
import { env } from '$env/dynamic/private';

function req(origin?: string): Request {
	return new Request('http://app.test/api/agent', {
		headers: origin ? { origin } : {}
	});
}
const url = new URL('http://app.test/api/agent');

function statusOf(fn: () => void): number | undefined {
	try {
		fn();
	} catch (e) {
		return (e as { status?: number }).status;
	}
	return undefined;
}

describe('assertAgentAccess', () => {
	beforeEach(() => {
		for (const k of Object.keys(env)) delete env[k];
	});

	it('404s when the feature is disabled', () => {
		expect(statusOf(() => assertAgentAccess(req('http://app.test'), url))).toBe(404);
	});

	it('allows a same-origin request when enabled', () => {
		env.AGENT_ENABLED = 'true';
		expect(() => assertAgentAccess(req('http://app.test'), url)).not.toThrow();
	});

	it('allows a request with no Origin header (non-browser)', () => {
		env.AGENT_ENABLED = 'true';
		expect(() => assertAgentAccess(req(), url)).not.toThrow();
	});

	it('403s a cross-origin request', () => {
		env.AGENT_ENABLED = 'true';
		expect(statusOf(() => assertAgentAccess(req('http://evil.test'), url))).toBe(403);
	});

	it('honors AGENT_ALLOWED_ORIGIN override', () => {
		env.AGENT_ENABLED = 'true';
		env.AGENT_ALLOWED_ORIGIN = 'http://public.test';
		expect(() => assertAgentAccess(req('http://public.test'), url)).not.toThrow();
		expect(statusOf(() => assertAgentAccess(req('http://app.test'), url))).toBe(403);
	});
});
