# Phase 99: Parser Gaps — the Largest Groups - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 99-Parser Gaps — the Largest Groups
**Areas discussed:** Todo folding, LEN= fix scope, The word `label` as a name, FIELD / IOLIST depth, B movement at the boundary

---

## Scout finding presented before the discussion

The recorded failing lines of the private conformance run were checked group by group. Two of the
four roadmap descriptions did not match the real cause: the `READ RECORD` group stops at the fused
`LEN=` keyword literal inside the channel options (the combined verb already parses), and the
"label alone / label in front of a statement" group consists entirely of files using the literal
word `label` as the name. `FIELD` as a verb and `IOLIST` were confirmed as described.

---

## Todo folding

| Option | Description | Selected |
|--------|-------------|----------|
| Don't fold | Phase 99 stays a parser phase; the single-line IF balance todo stays pending for Phase 100's long tail or a quick task | ✓ |
| Fold it in | Add one validator plan starting from the recorded nested one-liner repro | |

**User's choice:** Don't fold
**Notes:** The other four matched todos were keyword matches only (IntelliJ lifecycle, Node download, interop test harness) and were already declined for Phase 98.

---

## LEN= fix scope

| Option | Description | Selected |
|--------|-------------|----------|
| Root fix: unfuse LEN= | LEN becomes an ordinary word followed by `=`; fixes the 38 files and the 5 Phase 98 A2 residue files; INPUT verifier form must keep parsing | ✓ |
| Option position only | Keep the fused token, let the channel Option rule accept it as a key | |
| Root fix for LEN= and IOL= | Also unfuse `IOL=` in the same stroke | |

**User's choice:** Root fix: unfuse LEN=

| Option | Description | Selected |
|--------|-------------|----------|
| Record it, criterion unchanged | Criterion 5 stays "A2 at or below the Phase 98 number"; the side effect is recorded with a file-set diff | ✓ |
| Tighten criterion to A2 ≤ 25 | Restore the missed Phase 98 gate inside Phase 99 | |

**User's choice:** Record it, criterion unchanged

---

## The word `label` as a name

| Option | Description | Selected |
|--------|-------------|----------|
| Only the word `label`, all positions | Declaration, GOTO/GOSUB target and variable; other words stay in Phase 100 | ✓ |
| `label` in label positions only | Declaration and branch targets; variable stays in Phase 100 | |
| Pull all of PARSE-08 forward | Whole possibleName set in Phase 99 | |

**User's choice:** Only the word `label`, all positions

| Option | Description | Selected |
|--------|-------------|----------|
| Amend roadmap + requirements | Criteria 2 and 3, PARSE-02/03 reworded to the real shapes in this context commit | ✓ |
| Leave wording, correct in CONTEXT only | Less churn; verifier reads roadmap literally | |

**User's choice:** Amend roadmap + requirements

| Option | Description | Selected |
|--------|-------------|----------|
| Take it, but only claim `label` | A generic mechanism is allowed if it is the natural root fix; only `label` is tested and claimed | ✓ |
| Keep it narrow to `label` | Restrict the change to the one word | |

**User's choice:** Take it, but only claim `label`

---

## FIELD / IOLIST depth

| Option | Description | Selected |
|--------|-------------|----------|
| Correct AST, no new editor features | Proper AST so contained variables link/highlight/complete; providers touched only if nodes misbehave | ✓ |
| Parse plus IOLIST outline/hover | Additional outline entry and hover on `IOL=label` | |

**User's choice:** Correct AST, no new editor features

| Option | Description | Selected |
|--------|-------------|----------|
| Plain expression, no template check | Record, name and value are ordinary expressions | ✓ |
| Warn on unknown literal field names | New check against a known template | |

**User's choice:** Plain expression, no template check

| Option | Description | Selected |
|--------|-------------|----------|
| Ordinary references, must not raise new alarms | IOLIST items are normal references; no new error-severity scoping diagnostic | ✓ |
| You decide | Left to research and planning | |

**User's choice:** Ordinary references, must not raise new alarms

| Option | Description | Selected |
|--------|-------------|----------|
| Both declaration errors + identifier probes | Still flagged: class FIELD without type, FIELD verb without `=value`; still clean: keyword-as-identifier probes | ✓ |
| Identifier probes only | No new still-flagged cases for FIELD | |

**User's choice:** Both declaration errors + identifier probes

---

## B movement at the boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Not a gate; per-file evidence required | B may rise; every moved file classified via file-set diff | ✓ |
| Hard gate: B ≤ 665 | Any rise blocks until resolved or overridden | |
| Soft cap: B ≤ 665 + 10 | Up to ten accepted with evidence without asking | |

**User's choice:** Not a gate; per-file evidence required

| Option | Description | Selected |
|--------|-------------|----------|
| After each group's plan + final run | Snapshot, run after each group, final run after the last source change | ✓ |
| Once at the boundary + once after fixes | As Phase 98 | |

**User's choice:** After each group's plan + final run

| Option | Description | Selected |
|--------|-------------|----------|
| Triage second causes, fix only trivially related | Phase 98's rule; stop for a decision if A stays above 80 | ✓ |
| Pull the next Phase 100 group forward | Take DREAD/PRINT item forms to reach the number | |

**User's choice:** Triage second causes, fix only trivially related

---

## Claude's Discretion

- Mechanism for unfusing `LEN=`; mechanism that lets `label` be a name while the library grammar keeps its keyword
- `FIELD` verb disambiguation against the class-member declaration; AST node and property names
- Plan split and order (default by file count, `IOLIST` after `label`)
- Whether the `RECORD` sibling verbs need anything beyond the `LEN=` fix

## Deferred Ideas

- Unfuse `IOL=` — Phase 100 long tail if a file needs it
- Other language words as names — Phase 100 (PARSE-08)
- Statement starting with a `::file::Class.method()` static call — Phase 100 long-tail triage
- `IOLIST` outline/hover; literal `FIELD` name template warning — not planned in v4.5
