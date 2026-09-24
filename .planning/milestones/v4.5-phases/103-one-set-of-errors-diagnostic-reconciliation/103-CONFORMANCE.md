# Phase 103 — Conformance Measurement

The phase-boundary working measurement the roadmap asks for (success criteria 3 and 4). This is a
single scratch-probe run at the phase boundary, using the product's own shipped reconciliation
code (`reconcileWithVerdict` / `applyDiagnosticHierarchy`) against the real, deployed BBj parser
endpoint — not the conformance harness's own endpoint mode, which is Phase 104's job, and not a
formal exit gate, which also stays in Phase 104. Only counts and own-words shape descriptions are
recorded here — no corpus file name, no corpus path, no corpus id, no corpus source line.

## Endpoint-absent run: reproduces the pre-phase file sets

**What was measured.**

- Snapshot taken first: `details.json`/`summary.json` copied to
  `snapshots/phase-103-before-details.json` / `phase-103-before-summary.json` before any run.
- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`.
- Date: 2026-09-23. Language server commit `311c0170` (this plan's task 1 commit — the harness
  reads the working tree, and task 1 changed only a test file), mode `validate`,
  `sourceModified: false`, 78 seconds.
- The harness uses the fake interop double (`worker.mts`), so this run never reaches the real
  endpoint — exactly the older-BBj path this phase's D-04 (Phase 103 context) says must stay
  unchanged while the latch is off.

**Numbers — identical to the pre-phase snapshot, by file set, not only by total.**

| Measure | Snapshot (before) | This run | File-set diff |
|---|---|---|---|
| A — valid code the language server rejects | 9 | 9 | left: 0, entered: 0 |
| A2 — valid code that parses but gets a validation error | 22 | 22 | left: 0, entered: 0 |
| B — invalid code not flagged, of 1,210 | 669 | 669 | left: 0, entered: 0 |

Every one of the three file sets (`falseRejects`, `falseAlarms`, `missed`) is byte-identical
between the pre-phase snapshot and this run's `details.json` — not merely equal totals. Since no
set moved, there was nothing to bisect against the phase base commit, and step 2's bisect branch
was not exercised. This confirms roadmap success criterion 3: with the endpoint absent, the
suppression this phase built is a true no-op at corpus scale, not a permanent change to what
Langium itself reports.

## Endpoint-active measurement

**What was measured.** A private scratch script
(`/home/coder/repos/bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts`, untracked in
the corpus repository, never committed) mirrors `worker.mts`'s hermetic Langium setup (the fake
interop double, `LangiumDocumentFactory` + `DocumentBuilder`, always building with validation —
even for a document with a syntax error, since the product validates every open document) and
additionally asks the real, deployed BBj parser endpoint directly through one
`JavaInteropService.parseProgram()` instance, sequentially, one file at a time, exactly as the
gated live test (this plan's task 1) does. Per file: a result runs the shipped
`reconcileWithVerdict` then `applyDiagnosticHierarchy(…, true, 20)`; a failure runs
`applyDiagnosticHierarchy(raw, true, 20)` unchanged and records the failure kind. Classification
follows `run.mjs`'s own rules: linking-error codes and the "File … could not be resolved"
environment message (no real file system in this run) are excluded before deciding whether a file
is still "caught" (any Error-severity diagnostic remains). A sanity check ran first: a known-bad
fixture confirmed `recallLangiumDiagnostics` returns a non-empty list before the full run started.
Inputs: all 1,210 reject records from `rejects.jsonl` (not only the 669 the endpoint-absent run
missed — a verdict can also turn a Langium-caught reject into a newly-missed file, so every reject
was re-measured), plus the 31 files from the fresh `details.json`'s `falseRejects` (9) and
`falseAlarms` (22) — the compiler-accepted files the language server currently flags. No file was
skipped; every one of the 1,241 real endpoint calls returned a result or a caught application
error, and endpoint failures were zero in both groups.

### List B: 31 of 1,210 (2.6 %) — well under the 5 % target

| Measure | Milestone start | Endpoint absent (this phase) | Endpoint active (this run) | Target |
|---|---|---|---|---|
| B — invalid code not flagged, of 1,210 | 658 | 669 | **31 (2.6 %)** | ≤ 5 % (≤ 60 files) |

- **Rejects caught only because of BBj's own diagnostic:** 641 of the 669 files the endpoint-absent
  run missed are now caught once the live verdict's diagnostic reconciles with Langium's own list —
  the direct effect of PSRV-06/PSRV-07 landing.
- **Rejects the live BBj parser itself accepted (zero errors returned):** 32 of the 1,210, split by
  the harness's own reject-record classification (a record's own first compiler error carries a
  message for a semantic complaint, none for a syntax one): **0 syntax, 32 semantic.** This matches
  the compiler-parser endpoint's own documented reach (Phase 101/102): it reports syntax, not
  semantics such as undefined labels or functions, so a compiler-rejected file whose only
  complaint is semantic is never expected to draw a live diagnostic from this path — the save-time
  `bbjcpl` run remains the authority for those, on the fallback cycle or with the latch off.
- **Still missed after reconciliation:** 31 of the 1,210 (one fewer than the 32 the live parser
  accepted — one of those 32 semantic rejects is still caught by Langium's own linking/validation
  checks independent of the live parser's own opinion). All 31 are semantic-kind reject records by
  construction (0 syntax rejects remain missed), consistent with the endpoint's documented reach.
- **Endpoint failures:** none, in either the reject group or the accepted-file group (0 of 1,241
  calls failed, timed out, or were reported unavailable).

### The compiler-accepted files: no language-server syntax error survives the verdict

Of the 31 files the language server currently flags but the compiler accepts (9 on list A, 22 on
list A2):

| Measure | Files | Note |
|---|---|---|
| Still carries a language-server syntax Error after the verdict | **0** | Matches PSRV-07's own success criterion exactly: an accepted document shows no lexer, parser or line-break Error once a verdict exists. |
| Drew a live BBj error (an endpoint/`bbjcpl` disagreement) | **0** | The live parser agreed with the compiler-accepts verdict on every one of the 31 files; no endpoint answer contradicted the corpus's own compiler-verified acceptance. |
| Keeps a non-syntax validation Error (by design — semantic diagnostics stay visible) | **5** | The five non-line-break A2 message groups already on record for this corpus set (a field type/initializer mismatch, a misplaced `CASE DEFAULT`, `DECLARE` at class member level, a visibility check, an MKEYED-only option) — none of these is a syntax complaint, so D-05 (linking/semantic diagnostics stay visible) is exactly what keeps them showing. |

The remaining 26 of the 31 files (the line-break-coded A2 entries and the 9 list-A parser-reject
entries) carry no Error-severity diagnostic at all after the verdict — downgraded to Warning, per
D-04, or replaced outright where the live parser's own diagnostic overlaps the line, per D-09/D-10.

## A caveat found during the run, out of scope for this phase

Two of the 1,241 files (both in the reject set) triggered a pre-existing exception in
`check-variable-scoping.ts`'s `checkUseBeforeAssignment` (`getSymbolRefName` reading a property of
an undefined reference) during validation. Langium's own validation registry catches per-check
exceptions and continues (`ValidationRegistry.handleException`), so this did not crash the probe
or any other file's measurement — it only means that one check contributed no diagnostic for those
two files, identically to how the same code already behaves in the harness's own ordinary
(endpoint-absent) runs, since `check-variable-scoping.ts` is unmodified by this phase and unrelated
to diagnostic reconciliation. Not investigated or fixed here, per the deviation rules' scope
boundary (pre-existing, unrelated-file behaviour). No id, path or source text is recorded — the
two files are not otherwise identified in this document.

## What this is, and is not

A single scratch-probe run at the phase boundary, using the product's own shipped reconciliation
code end to end against the real endpoint — not a re-implementation, and not the conformance
harness's own endpoint mode, which belongs to Phase 104. It is not a formal exit gate: Phase 104
owns the milestone's closing measurement and its own gate table. The numbers above establish that
the mechanism this phase built works at corpus scale, in the direction the roadmap's success
criteria 3 and 4 ask for, ahead of that formal close.

---
*Phase: 103-one-set-of-errors-diagnostic-reconciliation*
*Measured: 2026-09-23*
