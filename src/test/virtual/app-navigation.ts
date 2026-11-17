// Test double for SvelteKit's $app/navigation. Real navigation is a no-op under
// jsdom; tests that care about goto can spy on this export.
export function goto(): Promise<void> {
	return Promise.resolve();
}
