# Conformance regression fixtures

Each `.bbj` file in this folder is a small synthetic program, written from scratch with invented
names, for one construct the language server was changed to accept so that it agrees with the
BBj compiler. Every file here must parse and validate with no error; `test/conformance-regressions.test.ts`
checks that for every fixture in this folder. When a fix lands for a new construct, add a new
fixture here — written from scratch, never copied from a customer program, a BASIS program, or
any external corpus.

## Where the real measurement lives

This folder protects individual fixed constructs from regressing. The actual conformance
measurement — running the language server over a large corpus of real-world BBj programs and
comparing its verdict against the BBj compiler's own — lives outside this repository, in the
private `bbj-corpus` repository. From a checkout of that repository:

```
cd conformance && npm install
node run.mjs --ls /path/to/bbj-language-server [--endpoint 127.0.0.1:5008]
```

Adding `--endpoint host:port` additionally sends every file to a real BBj `parseProgram`
endpoint (a live BBjServices whose `bbj-ls` offers `parseProgram` — BBj 26.03 or later) and
reports the invalid-code-with-no-error number with that verdict applied, alongside the
language server's own view.

This measurement is run locally, at milestone and phase boundaries, and is never part of CI —
the corpus holds internal and third-party code that cannot be published. See the corpus
repository's own README for the full procedure.
