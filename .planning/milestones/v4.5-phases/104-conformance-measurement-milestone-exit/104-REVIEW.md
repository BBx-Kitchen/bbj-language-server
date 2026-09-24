---
phase: 104-conformance-measurement-milestone-exit
reviewed: 2026-09-23T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - bbj-vscode/test/test-data/conformance/README.md
  - /home/coder/repos/bbj-corpus/conformance/run.mjs
  - /home/coder/repos/bbj-corpus/conformance/worker.mts
  - /home/coder/repos/bbj-corpus/conformance/leak-guard.mjs
  - /home/coder/repos/bbj-corpus/conformance/leak-guard.test.mjs
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 104: Code Review Report

**Reviewed:** 2026-09-23 (re-review after gap closure)
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Re-review scoped to the gap-closure change for the prior CR-01 finding: `leak-guard.mjs` (diffed
against `16a9e746`) and the new `leak-guard.test.mjs` self-test. `run.mjs`, `worker.mts`, and the
README were not touched in this round; their prior findings (WR-01, WR-02, WR-03, IN-01, IN-02)
are carried forward unchanged below.

**CR-01 is resolved.** The fix normalizes both sides of every comparison the same way `run.mjs`'s
`code()` report helper does (trim, then replace every backtick with `'`) before matching, adds a
110-character (`REPORT_TRUNCATE`) truncated-prefix candidate for every collected pattern so a
report-truncated excerpt still matches, and adds a 30-character (`QUOTED_PREFIX`) leading-part
candidate for every corpus source line, matched by sliding a same-width window across each scanned
line, so a maintainer quoting only the first part of an excerpt is still caught. This directly
closes both false-negative gaps the prior review demonstrated (truncation mismatch and backtick
substitution).

Verification performed for this re-review:
- Ran `node leak-guard.test.mjs` in place: all 7 cases pass (`load-transform`, `fixture-sanity`,
  `truncated`, `backtick`, `partial`, `clean`, `no-echo`).
- Independently reproduced the self-test's three leak fixtures (truncated/backtick-substituted,
  backtick-substituted, and partially-quoted forms of a synthetic corpus-shaped line, generated
  through `run.mjs`'s own `code()` transform) in a scratch `/tmp` directory and ran them through
  the **pre-fix** `leak-guard.mjs` (`git show 16a9e746:conformance/leak-guard.mjs`, copied to
  `/tmp`, never touching the working tree). All three were reported `clean` (exit 0) by the old
  guard — confirming the self-test genuinely fails against the old guard's behavior and is not a
  tautology, and that the new guard's fix is the thing making the difference. No corpus data files
  were read to perform this check; only the two harness scripts and synthetic fixture text were
  used.
- Read the new guard's matching logic line by line for false-positive risk (candidate dedup via
  `seen`, `MIN_PATTERN`/`QUOTED_PREFIX` floors, `ID_SHAPE` left untouched) and found no regression
  the prior review didn't already note (see IN-01, carried forward).

One new Info-level observation is added below (IN-03) about a residual, pre-existing (not
introduced by this fix) gap in the guard's threat model: it is scoped to the `REPORT.md` paste
vector, not to a maintainer copying an arbitrary mid-line substring directly out of raw
`manifest.jsonl`/`rejects.jsonl`/`details.json` data.

## Resolved

### CR-01 (RESOLVED): leak-guard.mjs's substring matching had false negatives against the exact text a maintainer would paste from REPORT.md

**File:** `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs:48-91, 142-167` (post-fix)
**Original issue:** Pattern matching required a byte-for-byte full-pattern substring match against
raw, untruncated `error.source`/`details.json` `source` text, while the only text that can actually
reach a public file is `run.mjs`'s `code()` output — trimmed, backtick-substituted, and truncated
to 110 characters, or a further-truncated manual quote of that. Two independent gaps (truncation
mismatch, backtick substitution) let a leaking file be reported `clean`.
**Resolution evidence:**
- `normalize()` (line 58) applies the identical `trim()` + backtick-to-`'` substitution to every
  collected pattern and to every scanned line before comparison, closing the backtick gap.
