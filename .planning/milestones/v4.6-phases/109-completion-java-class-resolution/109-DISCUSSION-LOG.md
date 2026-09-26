# Phase 109: Completion & Java Class Resolution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-25
**Phase:** 109-completion-java-class-resolution
**Areas discussed:** COMP-03 fix budget, COMP-02 reach, JINT-01 array types, JINT-02 canonical spelling

---

## Todos matched by keyword

| Option | Description | Selected |
|--------|-------------|----------|
| Close the two 108 ones | Move the LIFE-01/02 todos to completed/; fold nothing | ✓ |
| Leave all as-is | Fold nothing, touch no todo files | |
| Fold the linking-interop one too | Also fold the linking.test.ts warm-up todo | |

**User's choice:** Close the two 108 ones.

---

## COMP-03 fix budget

| Option | Description | Selected |
|--------|-------------|----------|
| Provider or small grammar change | Completion-provider fallback or a contained bbj.langium change; no Langium patch | ✓ |
| Provider-side only | No grammar changes at all | |
| Anything, incl. Langium patch | Grammar restructure plus a local Langium patch or upstream PR | |

**User's choice:** Provider or small grammar change.

| Option | Description | Selected |
|--------|-------------|----------|
| Skipped test + #561 stays open | test.skip with reason; #561 comment lists the remainder | ✓ |
| Skipped test + new issue | Close #561 for the fixed part, open a narrower issue | |
| Also a docs known-limitation | As option 1 plus a line in both feature docs | |

**User's choice:** Skipped test + #561 stays open.

| Option | Description | Selected |
|--------|-------------|----------|
| Private corpus harness too | Phase 107 procedure; no file newly enters A or A2 | ✓ |
| Suite only | Vitest suite plus example-files | |

**User's choice:** Private corpus harness too.

---

## COMP-02 reach

| Option | Description | Selected |
|--------|-------------|----------|
| Type inference only | Type inferer re-selects; linker, go-to-definition, hover unchanged | ✓ |
| Also the linker | getCandidate re-selects too | |
| Type inference + hover | Hover shows the matching overload's signature | |

**User's choice:** Type inference only.

| Option | Description | Selected |
|--------|-------------|----------|
| No type | Tied candidates with different return types give undefined | ✓ |
| Linked overload wins | Keep findBestOverload's tie rule | |

**User's choice:** No type.

---

## JINT-01 array types

| Option | Description | Selected |
|--------|-------------|----------|
| Same as today, built locally | Zero-member type built locally, no round-trip; behaviour-neutral | ✓ |
| Arrays erase to component class | String[] → String members | |

**User's choice:** Same as today, built locally.
**Notes:** Scout found both backends already erase array member types, yet #660 logs array names; research must find their source.

---

## JINT-02 canonical spelling

| Option | Description | Selected |
|--------|-------------|----------|
| In the language server | Normalize in java-interop.ts; works with every backend version | ✓ |
| LS now + bbj-ls issue | Plus a bbj-ls hardening issue | |
| Fix in bbj-ls | Backend sends one spelling | |

**User's choice:** In the language server.

| Option | Description | Selected |
|--------|-------------|----------|
| Outer.Inner | Java source form, matches getCanonicalName | ✓ |
| Outer$Inner | Binary name | |
| You decide | Research picks | |

**User's choice:** Outer.Inner.

---

## Claude's Discretion

- COMP-01 receiver-shape detection mechanism
- COMP-03 fallback/grammar shape within the budget
- JINT-02 normalization helper placement

## Deferred Ideas

- bbj-ls one-spelling change (not taken)
