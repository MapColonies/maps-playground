import { describe, it, expect } from 'vitest';
import { applyTool } from './agentClient';
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
