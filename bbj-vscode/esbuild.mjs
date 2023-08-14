//@ts-check
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const nodeCtx = await esbuild.context({
    entryPoints: ['src/extension.ts', 'src/language/main.ts'],
    outdir: 'out',
    bundle: true,
    target: "es6",
    loader: { '.ts': 'ts' },
    external: ['vscode'], // the vscode-module is created on-the-fly and must be excluded.
    platform: 'node', // VSCode extensions run in a node process
    sourcemap: !minify,
    minify
});

const browserCtx = await esbuild.context({
    entryPoints: ['src/language/main-browser.ts', 'src/editor/monaco-editor.ts'],
    outdir: 'public',
    bundle: true,
    target: "es6",
    format: 'iife',
    loader: {
        '.ts': 'ts',
        '.ttf': 'dataurl',
    },
    platform: 'browser',
    sourcemap: !minify,
    minify
});

if (watch) {
    Promise.all([
        nodeCtx.watch(),
        browserCtx.watch()
    ]);
} else {
    await nodeCtx.rebuild();
    await browserCtx.rebuild();
    nodeCtx.dispose();
    browserCtx.dispose();
}
