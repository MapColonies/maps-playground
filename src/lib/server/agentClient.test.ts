import { describe, it, expect, vi } from 'vitest';
import { applyTool, runAgent, fetchModels, summarizeConversation } from './agentClient';
import type { File } from '$lib/types';

const base: File[] = [{ name: 'index.js', content: 'const zoom = 4;\n' }];

describe('applyTool', () => {
	it('write_file replaces an existing file', () => {
		const { files, result } = applyTool(base, 'write_file', { name: 'index.js', content: 'x' });
		expect(files).toEqual([{ name: 'index.js', content: 'x' }]);
		expect(result).toMatch(/ok/);
	});

	it('write_file appends a new file', () => {
		const { files } = applyTool(base, 'write_file', { name: 'style.css', content: 'a{}' });
		expect(files).toHaveLength(2);
		expect(files[1]).toEqual({ name: 'style.css', content: 'a{}' });
	});

	it('edit_file replaces a unique snippet', () => {
		const { files, result } = applyTool(base, 'edit_file', {
			name: 'index.js',
			old_string: 'zoom = 4',
			new_string: 'zoom = 8'
		});
		expect(files[0].content).toBe('const zoom = 8;\n');
		expect(result).toMatch(/ok/);
	});

	it('edit_file errors when old_string is missing', () => {
		const { files, result } = applyTool(base, 'edit_file', {
			name: 'index.js',
			old_string: 'nope',
			new_string: 'x'
		});
		expect(files).toEqual(base);
		expect(result).toMatch(/not found/);
	});

	it('edit_file errors when old_string is not unique', () => {
		const dup: File[] = [{ name: 'a.js', content: 'x x' }];
		const { files, result } = applyTool(dup, 'edit_file', {
			name: 'a.js',
			old_string: 'x',
			new_string: 'y'
		});
		expect(files).toEqual(dup);
		expect(result).toMatch(/not unique/);
	});

	it('errors on unknown file and unknown tool', () => {
		expect(
			applyTool(base, 'edit_file', { name: 'missing.js', old_string: 'a', new_string: 'b' }).result
		).toMatch(/not found/);
		expect(applyTool(base, 'delete_file', {}).result).toMatch(/unknown tool/);
	});
});

function mockFetchSequence(responses: unknown[]) {
	const calls: any[] = [];
	const fn = vi.fn(async (_url: string, init: any) => {
		calls.push(JSON.parse(init.body));
		return { ok: true, json: async () => responses.shift() } as Response;
	});
	return { fn, calls };
}

const cfg = (fetchFn: any) => ({ baseUrl: 'http://p', apiKey: 'k', model: 'm', fetchFn });

