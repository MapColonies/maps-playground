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
	// arguments should be a JSON string, but some providers return a parsed object.
	tool_calls?: {
		id: string;
		type: 'function';
		function: { name: string; arguments: string | Record<string, unknown> };
	}[];
	tool_call_id?: string;
}

function systemPrompt(
	files: File[],
	demoName?: string,
	description?: string,
	exampleLibrary?: string,
	portalUrl?: string
): string {
	const contents = files
		.map((f) => `--- ${f.name} ---\n${f.content}`)
		.join('\n\n');
	return [
		'You are a coding assistant working inside the MapColonies Playground.',
		'This is a sandbox of small, self-contained code examples that each demonstrate one technique:',
		'how to use a mapping library (OpenLayers, Cesium, or Leaflet) and how to connect it to MapColonies services.',
		'Each example is a minimal snippet that runs in an in-browser Flems playground — it is teaching material, not a production application.',
		'Scope every suggestion to that purpose: correctness of the mapping technique, clarity, and idiomatic library/MapColonies usage.',
		'Do NOT suggest production-app concerns that do not apply to a sandbox snippet — no build tooling, test frameworks, TypeScript migration, CI, package managers, or deployment/security hardening — unless the user explicitly asks.',
		portalUrl
			? `The MapColonies developer portal (${portalUrl}) is the authoritative reference for our services' APIs, endpoints, parameters, and auth. Treat it as the source of truth, point users there for details, and do not invent API specifics that would contradict it.`
			: '',
		demoName ? `Demo: ${demoName}` : '',
		description ? `Description: ${description}` : '',
		'The full current contents of every file are given below. This is the ONLY source of truth about the code —',
		'base every edit and every claim strictly on what is actually written here, never on assumptions about how these libraries are usually imported or wired.',
		'Do NOT invent or rewrite import paths, module names, exported symbols, or globals: reuse the exact import specifiers already present in these files (e.g. relative paths like ./config/common-config.js, or the CDN/global setup the example already relies on).',
		'If a change would need a symbol or module that is not already imported here, say so in plain text instead of guessing an import path.',
		'Current files:',
		contents,
		'Only call write_file or edit_file when the user explicitly asks you to change the code. For questions, reviews, or discussion, reply in plain text and do NOT call any tool. Prefer edit_file over rewriting a whole file, keep edits minimal, preserve the existing imports and structure, and explain what you changed.',
		'Write minimal, idiomatic code that follows the mapping library and MapColonies best practices — no dead code, no needless abstraction. Add a short comment above each logical section of the code explaining what that section does, so the example reads as teaching material.',
		'Keep your chat replies short and to the point: a few sentences or a short bullet list. Lead with the answer, skip preamble and restating the question, and do not dump full-file rewrites or long multi-section plans in chat. This brevity rule applies ONLY to your prose — never trade away correctness, needed detail, or completeness in the actual code you write.',
		exampleLibrary
			? 'REFERENCE MATERIAL follows: every other example in the playground. Your focus stays the CURRENT example above — never edit, migrate, or drift onto these other examples. Use them only as a trusted source of correct patterns, idioms, and MapColonies wiring to give better answers and code for the current example.'
			: '',
		exampleLibrary || ''
	]
		.filter(Boolean)
		.join('\n');
}

// Coerce provider-supplied tool arguments (JSON string, parsed object, or
// garbage) into a plain object; non-objects collapse to {}.
function normalizeToolArgs(raw: string | Record<string, unknown> | undefined): Record<string, unknown> {
	let value: unknown = raw;
	if (typeof raw === 'string') {
		try {
			value = JSON.parse(raw || '{}');
		} catch {
			value = {};
		}
	}
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

export async function runAgent(opts: {
	files: File[];
	messages: ChatMessage[];
	config: AgentConfig;
	demoName?: string;
	description?: string;
	exampleLibrary?: string;
	portalUrl?: string;
}): Promise<{ reply: string; files: File[] }> {
	const { config } = opts;
	const doFetch = config.fetchFn ?? fetch;
	const maxIterations = config.maxIterations ?? 8;
	let files = opts.files;

	const convo: LlmMessage[] = [
		{
			role: 'system',
			content: systemPrompt(
				files,
				opts.demoName,
				opts.description,
				opts.exampleLibrary,
				opts.portalUrl
			)
		},
		...opts.messages.map((m) => ({ role: m.role, content: m.content }))
	];
	// Everything appended from here on belongs to THIS run; the fallback below
	// must not surface stale assistant text carried in from prior turns.
	const runStart = convo.length;

	for (let i = 0; i < maxIterations; i++) {
		// Rebuild the system prompt so its file list reflects edits applied so far.
		convo[0] = {
			role: 'system',
			content: systemPrompt(
				files,
				opts.demoName,
				opts.description,
				opts.exampleLibrary,
				opts.portalUrl
			)
		};
		// Last step: drop `tools` so the model must answer in plain text.
		// tool_choice:'none' isn't honored everywhere (Cohere via LiteLLM ignores
		// it), so omitting tools is the only reliable way to stop another tool call.
		const isLastStep = i === maxIterations - 1;
		const res = await doFetch(`${config.baseUrl}/v1/chat/completions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
			body: JSON.stringify(
				isLastStep
					? { model: config.model, messages: convo }
					: { model: config.model, messages: convo, tools: TOOLS }
			)
		});
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(`llm request failed: ${res.status} ${body}`.trim());
		}
		const data = await res.json();
		const choice = data.choices?.[0]?.message as LlmMessage | undefined;
		if (!choice) throw new Error('llm response missing message');

		const toolCalls = choice.tool_calls ?? [];
		// Stringify each tool call's arguments: some providers (Cohere via LiteLLM)
		// reject the echoed turn unless arguments is a stringified JSON object. Same
		// pass produces the parsed args handed to applyTool.
		const parsedArgs = toolCalls.map((call) => {
			const args = normalizeToolArgs(call.function.arguments);
			call.function.arguments = JSON.stringify(args);
			return args;
		});
		convo.push(choice);

		if (toolCalls.length === 0) {
			return { reply: choice.content ?? '', files };
		}

		toolCalls.forEach((call, idx) => {
			const applied = applyTool(files, call.function.name, parsedArgs[idx]);
			files = applied.files;
			convo.push({ role: 'tool', tool_call_id: call.id, content: applied.result });
		});
	}

	const lastText =
		convo
			.slice(runStart)
			.reverse()
			.find((m) => m.role === 'assistant' && m.content)?.content ?? '';
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

// Summarize a chat history. No tools offered, so it can't edit files.
export async function summarizeConversation(opts: {
	messages: ChatMessage[];
	config: AgentConfig;
}): Promise<string> {
	const { config } = opts;
	const doFetch = config.fetchFn ?? fetch;
	const convo = [
		{
			role: 'system',
			content:
				'Summarize the following conversation concisely, preserving the decisions made and any changes to the demo files. Output only the summary text.'
		},
		...opts.messages.map((m) => ({ role: m.role, content: m.content }))
	];
	const res = await doFetch(`${config.baseUrl}/v1/chat/completions`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
		body: JSON.stringify({ model: config.model, messages: convo })
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`summarize request failed: ${res.status} ${body}`.trim());
	}
	const data = await res.json();
	return (data.choices?.[0]?.message?.content ?? '') as string;
}
