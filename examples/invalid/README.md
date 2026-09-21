# examples/invalid

Every program in this folder fails to compile on purpose. Each one keeps the issue-numbered
name it had in `examples/` before it moved here, and demonstrates a construct that the real
BBj compiler rejects — either because the construct's whole point is the rejected shape, or
because a valid BBj program that once lived here split into a compiling half (which stayed
under its original name in `examples/`) and an erroneous half (which moved here).

## What each file demonstrates

- `dim-examples-substring-expressions.bbj` — three bare substring-access expressions used as
  standalone statements (`A$(1,5)`, `NAME$(10)`, `XYZ$[3,4](1,5)`, each followed by a `rem`
  comment naming the construct). The language server's grammar accepts a bare expression as a
  statement, but `bbjcpl` does not; this file keeps that disagreement visible. Split out of
  `dim-examples.bbj`, whose remaining body compiles clean.

## Sidecar format

Every `<name>.bbj` file in this folder has a matching `<name>.expected.json` sidecar. Every
sidecar has a matching `.bbj` file — the pairing is checked in both directions, and an empty
folder fails the always-on test rather than passing vacuously.

A sidecar is a JSON object with two keys:

```json
{
  "reason": "one short sentence: why this file is deliberately invalid",
  "diagnostics": "none-today"
}
```

`diagnostics` is either:

- the literal string `"none-today"` — the language server produces no diagnostic at all for
  this construct (the always-on layer only parses and validates; it cannot see what the real
  compiler sees). This is an explicit marker, not an empty list, so the gap — "this construct
  is invalid but nothing in the editor tells you" — stays visible in the tracked sidecar
  instead of silently passing because the loop happened to iterate zero times; or
- an array of expected diagnostics the language server's own parse/validation pass actually
  raises for this file, each shaped `{ "line": <1-based source line>, "severity": "error" |
  "warning", "messageFragment": "<substring to match, not the whole message>" }`.

## The two test layers

`bbj-vscode/test/examples-compile.test.ts` asserts this folder from two angles:

- **always-on** (always runs): every file here has a sidecar (and vice versa), the folder is
  non-empty, and every sidecar's `diagnostics` entry is honoured — either the literal
  `"none-today"` marker, or every listed diagnostic is actually found by the language server's
  parser/validator.
- **BBj-gated** (`RUN_BBJ_TESTS=1`, needs a local BBj install): every file here is compiled with
  `bbjcpl` and asserted to produce a non-empty combined stdout+stderr — i.e. the compiler
  genuinely rejects it, the same way it did before the file moved here.

No requirement, plan or decision identifier appears in this file or in any file it lists.
GitHub issue numbers, already part of these files' names, are fine.
