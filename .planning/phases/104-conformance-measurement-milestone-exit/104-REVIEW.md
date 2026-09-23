---
phase: 104-conformance-measurement-milestone-exit
reviewed: 2026-09-23T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - bbj-vscode/test/test-data/conformance/README.md
  - /home/coder/repos/bbj-corpus/conformance/run.mjs
  - /home/coder/repos/bbj-corpus/conformance/worker.mts
  - /home/coder/repos/bbj-corpus/conformance/leak-guard.mjs
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 104: Code Review Report

**Reviewed:** 2026-09-23
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the public-repo README pointer plus the three private `bbj-corpus/conformance` harness
files phase 104 extended (`--endpoint`/`--data`, the `parseProgram` call/retry/reconciliation path
in `worker.mts`, the classification/summary/history/report additions in `run.mjs`, and the new
`leak-guard.mjs`), diffed against `cdaf3761` to scope the read to the changed material.

The flag-off (no `--endpoint`) code path was traced end to end in both `run.mjs` and `worker.mts`:
every new branch is gated behind `if (endpoint)`/`...(endpoint ? {...} : {})`, the summary object's
key order is unchanged when the spreads contribute no keys, and the per-job result shape is
unchanged when `endpoint` is the empty string. That guarantee holds.

The one Critical finding is in `leak-guard.mjs`: its containment-based pattern matching has two
concrete false-negative gaps against exactly the leak vector it exists to prevent — a maintainer
pasting an excerpt from `REPORT.md` into a public phase document. Two Warnings concern
`worker.mts`'s endpoint-retry connection handling and a reporting-accuracy gap where a Langium-only
fallback is exposed under the same field name as a real endpoint verdict. Two Info items are minor
documentation/robustness notes.

## Critical Issues

### CR-01: leak-guard.mjs's substring matching has false negatives against the exact text a maintainer would paste from REPORT.md

**File:** `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs:60-69, 81-95, 107-121`
**Issue:**

`leak-guard.mjs` collects "corpus source line" patterns from two places and matches them against a
target file with a plain per-line `line.includes(pattern)`:

```js
// pattern source 1: raw, untruncated text from manifest.jsonl/rejects.jsonl
if (typeof error.source === 'string' && error.source.trim().length >= 15) {
    addPattern(error.source, 'corpus source line');
}
// pattern source 2: this script's own details.json, walked recursively
if (key === 'source' && typeof value === 'string') {
    if (value.trim().length >= 15) addPattern(value, 'corpus source line');
}
...
for (const { text: pattern, kind } of patterns) {
    if (line.includes(pattern)) { ... }
}
```

Both pattern sources can carry more text than what actually ends up quoted in a public document,
because `run.mjs`'s own `code()` helper — the thing that puts corpus source excerpts into
`REPORT.md` in the first place — truncates to 110 characters and substitutes backticks:

```js
// run.mjs:192
const code = text => '`' + String(text ?? '').trim().replace(/`/g, "'").slice(0, 110) + '`';
```

Two independent ways this produces a false negative when a maintainer copies a `REPORT.md`
excerpt into a public file (exactly the workflow this phase's own conformance-measurement doc
follows):

1. **Truncation mismatch.** `details.json`'s `source` fields are pre-truncated to 200 chars by
   `worker.mts` (`.slice(0, 200)`), and raw `manifest.jsonl`/`rejects.jsonl` `error.source` values
   are not truncated at all. If the underlying source line is longer than 110 characters, the text
   that actually appears in `REPORT.md` (and thus in whatever a human pastes from it) is only the
   first 110 characters — a strict prefix of the stored pattern. `line.includes(pattern)` requires
   the *full* pattern to occur in the line, so a 110-char prefix of a 150-or-200-char pattern is
   never detected. BBj lines commonly exceed 110 characters (multiple statements per line is
   idiomatic), so this is not an edge case.
2. **Backtick substitution.** Any source line containing a backtick has that backtick replaced with
   `'` by `code()` before it reaches `REPORT.md`. The stored pattern still has the original
   backtick, so even a full-length (≤110 char), otherwise-exact copy will fail `.includes()`.

Either gap independently means the tool can report `clean: <file>` for a file that actually leaked
corpus-derived source text — the opposite of the tool's stated purpose ("Never prints the matched
text itself" implies it is expected to *always* catch it; the header explicitly says false
negatives are the danger here).

**Fix:** Normalize both sides the same way before comparing, and match on the leak vector that can
actually reach a public file (a possibly-truncated, backtick-substituted prefix), not just
byte-for-byte full-pattern containment. For example:

```js
// mirror run.mjs's code() transform when building/comparing patterns
const REPORT_TRUNCATE = 110;
const normalize = text => text.replace(/`/g, "'");

