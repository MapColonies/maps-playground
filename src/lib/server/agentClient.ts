import type { File } from '$lib/types';

export function applyTool(
	files: File[],
	name: string,
	args: Record<string, unknown>
): { files: File[]; result: string } {
	if (name === 'write_file') {
		const fname = String(args.name ?? '');
		const content = String(args.content ?? '');
		if (!fname) return { files, result: 'error: name is required' };
		const idx = files.findIndex((f) => f.name === fname);
		const next =
			idx === -1
				? [...files, { name: fname, content }]
				: files.map((f, i) => (i === idx ? { name: fname, content } : f));
		return { files: next, result: `ok: wrote ${fname}` };
	}

	if (name === 'edit_file') {
		const fname = String(args.name ?? '');
		const oldStr = String(args.old_string ?? '');
		const newStr = String(args.new_string ?? '');
		const file = files.find((f) => f.name === fname);
		if (!file) return { files, result: `error: file ${fname} not found` };
		const count = oldStr === '' ? 0 : file.content.split(oldStr).length - 1;
		if (count === 0) return { files, result: `error: old_string not found in ${fname}` };
		if (count > 1) return { files, result: `error: old_string not unique in ${fname} (${count} matches)` };
		const next = files.map((f) =>
			f.name === fname ? { name: f.name, content: f.content.replace(oldStr, newStr) } : f
		);
		return { files: next, result: `ok: edited ${fname}` };
	}

	return { files, result: `error: unknown tool ${name}` };
}
