import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { summarizeConversation } from '$lib/server/agentClient';
import { assertAgentAccess } from '$lib/server/agentGuard';

export async function POST({ request, url }) {
	assertAgentAccess(request, url);
	const { LITELLM_BASE_URL, LITELLM_API_KEY, AGENT_MODEL } = env;
	if (!LITELLM_BASE_URL || !LITELLM_API_KEY) {
		throw error(500, 'agent not configured');
	}

	const body = await request.json();
	const { messages, model } = body;
	if (!Array.isArray(messages)) {
		throw error(400, 'messages are required');
	}

	try {
		const summary = await summarizeConversation({
			messages,
			config: {
				baseUrl: LITELLM_BASE_URL,
				apiKey: LITELLM_API_KEY,
				model: model || AGENT_MODEL || ''
			}
		});
		return json({ summary });
	} catch (e) {
		console.error('compact request failed:', e);
		throw error(502, 'compact request failed');
	}
}