- `addPattern()` (lines 71-77) now stores both the full normalized candidate and its
  `REPORT_TRUNCATE` (110-char, matching `run.mjs`'s `code()` truncation width) prefix, closing the
  truncation gap.
- `addSourceLine()` (lines 84-91) additionally stores a `QUOTED_PREFIX` (30-char) leading-part
  candidate per corpus source line in a separate `quotedPrefixes` Set, matched via a sliding window
  over each scanned line (lines 160-167), catching a partial quote of an excerpt.
- Empirically confirmed against both the in-repo self-test (all 7 cases pass) and an out-of-tree
  run of the pre-fix guard against the same fixtures (all three false-negative, now correctly
  caught) — see Summary above for the exact reproduction.

No further action needed; findings count reflects this as resolved (not counted toward the current
`critical` total).

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

**File:** `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs:140` (line renumbered by the
CR-01 fix; content unchanged)
**Issue:** `const ID_SHAPE = /\b\d+-[0-9a-f]{8}\.bbj\b/;` only matches lowercase hex digits. If the
corpus id generator ever produces uppercase hex (or mixed case), this fallback net — which exists
precisely to catch ids that aren't in the currently-loaded pattern set — would miss them. This line
was not touched by the CR-01 gap-closure change.
**Fix:** Use a case-insensitive match (`/\b\d+-[0-9a-fA-F]{8}\.bbj\b/i`) unless the id generator is
verified to always emit lowercase.

### IN-02: README doesn't document `--data`

**File:** `bbj-vscode/test/test-data/conformance/README.md:17-20`
**Issue:** The maintainer pointer documents `--ls` and `--endpoint` but not `run.mjs`'s `--data`
flag (pointing the read side at another corpus checkout, e.g. a pinned older build), which is a
supported, documented-in-source option a maintainer reproducing a historical measurement would need.
Not touched this round.
**Fix:** Add a one-line mention, e.g. "`--data /path/to/older-checkout` re-runs against a pinned
corpus snapshot instead of the current one."

### IN-03: Guard's threat model is scoped to the REPORT.md paste vector, not to a direct raw-data copy

**File:** `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs:79-91`
**Issue:** The new `QUOTED_PREFIX` candidate is deliberately anchored to the *leading* 30
characters of each normalized corpus source line, which is correct and sufficient for the actual
leak vector (`run.mjs`'s `code()` helper always slices from offset 0, so anything that can appear
in `REPORT.md` — whole, 110-truncated, or a maintainer's further-shortened quote of that — is
necessarily a prefix of the normalized line, never a mid-line fragment). This is a sound, narrow
fix for the vector CR-01 was raised against. It does not, however, catch a maintainer who bypasses
`REPORT.md` entirely and copies an arbitrary non-leading substring straight out of
`manifest.jsonl`/`rejects.jsonl`/`details.json` (which this same script reads and which a
maintainer investigating a failure might have open) into a public file — such a fragment is neither
a match for the full/110-prefix candidates (too short) nor for the leading-30 `quotedPrefixes` set
(not anchored at offset 0). This is a pre-existing gap in the guard's stated scope, not a
regression introduced by the CR-01 fix, and the header comment already documents the guard's intent
as covering "the exact leak vector it exists to prevent" (the REPORT.md paste path) rather than
every conceivable copy source.
**Fix:** Optional hardening, not required to close CR-01: extend `quotedPrefixes` to include a
sliding set of interior N-character windows of each source line (not just the leading one), or add
a maintainer-facing note in the guard's header comment that raw `manifest.jsonl`/`rejects.jsonl`/
`details.json` files themselves must never be pasted from directly, only `REPORT.md` excerpts,
since only the latter is covered.

---

_Reviewed: 2026-09-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