describe('runAgent', () => {
	it('returns reply with no tools and leaves files unchanged', async () => {
		const { fn } = mockFetchSequence([
			{ choices: [{ message: { role: 'assistant', content: 'hello' } }] }
		]);
		const files = [{ name: 'a.js', content: '1' }];
		const out = await runAgent({
			files,
			messages: [{ role: 'user', content: 'hi' }],
			config: cfg(fn)
		});
		expect(out.reply).toBe('hello');
		expect(out.files).toEqual(files);
	});

	it('feeds the full file contents to the model, not just names', async () => {
		const { fn, calls } = mockFetchSequence([
			{ choices: [{ message: { role: 'assistant', content: 'ok' } }] }
		]);
		await runAgent({
			files: [{ name: 'wmts.js', content: "import { TOKEN } from './config/common-config.js';" }],
			messages: [{ role: 'user', content: 'suggest improvements' }],
			config: cfg(fn)
		});
		const system = calls[0].messages[0].content;
		expect(system).toContain('wmts.js');
		// the actual code — including its real import path — must be visible
		expect(system).toContain("import { TOKEN } from './config/common-config.js';");
	});

	it('applies a tool call then returns the final reply', async () => {
		const { fn } = mockFetchSequence([
			{
				choices: [
					{
						message: {
							role: 'assistant',
							content: null,
							tool_calls: [
								{
									id: 't1',
									type: 'function',
									function: {
										name: 'edit_file',
										arguments: JSON.stringify({ name: 'a.js', old_string: '1', new_string: '2' })
									}
								}
							]
						}
					}
				]
			},
			{ choices: [{ message: { role: 'assistant', content: 'done' } }] }
		]);
		const out = await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [{ role: 'user', content: 'change it' }],
			config: cfg(fn)
		});
		expect(out.reply).toBe('done');
		expect(out.files).toEqual([{ name: 'a.js', content: '2' }]);
	});

	it('normalizes object tool arguments so they replay as a JSON string', async () => {
		// Cohere-style: arguments arrives as a parsed object, not a string.
		const { fn, calls } = mockFetchSequence([
			{
				choices: [
					{
						message: {
							role: 'assistant',
							content: null,
							tool_calls: [
								{
									id: 't1',
									type: 'function',
									function: {
										name: 'edit_file',
										arguments: { name: 'a.js', old_string: '1', new_string: '2' }
									}
								}
							]
						}
					}
				]
			},
			{ choices: [{ message: { role: 'assistant', content: 'done' } }] }
		]);
		const out = await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [{ role: 'user', content: 'apply it' }],
			config: cfg(fn)
		});
		// the edit still applied from the object args
		expect(out.files).toEqual([{ name: 'a.js', content: '2' }]);
		// and the echoed assistant turn carries arguments as a string, not an object
		const echoed = calls[1].messages.find((m: any) => m.role === 'assistant' && m.tool_calls);
		expect(typeof echoed.tool_calls[0].function.arguments).toBe('string');
	});

	it('re-serializes empty/garbage tool arguments to a JSON object string', async () => {
		// arguments = '' would 400 as "not a stringified JSON object" on replay.
		const { fn, calls } = mockFetchSequence([
			{
				choices: [
					{
						message: {
							role: 'assistant',
							content: null,
							tool_calls: [
								{ id: 't1', type: 'function', function: { name: 'write_file', arguments: '' } }
							]
						}
					}
				]
			},
			{ choices: [{ message: { role: 'assistant', content: 'done' } }] }
		]);
		await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [{ role: 'user', content: 'go' }],
			config: cfg(fn)
		});
		const echoed = calls[1].messages.find((m: any) => m.role === 'assistant' && m.tool_calls);
		const replayed = echoed.tool_calls[0].function.arguments;
		expect(typeof replayed).toBe('string');
		// a stringified JSON *object*, parseable and non-array
		expect(JSON.parse(replayed)).toEqual({});
	});

	it('feeds a tool error back and keeps looping', async () => {
		const { fn, calls } = mockFetchSequence([
			{
				choices: [
					{
						message: {
							role: 'assistant',
							content: null,
							tool_calls: [
								{
									id: 't1',
									type: 'function',
									function: {
										name: 'edit_file',
										arguments: JSON.stringify({ name: 'a.js', old_string: 'nope', new_string: 'x' })
									}
								}
							]
						}
					}
				]
			},
			{ choices: [{ message: { role: 'assistant', content: 'sorry' } }] }
		]);
		const out = await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [{ role: 'user', content: 'go' }],
			config: cfg(fn)
		});
		expect(out.reply).toBe('sorry');
		// second request must include a tool message carrying the error
		const toolMsg = calls[1].messages.find((m: any) => m.role === 'tool');
		expect(toolMsg.content).toMatch(/not found/);
	});

	it('withholds tools on the final step so the model must answer in text', async () => {
		const toolResp = {
			choices: [
				{
					message: {
						role: 'assistant',
						content: 'still going',
						tool_calls: [
							{
								id: 'x',
								type: 'function',
								function: {
									name: 'write_file',
									arguments: JSON.stringify({ name: 'a.js', content: 'z' })
								}
							}
						]
					}
				}
			]
		};
		// Second (final) call has tool_choice 'none', so the model returns prose.
		const textResp = { choices: [{ message: { role: 'assistant', content: 'here is my advice' } }] };
		const { fn, calls } = mockFetchSequence([toolResp, textResp]);
		const out = await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [{ role: 'user', content: 'how can I improve this?' }],
			config: { ...cfg(fn), maxIterations: 2 }
		});
		expect(fn).toHaveBeenCalledTimes(2);
		// first step offers tools, last step omits them entirely (no provider can
		// return another tool call, regardless of tool_choice support)
		expect(calls[0].tools).toBeDefined();
		expect(calls[1].tools).toBeUndefined();
		// user gets a real answer, not the bare tool-limit stub
		expect(out.reply).toBe('here is my advice');
	});

	it('does not surface prior-turn assistant text in the cap note', async () => {
		const toolResp = {
			choices: [
				{
					message: {
						role: 'assistant',
						content: null,
						tool_calls: [
							{
								id: 'x',
								type: 'function',
								function: {
									name: 'write_file',
									arguments: JSON.stringify({ name: 'a.js', content: 'z' })
								}
							}
						]
					}
				}
			]
		};
		const { fn } = mockFetchSequence([toolResp, toolResp]);
		const out = await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [
				{ role: 'user', content: 'earlier ask' },
				{ role: 'assistant', content: 'STALE previous reply' },
				{ role: 'user', content: 'now do it' }
			],
			config: { ...cfg(fn), maxIterations: 2 }
		});
		// the cap note must not echo the earlier assistant turn from history
		expect(out.reply).not.toMatch(/STALE previous reply/);
		expect(out.reply).toMatch(/tool limit/i);
	});

	it('falls back to the cap note if the model still emits only tool calls', async () => {
		const toolResp = {
			choices: [
				{
					message: {
						role: 'assistant',
						content: 'still going',
						tool_calls: [
							{
								id: 'x',
								type: 'function',
								function: {
									name: 'write_file',
									arguments: JSON.stringify({ name: 'a.js', content: 'z' })
								}
							}
						]
					}
				}
			]
		};
		const { fn } = mockFetchSequence([toolResp, toolResp]);
		const out = await runAgent({
			files: [{ name: 'a.js', content: '1' }],
			messages: [{ role: 'user', content: 'go' }],
			config: { ...cfg(fn), maxIterations: 2 }
		});
		expect(fn).toHaveBeenCalledTimes(2);
		expect(out.reply).toMatch(/tool limit/i);
		expect(out.reply).toMatch(/still going/);
	});

	it('throws on a non-ok response', async () => {
		const fn = vi.fn(
			async () =>
				({ ok: false, status: 500, text: async () => 'server boom' } as unknown as Response)
		);
		await expect(
			runAgent({ files: [], messages: [{ role: 'user', content: 'x' }], config: cfg(fn) })
		).rejects.toThrow(/500/);
	});
});

