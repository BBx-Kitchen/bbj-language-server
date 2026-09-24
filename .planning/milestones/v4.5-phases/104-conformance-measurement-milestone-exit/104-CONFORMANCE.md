# Phase 104 — Conformance Measurement and Milestone Exit

This is the milestone's formal exit gate, measured by the conformance harness's own endpoint
mode against the real, deployed BBj parser. Only counts and own-words shape descriptions are
recorded here — no corpus file name, path, id or source line.

## Exit gate

**Exit gate: A = 9 (≤ 25), A2 = 22 (≤ 25), B = 31 of 1,210 (2.6 %, ≤ 5 %), endpoint failures = 0 — passed.**

| Measure | Milestone start | Endpoint off (this phase) | Endpoint on — Langium alone (raw) | Endpoint on — with the BBj verdict (reconciled) | Target |
|---|---|---|---|---|---|
| A — valid code the language server rejects, of 11,898 | 168 (1.4 %) | 9 (0.1 %) | 9 (0.1 %) | not tracked separately — see "Compiler-accepted files" below | ≤ 25 |
| A2 — valid code that parses but gets a validation error, of 11,898 | 267 (2.2 %) | 22 (0.2 %) | 22 (0.2 %) | not tracked separately — see "Compiler-accepted files" below | ≤ 25 |
| B — invalid code not flagged, of 1,210 | 658 (54.4 %) | 669 (55.3 %) | 669 (55.3 %) | 31 (2.6 %) | ≤ 5 % (≤ 60) |
| Endpoint failures, of 13,108 calls | — | — | 0 | 0 | 0 |

The exit gate reads A and A2 on the raw (Langium-only) numbers, which keep the same meaning as
the milestone's own 168/267 baseline, and reads B on the reconciled number, which is what the
live-diagnostics feature actually shows a user once the BBj parser's own verdict is applied.
Once a verdict exists, the product no longer tracks "A" and "A2" as separate reconciled buckets
— it tracks one combined "valid code with an error, once the verdict is applied" count (13
files, both A-shaped and A2-shaped construct groups included), covered by the "Compiler-accepted
files" section below.

## What was measured

Two commands, both against the milestone's own pinned corpus build (11,898 accepted / 1,210
rejected programs, compiler build of September 1 2026), on language-server commit `fde1bca9`
with `sourceModified: false` (no `bbj-vscode`/`bbj-intellij` change since the measured commit),
4 shards (the harness's default), 0 retries in either run:

1. **Endpoint off** (continuing the fake-interop series): `run.mjs --ls <this repo> --data
   <pinned baseline>`. 75 seconds.
2. **Endpoint on** (the gate run): `run.mjs --ls <this repo> --endpoint 127.0.0.1:5008 --data
   <pinned baseline>`. 390 seconds, 13,108 calls (every accepted and rejected file), 0 endpoint
   failures.

The corpus build was read from a detached worktree pinned to the exact commit the milestone
baseline was measured against, rather than the corpus repository's own current `main`, because
`main` was rebuilt mid-milestone (by an unrelated project sharing the same private clone) to a
larger corpus under a newer compiler build. Reading the pinned commit keeps this measurement's
denominators (11,898 / 1,210) meaning what the milestone's own baseline (168 / 267 / 658) meant,
rather than silently comparing against a different-sized corpus. The rebuilt corpus is measured
separately, informationally, below.

## The milestone in one table

| Point | A (of 11,898) | A2 (of 11,898) | B (of 1,210) |
|---|---|---|---|
| Milestone start | 168 (1.4 %) | 267 (2.2 %) | 658 (54.4 %) |
| Phase 98 close | 167 | 27 | 665 (55.0 %) |
| Phase 99 close | 52 | 27 | 666 |
| Phase 100 close | 9 | 22 | 669 |
| Phase 103 endpoint-off probe | 9 | 22 | 669 |
| Phase 103 endpoint-active probe | 9 | 22 | 31 (2.6 %, reconciled) |
| Phase 104 endpoint-off (this phase) | 9 | 22 | 669 (55.3 %) |
| **Phase 104 endpoint-on — the exit gate** | **9** | **22** | **31 (2.6 %, reconciled)** |

A and A2 have been flat since Phase 100's close — no plan between Phase 100 and this one touched
the Langium grammar or its validations. B's raw (Langium-alone) number drifted from the
milestone's 658 start to 669 as an accepted, documented side effect of earlier phases (Phase 98's
own B regression, recorded and accepted at that phase's close); the reconciled number is the one
that matters for the exit gate, and it has held at 31 since Phase 103 first measured it with the
endpoint active.

## File sets, not totals

Three set comparisons, by file identity rather than by count, confirm the numbers above are the
same files moving (or not moving), not different files landing on the same total by coincidence:

- **This phase's endpoint-off run against the Phase 103 endpoint-off probe** (same corpus build,
  same measurement mode): all three sets (`falseRejects`, `falseAlarms`, `missed`) are exactly
  identical — 0 files left, 0 files entered, in every one of the three sets.
