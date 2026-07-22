import type { File, ChatMessage } from '$lib/types';

export function applyTool(
	files: File[],
	name: string,
	args: Record<string, unknown>
): { files: File[]; result: string } {
	if (name === 'write_file') {
		const fname = String(args.name ?? '');
		const content = String(args.content ?? '');
		if (!fname) return { files, result: 'error: name is required' };
		const idx = files.findIndex((f) => f.name === fname);
		const next =
			idx === -1
				? [...files, { name: fname, content }]
				: files.map((f, i) => (i === idx ? { name: fname, content } : f));
		return { files: next, result: `ok: wrote ${fname}` };
	}

	if (name === 'edit_file') {
		const fname = String(args.name ?? '');
		const oldStr = String(args.old_string ?? '');
		const newStr = String(args.new_string ?? '');
		const file = files.find((f) => f.name === fname);
		if (!file) return { files, result: `error: file ${fname} not found` };
		const count = oldStr === '' ? 0 : file.content.split(oldStr).length - 1;
		if (count === 0) return { files, result: `error: old_string not found in ${fname}` };
		if (count > 1)
			return { files, result: `error: old_string not unique in ${fname} (${count} matches)` };
		const next = files.map((f) =>
			f.name === fname ? { name: f.name, content: f.content.replace(oldStr, newStr) } : f
		);
		return { files: next, result: `ok: edited ${fname}` };
	}

	return { files, result: `error: unknown tool ${name}` };
}

export const TOOLS = [
	{
		type: 'function',
		function: {
			name: 'write_file',
			description: "Create a new file or replace an existing file's entire contents.",
			parameters: {
				type: 'object',
				properties: {
					name: { type: 'string', description: 'File name, e.g. index.js' },
					content: { type: 'string', description: 'Full new file contents' }
				},
				required: ['name', 'content']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'edit_file',
			description: 'Replace a unique snippet in an existing file.',
			parameters: {
				type: 'object',
				properties: {
					name: { type: 'string', description: 'Existing file name' },
					old_string: {
						type: 'string',
						description: 'Exact text to replace; must be unique in the file'
					},
					new_string: { type: 'string', description: 'Replacement text' }
				},
				required: ['name', 'old_string', 'new_string']
			}
		}
	}
];

export interface AgentConfig {
	baseUrl: string;
	apiKey: string;
	model: string;
	fetchFn?: typeof fetch;
	maxIterations?: number;
}

interface LlmMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | null;
	tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
	tool_call_id?: string;
}

function systemPrompt(files: File[], demoName?: string, description?: string): string {
	const list = files.map((f) => `- ${f.name}`).join('\n');
	return [
		'You are a coding assistant that edits an interactive map demo.',
		demoName ? `Demo: ${demoName}` : '',
		description ? `Description: ${description}` : '',
		'Current files:',
		list,
		'Use the write_file and edit_file tools to make changes. Keep edits minimal and explain what you changed.'
	]
		.filter(Boolean)
		.join('\n');
}

export async function runAgent(opts: {
	files: File[];
	messages: ChatMessage[];
	config: AgentConfig;
	demoName?: string;
	description?: string;
}): Promise<{ reply: string; files: File[] }> {
	const { config } = opts;
	const doFetch = config.fetchFn ?? fetch;
	const maxIterations = config.maxIterations ?? 8;
	let files = opts.files;

	const convo: LlmMessage[] = [
		{ role: 'system', content: systemPrompt(files, opts.demoName, opts.description) },
		...opts.messages.map((m) => ({ role: m.role, content: m.content }))
	];

	for (let i = 0; i < maxIterations; i++) {
		// Rebuild the system prompt so its file list reflects edits applied so far.
		convo[0] = { role: 'system', content: systemPrompt(files, opts.demoName, opts.description) };
		const res = await doFetch(`${config.baseUrl}/v1/chat/completions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
			body: JSON.stringify({ model: config.model, messages: convo, tools: TOOLS })
		});
		if (!res.ok) throw new Error(`llm request failed: ${res.status}`);
		const data = await res.json();
		const choice = data.choices?.[0]?.message as LlmMessage | undefined;
		if (!choice) throw new Error('llm response missing message');
		convo.push(choice);

		const toolCalls = choice.tool_calls ?? [];
		if (toolCalls.length === 0) {
			return { reply: choice.content ?? '', files };
		}

		for (const call of toolCalls) {
			let args: Record<string, unknown> = {};
			try {
				args = JSON.parse(call.function.arguments || '{}');
			} catch {
				args = {};
			}
			const applied = applyTool(files, call.function.name, args);
			files = applied.files;
			convo.push({ role: 'tool', tool_call_id: call.id, content: applied.result });
		}
	}

	const lastText =
		[...convo].reverse().find((m) => m.role === 'assistant' && m.content)?.content ?? '';
	const capNote = `Stopped after the ${maxIterations}-step tool limit; changes so far are applied.`;
	return { reply: lastText ? `${capNote}\n\n${lastText}` : capNote, files };
}

export async function fetchModels(config: {
	baseUrl: string;
	apiKey: string;
	fetchFn?: typeof fetch;
}): Promise<string[]> {
	const doFetch = config.fetchFn ?? fetch;
	const res = await doFetch(`${config.baseUrl}/v1/models`, {
		headers: { authorization: `Bearer ${config.apiKey}` }
	});
	if (!res.ok) throw new Error(`models request failed: ${res.status}`);
	const data = await res.json();
	return (data.data ?? []).map((m: { id: string }) => m.id);
}
