//@ts-check
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const ctx = await esbuild.context({
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

if (watch) {
    await ctx.watch();
} else {
    await ctx.rebuild();
    ctx.dispose();
}