- **This phase's endpoint-on raw sets against this phase's own endpoint-off run**: all three sets
  are exactly identical — 0 files left, 0 files entered. The raw columns mean the same thing with
  the endpoint on as with it off, confirming the endpoint's verdict changes only the reconciled
  view, never the raw one.
- **This phase's reconciled-missed set against Phase 104 plan 1's own endpoint-on reproduction
  run** (same corpus build, same measurement mode, taken a few hours earlier in this phase): 31
  files in both, 0 left, 0 entered.

No attribution work was needed in any of the three comparisons — nothing moved.

## Compiler-accepted files once the verdict is applied

Of the 31 files the language server currently flags but the compiler accepts (9 on list A, 22 on
list A2):

| Measure | Files |
|---|---|
| Still carries a language-server syntax Error after the verdict | 0 |
| Carries some Error-severity diagnostic once the verdict is applied | 13 |
| — of which the diagnostic is the BBj parser's own (an endpoint/compiler disagreement) | 8 |
| — of which the diagnostic is an existing, non-line-break semantic check the product keeps visible by design | 5 |

No language-server syntax Error survives on any of the 31 files once a verdict exists — the same
result Phase 103's probe found. Of the 13 that still carry some Error, 8 are cases where the live
BBj parser itself disagrees with the compiler's own batch acceptance of the file (own-words
shapes: a class declaration whose syntax the live parser's own JSON-based class-description
protocol rejects, and a bare comment statement occupying an otherwise-empty program). The
remaining 5 are unrelated, already-existing semantic checks that have nothing to do with syntax
or line breaks and are expected to stay visible regardless of the verdict: a field declared with
an initializer of the wrong type, a construct only valid inside a SWITCH block used outside one, a
DECLARE placed at class-member level, a member-visibility check, and an option only valid on a
particular file-open mode.

## Residual list A

All 9 files on raw list A, each an own-words shape and the reason it remains, carried forward
unchanged from Phase 100's own residue table (no plan between Phase 100 and this one touched
parsing):

