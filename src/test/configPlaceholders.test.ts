import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Each environment uploads its own copy of these files, so committed values must be placeholders.
// Names ending in these suffixes hold protocol or catalog constants, which are the same everywhere.
const CONSTANT_SUFFIXES = ['_SCHEME', '_TYPE', '_FORMAT'];
const PLACEHOLDER = /^'[A-Z][A-Z0-9_]*'$/;
const EXPORT = /^export (?:var|let|const) (\w+) = (.+);$/;

const configDir = path.resolve('examples/config');
const configFiles = readdirSync(configDir).filter((file) => file.endsWith('.js'));

function literalExports(source: string) {
	return source
		.split('\n')
		.map((line) => EXPORT.exec(line.trim()))
		.filter((match): match is RegExpExecArray => match !== null)
		.map(([, name, value]) => ({ name, value }))
		.filter(({ value }) => !value.startsWith('`'));
}

describe('examples/config', () => {
	it('has config files to check', () => {
		expect(configFiles.length).toBeGreaterThan(0);
	});

	it.each(configFiles)('%s commits only placeholders for environment values', (file) => {
		const source = readFileSync(path.join(configDir, file), 'utf8');
		const realValues = literalExports(source)
			.filter(({ name }) => !CONSTANT_SUFFIXES.some((suffix) => name.endsWith(suffix)))
			.filter(({ value }) => !PLACEHOLDER.test(value))
			.map(({ name, value }) => `${name} = ${value}`);
		expect(realValues).toEqual([]);
	});
});