const addPattern = (text, kind) => {
    if (text === undefined || text === null) return;
    const trimmed = normalize(String(text).trim());
    if (trimmed.length === 0) return;
    // store both the full pattern and the report-truncated prefix that can actually appear
    for (const candidate of [trimmed, trimmed.slice(0, REPORT_TRUNCATE)]) {
        if (candidate.length < 15) continue;
        const key = `${kind}\0${candidate}`;
        if (seen.has(key)) continue;
        seen.add(key);
        patterns.push({ text: candidate, kind });
    }
};
```

and normalize each scanned line with the same backtick substitution before calling `.includes()`
(or match case/backtick-insensitively). Add a regression fixture: a >110-char corpus-shaped source
line with an embedded backtick, run through `run.mjs`'s `code()`, then through `leak-guard.mjs`,
asserting a `LEAK` is reported.

## Warnings

### WR-01: Endpoint retry can leave a stale in-flight request on the shard's single connection

**File:** `/home/coder/repos/bbj-corpus/conformance/worker.mts:79-130`
**Issue:** The design comment states the harness uses "one dedicated connection per shard" with
jobs "awaited sequentially" (never `Promise.all`). `callParseProgram` races the real request
against a 60s watchdog and, on watchdog expiry, returns `{ ok: false, kind: 'watchdog' }` without
cancelling the underlying request:

```ts
const watchdog = new Promise((_resolve, reject) => {
    watchdogTimer = setTimeout(() => reject({ __watchdog: true }), PARSE_WATCHDOG_MS);
});
...
requestPromise.catch(() => { /* surfaced to the caller via the race below */ });
```

When `'watchdog'` is a retryable kind (it is — `RETRY_KINDS` includes `'watchdog'`), the retry loop
immediately issues a *second* `parseProgram` call over the same shard connection while the first
request may still be outstanding on the wire. If the connection's request/response matching is not
strictly by JSON-RPC id (or if `bbjServices.BBj.java.JavaInteropService` has any per-connection
mutable state assumed single-request-in-flight), a late response to the abandoned first call can be
attributed to the second call, silently corrupting that file's reconciled verdict rather than
producing a visible failure. This was not verifiable by reading these two files alone (it depends on
`java-interop.ts`'s connection implementation), which is itself the risk: nothing in this file
confirms the assumption the design comment relies on.
**Fix:** Either (a) confirm and add a one-line comment/citation that `JavaInteropService`'s
connection strictly matches responses by request id and is safe under overlapping in-flight
requests, or (b) make the watchdog authoritative by having it actively cancel/ignore late responses
tagged with the attempt's own request id before issuing a retry, so a stale response can never be
mistaken for the retry's response.

### WR-02: "Reconciled" fields conflate a real endpoint verdict with a Langium-only fallback under the same field names

**File:** `/home/coder/repos/bbj-corpus/conformance/worker.mts:132-150`, `/home/coder/repos/bbj-corpus/conformance/run.mjs:122-125, 272-280`
**Issue:** When the endpoint call fails after retries (`outcome !== 'verdict'`), `reconcileFile`
still produces `errors`/`warnings`/`first` by running `applyDiagnosticHierarchy` over the *raw
Langium* diagnostics alone:

```ts
} else {
    hierarchyApplied = applyDiagnosticHierarchy(raw, true, 20);
}
```

`run.mjs` then folds every entry with a truthy `result.reconciled` — verdict-backed or
fallback-only alike — into `acceptedWithError`, `missedReconciled`, etc., and writes them to
`details.json` (e.g. `acceptedWithError.map(entry => ({ id, syntaxErrorRemains, first: entry.result.reconciled?.first }))`)
without an `outcome`/`attempts` tag on the per-file record. The aggregate `summary.endpoint.failures`
count and the REPORT.md caveat ("a run only counts toward the gate with zero endpoint failures")
protect the top-level numbers, but anyone reading `details.json`'s per-file lists in isolation (the
normal way to investigate *which* files drove a metric) cannot tell a genuine BBj-verdict-backed
finding from a Langium-only fallback that happens to share the same field shape.
**Fix:** Include `outcome: entry.result.reconciled?.outcome` (and ideally `attempts`) in each
`details.json` per-file record derived from `result.reconciled`, so a reader can filter
fallback-only entries out of `acceptedWithError`/`missedReconciled` without cross-referencing the
separate `endpointFailures` list.

### WR-03: Duplicated JSON-RPC error-code table risks silent drift

**File:** `/home/coder/repos/bbj-corpus/conformance/worker.mts:56-63`
**Issue:**

```ts
// Duplicated from bbj-parser-service.ts, which keeps this table module-private.
const APPLICATION_ERROR_KINDS: Record<number, string> = {
    [-33001]: 'parser-exception',
    [-33002]: 'timeout',
    ...
};
```

The comment already flags this as a duplicate of a module-private table in the product source. If
`bbj-parser-service.ts` adds, removes, or renumbers an application error code, this copy silently
goes stale — a newly-added code would fall through to `'transport'` (the default in
`classifyFailureKind`), miscategorizing failures in the endpoint-failure breakdown without any error
or warning.
**Fix:** Export the table (or a lookup function) from `bbj-parser-service.ts` instead of keeping it
module-private, and import it here, eliminating the duplicate.

## Info

### IN-01: `ID_SHAPE` regex assumes lowercase hex in corpus ids

**File:** `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs:99`
**Issue:** `const ID_SHAPE = /\b\d+-[0-9a-f]{8}\.bbj\b/;` only matches lowercase hex digits. If the
corpus id generator ever produces uppercase hex (or mixed case), this fallback net — which exists
precisely to catch ids that aren't in the currently-loaded pattern set — would miss them.
**Fix:** Use a case-insensitive match (`/\b\d+-[0-9a-fA-F]{8}\.bbj\b/i`) unless the id generator is
verified to always emit lowercase.

### IN-02: README doesn't document `--data`

**File:** `bbj-vscode/test/test-data/conformance/README.md:17-20`
**Issue:** The maintainer pointer documents `--ls` and `--endpoint` but not `run.mjs`'s `--data`
flag (pointing the read side at another corpus checkout, e.g. a pinned older build), which is a
supported, documented-in-source option a maintainer reproducing a historical measurement would need.
**Fix:** Add a one-line mention, e.g. "`--data /path/to/older-checkout` re-runs against a pinned
corpus snapshot instead of the current one."

---

_Reviewed: 2026-09-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
