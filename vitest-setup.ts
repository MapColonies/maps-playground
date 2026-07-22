import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	// `localStorage` only exists under the jsdom environment. Node-env test files
	// (e.g. server-side metrics tests) share this teardown but have no jsdom globals.
	if (typeof localStorage !== 'undefined') {
		localStorage.clear();
	}
});