describe('fetchModels', () => {
	it('maps the OpenAI models payload to id strings', async () => {
		const fn = vi.fn(
			async () =>
				({
					ok: true,
					json: async () => ({ data: [{ id: 'gpt-4o' }, { id: 'claude-sonnet' }] })
				} as Response)
		);
		const ids = await fetchModels({ baseUrl: 'http://p', apiKey: 'k', fetchFn: fn });
		expect(ids).toEqual(['gpt-4o', 'claude-sonnet']);
	});

	it('throws on a non-ok response', async () => {
		const fn = vi.fn(async () => ({ ok: false, status: 401 } as Response));
		await expect(fetchModels({ baseUrl: 'http://p', apiKey: 'k', fetchFn: fn })).rejects.toThrow(
			/401/
		);
	});
});

describe('summarizeConversation', () => {
	it('summarizes with no tools and returns the content', async () => {
		const { fn, calls } = mockFetchSequence([
			{ choices: [{ message: { role: 'assistant', content: 'Summary: did X and Y.' } }] }
		]);
		const out = await summarizeConversation({
			messages: [
				{ role: 'user', content: 'a' },
				{ role: 'assistant', content: 'b' }
			],
			config: cfg(fn)
		});
		expect(out).toBe('Summary: did X and Y.');
		// summarization must not offer tools — it should never edit files
		expect(calls[0].tools).toBeUndefined();
	});

	it('throws on a non-ok response', async () => {
		const fn = vi.fn(
			async () => ({ ok: false, status: 500, text: async () => 'boom' } as unknown as Response)
		);
		await expect(
			summarizeConversation({ messages: [{ role: 'user', content: 'a' }], config: cfg(fn) })
		).rejects.toThrow(/500/);
	});
});
