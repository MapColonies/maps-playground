// Registers @testing-library/jest-dom's custom matchers (toBeInTheDocument, etc.)
// on Vitest's `expect` for the TYPE checker. The runtime registration happens in
// vitest-setup.ts; this ambient import brings the matching type augmentation into
// svelte-check's program (vitest-setup.ts at the repo root is outside its include).
import '@testing-library/jest-dom/vitest';
