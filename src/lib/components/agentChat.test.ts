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
});
