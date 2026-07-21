import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

afterEach(() => {
	// Restore mocks/globals BEFORE touching localStorage: a test may stub
	// localStorage to undefined (SSR guard), so unstub first, then clear the
	// real storage. Order matters — clearing first would throw on the stub.
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
});
