/**
 * Monaco Editor worker setup for Vite.
 *
 * Without this, Monaco inlines all language workers as blob URLs into the
 * main bundle (~10 MB extra). With this, Vite extracts each worker into its
 * own chunk that is fetched and cached on demand — only when the user opens
 * a file of that language type.
 */

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).MonacoEnvironment = {
  getWorker(_: string, label: string): Worker {
    if (label === 'json') return new jsonWorker();
    if (['css', 'scss', 'less'].includes(label)) return new cssWorker();
    if (['html', 'handlebars', 'razor'].includes(label)) return new htmlWorker();
    if (['typescript', 'javascript'].includes(label)) return new tsWorker();
    return new editorWorker();
  },
};
