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
			props: { files, onFilesChange, demoName: 'demo', description: 'd' }
		});

		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());

		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'zoom in' }
		});
		await fireEvent.click(getByText('Send'));

		await waitFor(() => expect(onFilesChange).toHaveBeenCalledWith(changed));
	});

	it('renders restored history and fires onMessagesChange for user + assistant turns', async () => {
		vi.stubGlobal('fetch', mockFetch({ reply: 'added it', files }));
		const onMessagesChange = vi.fn();
		const restored = [{ role: 'user' as const, content: 'earlier question' }];
		const { getByPlaceholderText, getByText, findByText } = render(AgentChat, {
			props: { files, onFilesChange: vi.fn(), messages: restored, onMessagesChange }
		});

		// Restored thread is shown on mount.
		await findByText('earlier question');
		await waitFor(() => expect(getByText('gpt-4o')).toBeInTheDocument());

		await fireEvent.input(getByPlaceholderText('Ask the agent to edit this demo…'), {
			target: { value: 'now this' }
		});
		await fireEvent.click(getByText('Send'));

		// Optimistic user append, then the assistant reply — both persisted via the callback.
		await waitFor(() =>
			expect(onMessagesChange).toHaveBeenLastCalledWith([
				{ role: 'user', content: 'earlier question' },
				{ role: 'user', content: 'now this' },
				{ role: 'assistant', content: 'added it' }
			])
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
});