| Files | Shape (own words) | Why it remains |
|---|---|---|
| 3 | A number written in scientific/exponent notation (for example `1.0e-2`) used as an argument inside a parenthesized function call. | The numeric literal terminal has no exponent suffix at all; a bare top-level occurrence is only ever tolerated by unrelated leniency. Valid but disproportionate to fix now — a candidate for a later milestone. |
| 2 | A bare, unadorned `METHODEND` or `FNEND` terminator with nothing else on its line, appearing where no method or `DEF FN` is open. | Same disposition — valid but disproportionate to fix now. |
| 1 | An unspaced positional `INPUT` form (`input` immediately followed by `@(` with no space between them). | The identifier terminal's own optional trailing character matches longer than the `INPUT` keyword at that exact position. Valid but disproportionate to fix now. |
| 1 | A branch-target list using bare line numbers as `GOTO`/`GOSUB` targets instead of a named label. | Needs a genuinely new addressing mechanism (the file's own physical/declared line numbering), not an extension of the existing label mechanism. Valid but disproportionate to fix now. |
| 1 | A statement that begins with a static-class-call reference glued onto the end of the line before it. | A line beginning with the continuation sigil is read by the lexer as a continuation of the previous line, not the start of a new statement, so this shape can only appear after the very first line of a program. The fix belongs in the lexer's own line-continuation splitter, not a grammar rule — a candidate for a later milestone. |
| 1 | A multi-line `DEF FN` body with no `FNEND`, followed later by a `class` block. | An unterminated function body keeps swallowing statements, which is harmless until the next thing is a class definition, which the body cannot contain. A known shape (a `DEF FN` body without `FNEND`) in an arrangement not previously covered; the fix is a grammar change to end the body at `return` when no `FNEND` follows. |

**Row count check:** 3 + 2 + 1 + 1 + 1 + 1 = 9, matching the measured list-A total.

## Residual list A2

All 22 files on raw list A2. Two groups relate to the pending single-line-IF balance-rule todo
(`2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md`); five are unrelated, already
existing semantic checks that stay visible by design because they check something other than a
missing line break; the remainder are line-break false alarms not yet investigated to a fix:

| Files | Shape (own words) | Why it remains |
|---|---|---|
| 6 | A single-line `IF`-headed statement flagged as needing to start in a new line. | Believed related to the same single-line-IF balance-counter mechanism the pending todo describes (a same-line closer sometimes mis-measured against how many `IF`s are still open); not further isolated in this phase. |
| 3 | A value-carrying `RETURN` statement flagged as needing to end with a line break. | Outside any of the earlier phases' five named line-break groups; cause not further isolated. |
| 4 | A numeric literal in scientific/exponent notation on a plain assignment, flagged as needing a line break. | Same underlying numeric-literal lexer gap as the scientific-notation residue on list A (the exponent form is not fully recognized); long-tail territory, not fixed here. |
| 1 | A single-line `ELSE` flagged as needing to start in a new line. | The exact shape the pending balance-rule todo's own repro describes (a nested single-line `IF…ELSE…FI` inside another, where an inner group is double-counted against the outer `ELSE`); accepted, carried-forward residue per that todo, not fixed here. |
| 1 | A single-line-IF `FI` terminator variant flagged as needing to start in a new line. | A narrower `RETURN void` variant of the single-line IF/FI forms fixed earlier in the milestone; not investigated further. |
| 1 | A `CLEAR`-style statement followed by a variable list, flagged as needing a line break. | Unmasked by an earlier phase's array-bracket parser fix (the statement did not parse cleanly before that fix, so this validation never ran on it); not investigated further. |
| 1 | An array-all-suffix reference on a `CLEAR`-style statement, flagged as needing to start in a new line. | A parser gap on the `CLEAR` verb's array-all suffix; long-tail territory. |
| 1 | A field declared with an initializer of the wrong type. | An existing, non-line-break field-initializer type check — stays visible by design. |
| 1 | A construct only valid inside a `SWITCH` block, used outside one. | An existing, non-line-break placement check — stays visible by design. |
| 1 | A `DECLARE` placed at class-member level instead of using the class-level field mechanism. | An existing, non-line-break placement check, distinct from the conflicting-`DECLARE` check the milestone narrowed elsewhere — stays visible by design. |
| 1 | A member-visibility check flags a reference to a non-visible member. | An existing, non-line-break visibility check — stays visible by design. |
| 1 | An option only supported on a particular file-open mode, used with a different one. | An existing, non-line-break file-statement option check — stays visible by design. |

**Row count check:** 6 + 3 + 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = 22, matching the measured
list-A2 total.

## Residual list B

All 31 reconciled misses are semantic-kind reject records (0 syntax-kind rejects remain missed) —
the syntax-only BBj parser endpoint cannot see a semantic complaint (an undefined label, an
undefined function, and similar) by design, so this residue is not a parser gap and the next
milestone must not read it as one. 8 of the check-exception-adjacent entries in this count are
flagged only through a check-exception diagnostic path rather than a normal validation message (see
below); the remainder are ordinary semantic checks the harness's own reconciliation does not (and
by design cannot) resolve through the syntax-only endpoint. The save-time `bbjcpl` compiler run,
which does see semantics, remains the authority for these files on the fallback cycle or with the
older-server latch off — this is the same disposition Phase 103's probe recorded, unchanged.

## Endpoint failures and check exceptions

- **Endpoint failures: 0 of 13,108 calls**, in either run. No call timed out, was reported
  unavailable, exceeded the size cap, or returned a malformed result.
- **Check exceptions: 2**, both in the reject set, both a pre-existing exception in a
  use-before-assignment check reading an unpopulated cross-reference. Langium's own validation
  registry catches per-check exceptions and continues, so neither run crashed and neither file's
  other diagnostics were affected — that one check simply contributed nothing for those two files.
  Filed as a pending todo with a confirmed synthetic reproduction:
  `.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md`.
  Not fixed in this phase.

## Next milestone baseline (informational, not the gate)

The private corpus repository's `main` branch was rebuilt mid-milestone (by an unrelated project)
to 16,884 accepted / 4,615 rejected programs, compiler build of September 22 2026. Since the
projected runtime for a full endpoint-on run against that rebuilt corpus (extrapolated from this
phase's own measured rate) was well under two hours, an informational run was taken against it —
raw A = 26 (of 16,884), raw A2 = 33 (of 16,884), reconciled B = 75 of 4,615 (1.6 %), 21,499 calls,
0 endpoint failures, 577 seconds. This run is recorded here only as the next milestone's own
starting point, never as part of this milestone's gate table — the numbers this phase's exit gate
reports, and the files committed alongside this record, are the pinned-baseline gate run's. The
next milestone should re-measure on whichever corpus build is current when it starts, since the
corpus is a shared, actively-written resource.

## How to re-run

The full procedure, including the `--endpoint`/`--data` flags, the BBj 26.03+ endpoint-mode
prerequisite, and the zero-failure gate rule, is documented in the private `bbj-corpus`
repository's `README.md` under "Conformance of the language server". A pointer README with no
corpus content lives in this repository at
`bbj-vscode/test/test-data/conformance/README.md`, next to the CONF-01 regression fixtures.

---
*Phase: 104-conformance-measurement-milestone-exit*
*Measured: 2026-09-23*
