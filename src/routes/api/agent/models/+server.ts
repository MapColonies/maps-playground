import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { fetchModels } from '$lib/server/agentClient';
import { assertAgentAccess } from '$lib/server/agentGuard';

export async function GET({ request, url }) {
	assertAgentAccess(request, url);
	const { LITELLM_BASE_URL, LITELLM_API_KEY, AGENT_MODEL } = env;
	if (!LITELLM_BASE_URL || !LITELLM_API_KEY) {
		throw error(500, 'agent not configured');
	}

	try {
		const models = await fetchModels({ baseUrl: LITELLM_BASE_URL, apiKey: LITELLM_API_KEY });
		return json({ models, default: AGENT_MODEL ?? models[0] ?? '' });
	} catch (e) {
		console.error('models fetch failed:', e);
		throw error(502, 'models fetch failed');
	}
}
