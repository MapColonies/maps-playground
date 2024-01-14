<script lang="ts">
	import type monaco from 'monaco-editor';
	import { createEventDispatcher, onMount } from 'svelte';
	import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
	import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
	import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
	import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
	import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

	const dispatch = createEventDispatcher();
	export let content: string = 'avi';
	export let language: string | undefined;

	let divEl: HTMLDivElement;
	let editor: monaco.editor.IStandaloneCodeEditor;
	// @ts-ignore
	let Monaco;

	let changeTimeoutId: NodeJS.Timeout | undefined;

	$: {
		if (editor !== undefined) {
			const model = editor.getModel();
			if (model !== null && editor.getValue() !== content) {
				editor.setValue(content);
				//@ts-ignore
				Monaco.editor.setModelLanguage(editor.getModel(), language);
			}
		}
	}

	onMount(async () => {
		// @ts-ignore
		self.MonacoEnvironment = {
			getWorker: function (_moduleId: any, label: string) {
				if (label === 'json') {
					return new jsonWorker();
				}
				if (label === 'css' || label === 'scss' || label === 'less') {
					return new cssWorker();
				}
				if (label === 'html' || label === 'handlebars' || label === 'razor') {
					return new htmlWorker();
				}
				if (label === 'typescript' || label === 'javascript') {
					return new tsWorker();
				}
				return new editorWorker();
			}
		};

		Monaco = await import('monaco-editor');
		editor = Monaco.editor.create(divEl, {
			value: content,
			language,
			lineNumbers: 'on',
			theme: 'vs-dark'
		});
		editor.onDidChangeModelContent((e) => {
			if (changeTimeoutId) {
				clearTimeout(changeTimeoutId);
			}

			changeTimeoutId = setTimeout(() => {
				const model = editor.getModel();
				if (model?.getValue() !== content) {
					dispatch('change', model?.getValue());
				}
				changeTimeoutId = undefined;
			}, 1000);
		});

		return () => {
			editor.dispose();
		};
	});
</script>

<div bind:this={divEl} class="h-full" />
