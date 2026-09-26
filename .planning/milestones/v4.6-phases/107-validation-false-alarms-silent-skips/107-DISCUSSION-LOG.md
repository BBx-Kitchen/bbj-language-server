# Phase 107: Validation False Alarms & Silent Skips - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-24
**Phase:** 107-validation-false-alarms-silent-skips
**Areas discussed:** Todo folding, Balance-rule fix shape, Residue handling, VAL-02 guard breadth, Malformed `## = 1` outcome, Unknown Java method (folded)

---

## Todo folding

| Option | Description | Selected |
|--------|-------------|----------|
| Single-line IF balance rule | 2026-09-21 todo, is VAL-01 | ✓ |
| Use-before-assignment throw | 2026-09-23 todo, is VAL-02 | ✓ |
| Unknown Java method warning | 2026-09-24 todo, a new check outside VAL-01/02 (recommended: leave pending) | ✓ |

**User's choice:** All three folded.
**Notes:** The third fold adds scope, so it was tracked as the new requirement VAL-03 (see the last area).

## Balance-rule fix shape

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal counter repair | Make ELSE count the same way in both counters | ✓ |
| One shared same-line walk | Replace both counters with a stack-based helper | |
| You decide | Research picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Repro + 3 flagged + small matrix | Nested one-liner, the existing flagged cases, synthetic variants | ✓ |
| Repro + 3 flagged only | Known inputs only | |

## Residue handling

| Option | Description | Selected |
|--------|-------------|----------|
| Investigate each remaining shape | Fixture and fix per shape until the re-flagged files are clean | ✓ |
| Accept documented residue | Stop at A2 ≤ 22 and no new B | |
| Investigate, cap at one round | One extra round, rest becomes a todo | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, only stop the false alarm | Leave the message text alone | ✓ |
| Yes, fall back to the keyword | Readable text for an empty CST node | |

## VAL-02 guard breadth

| Option | Description | Selected |
|--------|-------------|----------|
| check-variable-scoping.ts + scope-local site | Every `.symbol` read in the file plus the bbj-scope-local.ts read | ✓ |
| check-variable-scoping.ts only | scope-local crash becomes a todo | |
| getSymbolRefName only | One-line minimal fix | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inline optional checks | `?.` / `&& symbol`, the file's idiom | ✓ |
| Shared type-guard helper | `hasSymbol(ref)` | |
| You decide | | |

## Malformed `## = 1` outcome

| Option | Description | Selected |
|--------|-------------|----------|
| Skip silently, keep checking | Nothing to record, continue | ✓ |
| Skip + emit a hint | New low-severity hint on the node | |

| Option | Description | Selected |
|--------|-------------|----------|
| Only no exception diagnostic + hint still fires | Exactly success criterion 4 | ✓ |
| Also snapshot other diagnostics | Stricter, brittle | |

## Unknown Java method (folded)

| Option | Description | Selected |
|--------|-------------|----------|
| New VAL-03 in Phase 107 | Requirement + roadmap criterion | ✓ |
| Move to Phase 109 | Closer to resolveClass work | |

| Option | Description | Selected |
|--------|-------------|----------|
| Main Error check, conservative guards | Dedicated MemberCall check | ✓ |
| Cheap extras only | Rule 2 exemption + wording | |
| Main check + extras | Both | |

| Option | Description | Selected |
|--------|-------------|----------|
| No setting for now | Guards carry the risk | ✓ |
| Yes, both IDEs | VS Code + IntelliJ setting + docs | |

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests + local corpus run | Guard-case tests plus corpus review of every new Error | ✓ |
| Unit tests only | | |

## Claude's Discretion

- Exact counter bookkeeping, the test-matrix variants, where the VAL-03 check lives and how
  "fully resolved" and duplicate-warning suppression are done, plan split and wave order.

## Deferred Ideas

- VAL-03 extras (hierarchy Rule 2 exemption for member linking warnings, "NamedElement" wording).
- A setting to downgrade the VAL-03 check to Warning.
