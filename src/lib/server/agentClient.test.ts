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

	it('respects the iteration cap', async () => {
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
		const { fn } = mockFetchSequence([toolResp, toolResp, toolResp]);
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
