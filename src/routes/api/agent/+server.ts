import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runAgent } from '$lib/server/agentClient';

export async function POST({ request }) {
	const { LITELLM_BASE_URL, LITELLM_API_KEY, AGENT_MODEL } = env;
	if (!LITELLM_BASE_URL || !LITELLM_API_KEY) {
		throw error(500, 'agent not configured');
	}

	const body = await request.json();
	const { files, messages, model, demoName, description } = body;
	if (!Array.isArray(files) || !Array.isArray(messages)) {
		throw error(400, 'files and messages are required');
	}

	try {
		const result = await runAgent({
			files,
			messages,
			demoName,
			description,
			config: {
				baseUrl: LITELLM_BASE_URL,
				apiKey: LITELLM_API_KEY,
				model: model || AGENT_MODEL || ''
			}
		});
		return json(result);
	} catch (e) {
		throw error(502, `agent failed: ${(e as Error).message}`);
	}
}
