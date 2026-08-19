# Phase 67 Apply Set

## Derivation

Rows come from selecting every record whose `disposition:` field begins `easy-fix` across the six
closed COVERAGE files (`.planning/reviews/61-COVERAGE.md` … `66-COVERAGE.md`), produced
mechanically by `derive-apply-set.mjs` (see that script for the exact selection/ordering logic).
Rows are ordered by originating phase then finding ID. This file is Phase 67's closed denominator
per D-01 — every exclusion is argued in writing here, no row is silently absent.

Per D-04, `P61-D2-011` and `P66-D2-001` name the identical location and the identical edit and are
applied and committed once — but each keeps its own row (one row per selected record; the 77-record
selection maps to 77 rows), and both rows are closed against the same commit pair.

## Index

| # | finding_id | verdict | commit |
|---|---|---|---|
| 1 | P61-D2-011 | applied | 382a068 + 32faeff |
| 2 | P66-D2-001 | applied | 382a068 + 32faeff |

## Rows

```
row:               1
finding_id:        P61-D2-011
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 382a068 — `npx vitest run test/method-return-java-type.test.ts`
                    failed 1/12: `expected [] to deeply equal [ Array(1) ]` (zero incompatible-type
                    diagnostics found where one was expected), confirming getType() returned
                    undefined for the unresolved-return-type call site
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has
                    not (yet, or ever) been populated — a resolution race, a partially resolved
                    class, or any future code path constructing/updating a JavaMethod outside
                    java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to
                    silently return no type for that call site, with no diagnostic explaining why.
                    This matches DEBT-03's documented symptom (String.valueOf(2) assigns no type).
fix_applied:       In getTypeInternal's isJavaMethod branch (bbj-type-inferer.ts:75-76), fall back
                    to `this.javaInterop.getResolvedClass(member.returnType)` when
                    `member.resolvedReturnType?.ref` is undefined — resolving the always-present
                    raw returnType string through the same class-resolution path the inferer
                    already uses for a named Java type. No new export, no wider refactor.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run
                    test/method-return-java-type.test.ts test/linking.test.ts — build succeeds,
                    method-return-java-type.test.ts 12/12 pass, linking.test.ts's 11 failures are
                    the pre-existing deterministic gate-set failures (unreachable java-interop
                    peer), unrelated to and unchanged by this fix
commit:            382a068 (red) + 32faeff (green)
notes:             D-04 merge — this row and row 2 (P66-D2-001) name the identical location and
                    the identical edit; applied and committed once as a red/green pair citing both
                    IDs, with both rows closed against that same commit pair. Reconciled as 2
                    records → 1 distinct edit in Task 2's Reconciliation section.
```

```
row:               2
finding_id:        P66-D2-001
unit:              DEBT-03
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
severity:          medium
effort:            4
verdict:           applied
test_required:     yes (D-11 D2)
fail_before:       observed at 382a068 — identical red observation as row 1 (P61-D2-011); this
                    record re-verifies the same reproduction against current, byte-for-byte-
                    unchanged code rather than a distinct one
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType has
                    not (yet, or ever) been populated — a resolution race, a partially resolved
                    class, or any future code path constructing/updating a JavaMethod outside
                    java-interop.ts's own resolveClass() Phase 2 — causes bbj-type-inferer.ts to
                    silently return no type for that call site, with no diagnostic explaining why.
                    Matches DEBT-03's documented symptom (String.valueOf(2) assigns no type to the
                    target variable).
fix_applied:       Same edit as row 1 (P61-D2-011) — one fallback in getTypeInternal's isJavaMethod
                    branch, one commit pair, citing both finding IDs.
user_facing:       yes
verification:      cd bbj-vscode && npm run build && npx vitest run
                    test/method-return-java-type.test.ts test/linking.test.ts — same result as row
                    1; see that row's verification for the full command output summary.
commit:            382a068 (red) + 32faeff (green)
notes:             D-04 merge — see row 1 (P61-D2-011) for the shared edit and shared commit pair.
                    P66-D2-001 is Phase 66's DEBT-03 re-triage citing P61-D2-011 by ID as the
                    original reproduction; neither record was rewritten to fit the merge.
```
