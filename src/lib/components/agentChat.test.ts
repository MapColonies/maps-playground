import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import AgentChat from './agentChat.svelte';
import type { File } from '$lib/types';

const files: File[] = [{ name: 'index.js', content: 'const zoom = 4;' }];

function mockFetch(agentResponse: unknown) {
	return vi.fn(async (url: string) => {
		if (String(url).endsWith('/api/agent/models')) {
			return {
				ok: true,
				json: async () => ({ models: ['gpt-4o'], default: 'gpt-4o' })
			} as Response;
		}
		return { ok: true, json: async () => agentResponse } as Response;
	});
}

describe('agentChat.svelte', () => {
	it('loads models on mount and fires onFilesChange when files change', async () => {
		const changed: File[] = [{ name: 'index.js', content: 'const zoom = 8;' }];
		vi.stubGlobal('fetch', mockFetch({ reply: 'done', files: changed }));
		const onFilesChange = vi.fn();
		const { getByPlaceholderText, getByText } = render(AgentChat, {
			props: { files, onFilesChange, fileCacheKey: 'file:A', demoName: 'demo', description: 'd' }
		});

		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());

		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'zoom in' }
		});
		await fireEvent.click(getByText('Send'));

		await waitFor(() => expect(onFilesChange).toHaveBeenCalledWith(changed, 'file:A'));
	});

	it('renders restored history and fires onMessagesChange for user + assistant turns', async () => {
		vi.stubGlobal('fetch', mockFetch({ reply: 'added it', files }));
		const onMessagesChange = vi.fn();
		const restored = [{ role: 'user' as const, content: 'earlier question' }];
		const { getByPlaceholderText, getByText, findByText } = render(AgentChat, {
			props: {
				files,
				onFilesChange: vi.fn(),
				messages: restored,
				onMessagesChange,
				chatCacheKey: 'chat:A'
			}
		});

		// Restored thread is shown on mount.
		await findByText('earlier question');
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());

		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'now this' }
		});
		await fireEvent.click(getByText('Send'));

		// Optimistic user append, then the assistant reply — both persisted with the origin key.
		await waitFor(() =>
			expect(onMessagesChange).toHaveBeenLastCalledWith(
				[
					{ role: 'user', content: 'earlier question' },
					{ role: 'user', content: 'now this' },
					{ role: 'assistant', content: 'added it' }
				],
				'chat:A'
			)
		);
	});

	it('commits a late response to the example it was asked from, not the current one', async () => {
		let releaseAgent: () => void = () => undefined;
		const gate = new Promise<void>((res) => (releaseAgent = res));
		const fetchMock = vi.fn(async (url: string) => {
			if (String(url).endsWith('/api/agent/models')) {
				return {
					ok: true,
					json: async () => ({ models: ['gpt-4o'], default: 'gpt-4o' })
				} as Response;
			}
			await gate; // hold the agent response open until we've navigated away
			return { ok: true, json: async () => ({ reply: 'late reply', files }) } as Response;
		});
		vi.stubGlobal('fetch', fetchMock);
		const onMessagesChange = vi.fn();
		const { getByPlaceholderText, getByText, queryByText, component } = render(AgentChat, {
			props: {
				files,
				onFilesChange: vi.fn(),
				messages: [],
				onMessagesChange,
				chatCacheKey: 'chat:A'
			}
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());

		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'question on A' }
		});
		await fireEvent.click(getByText('Send'));
		expect(getByText('Thinking…')).toBeInTheDocument();
		// Send is locked on the waiting example.
		expect((getByText('Send') as HTMLButtonElement).disabled).toBe(true);

		// Simulate navigating to example B while the request is still in flight.
		component.$set({ chatCacheKey: 'chat:B', messages: [] });
		// The "Thinking…" indicator belongs to A, not the now-visible B.
		await waitFor(() => expect(queryByText('Thinking…')).toBeNull());
		// Send is usable on B even though A is still in flight.
		expect((getByText('Send') as HTMLButtonElement).disabled).toBe(false);

		releaseAgent();
		await waitFor(() =>
			expect(onMessagesChange).toHaveBeenLastCalledWith(
				[
					{ role: 'user', content: 'question on A' },
					{ role: 'assistant', content: 'late reply' }
				],
				'chat:A'
			)
		);
	});

	it('shows an error banner when the request fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (String(url).endsWith('/api/agent/models')) {
					return {
						ok: true,
						json: async () => ({ models: ['gpt-4o'], default: 'gpt-4o' })
					} as Response;
				}
				return { ok: false, status: 502, json: async () => ({ message: 'boom' }) } as Response;
			})
		);
		const { getByPlaceholderText, getByText, findByText } = render(AgentChat, {
			props: { files, onFilesChange: vi.fn(), demoName: 'demo', description: 'd' }
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());
		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'go' }
		});
		await fireEvent.click(getByText('Send'));
		expect(await findByText(/request failed/i)).toBeInTheDocument();
	});

	it('sends only {name, content} even if the files prop carries extra/circular state', async () => {
		const captured: unknown[] = [];
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			if (String(url).endsWith('/api/agent/models')) {
				return {
					ok: true,
					json: async () => ({ models: ['gpt-4o'], default: 'gpt-4o' })
				} as Response;
			}
			captured.push(JSON.parse(String(init?.body)));
			return { ok: true, json: async () => ({ reply: 'ok', files: [] }) } as Response;
		});
		vi.stubGlobal('fetch', fetchMock);

		// Prop object polluted the way Flems/CodeMirror would (circular editor state).
		const polluted = { name: 'index.js', content: 'x' } as File & { doc?: unknown };
		const doc: { self?: unknown } = {};
		doc.self = doc;
		polluted.doc = doc;

		const { getByPlaceholderText, getByText } = render(AgentChat, {
			props: { files: [polluted], onFilesChange: vi.fn(), demoName: 'demo', description: 'd' }
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());
		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'go' }
		});
		await fireEvent.click(getByText('Send'));

		await waitFor(() => expect(captured).toHaveLength(1));
		expect((captured[0] as { files: unknown }).files).toEqual([{ name: 'index.js', content: 'x' }]);
	});

	it('shows slash-command autocomplete when typing "/"', async () => {
		vi.stubGlobal('fetch', mockFetch({ reply: 'x', files }));
		const { getByPlaceholderText, getByText, findByText } = render(AgentChat, {
			props: { files, onFilesChange: vi.fn(), demoName: 'demo', description: 'd' }
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());
		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: '/' }
		});
		expect(await findByText('/clear')).toBeInTheDocument();
		expect(getByText('/compact')).toBeInTheDocument();
	});

	it('/clear wipes the conversation for its example without calling the model', async () => {
		const fetchMock = mockFetch({ reply: 'should not happen', files });
		vi.stubGlobal('fetch', fetchMock);
		const onMessagesChange = vi.fn();
		const { getByPlaceholderText, getByText } = render(AgentChat, {
			props: {
				files,
				onFilesChange: vi.fn(),
				messages: [{ role: 'user', content: 'hi' }],
				onMessagesChange,
				chatCacheKey: 'chat:A'
			}
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());
		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: '/clear' }
		});
		await fireEvent.click(getByText('Send'));
		await waitFor(() => expect(onMessagesChange).toHaveBeenLastCalledWith([], 'chat:A'));
		// only the models fetch happened — never /api/agent
		expect(fetchMock.mock.calls.every((c) => !String(c[0]).endsWith('/api/agent'))).toBe(true);
	});

	it('/compact summarizes and replaces history for its example', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (String(url).endsWith('/api/agent/models')) {
				return {
					ok: true,
					json: async () => ({ models: ['gpt-4o'], default: 'gpt-4o' })
				} as Response;
			}
			if (String(url).endsWith('/api/agent/compact')) {
				return { ok: true, json: async () => ({ summary: 'user changed zoom to 8.' }) } as Response;
			}
			return { ok: true, json: async () => ({ reply: 'x', files }) } as Response;
		});
		vi.stubGlobal('fetch', fetchMock);
		const onMessagesChange = vi.fn();
		const { getByPlaceholderText, getByText } = render(AgentChat, {
			props: {
				files,
				onFilesChange: vi.fn(),
				messages: [
					{ role: 'user', content: 'set zoom to 8' },
					{ role: 'assistant', content: 'done' }
				],
				onMessagesChange,
				chatCacheKey: 'chat:A'
			}
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());
		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: '/compact' }
		});
		await fireEvent.click(getByText('Send'));
		await waitFor(() =>
			expect(onMessagesChange).toHaveBeenLastCalledWith(
				[
					{
						role: 'assistant',
						content: 'Summary of earlier conversation:\nuser changed zoom to 8.'
					}
				],
				'chat:A'
			)
		);
		expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith('/api/agent/compact'))).toBe(
			true
		);
	});

	it('the header info summary appears on hover', async () => {
		vi.stubGlobal('fetch', mockFetch({ reply: 'x', files }));
		const { getByText, getByLabelText, queryByText, findByText } = render(AgentChat, {
			props: { files, onFilesChange: vi.fn(), demoName: 'demo', description: 'd' }
		});
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());
		expect(queryByText('Chat commands')).toBeNull();
		const wrapper = getByLabelText('About chat commands').parentElement as HTMLElement;
		await fireEvent.mouseEnter(wrapper);
		expect(await findByText('Chat commands')).toBeInTheDocument();
		await fireEvent.mouseLeave(wrapper);
		await waitFor(() => expect(queryByText('Chat commands')).toBeNull());
	});
});
