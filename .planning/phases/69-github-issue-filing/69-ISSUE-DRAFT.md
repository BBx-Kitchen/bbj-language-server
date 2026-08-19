# Phase 69 Issue Draft

This file is the ISSUE-01 approval artifact for Phase 69. The filing run (`69-09`, `69-10`,
`69-11`) consumes this file as its source rather than re-rendering from `MAJOR-REFACTORS.md` (D-05)
— approval and execution must never diverge. **Committing this draft writes nothing to the
tracker.**

## Derivation

The selection rule: all **144** records in `.planning/reviews/MAJOR-REFACTORS.md` §`## Records`.
Filing order is lifted **verbatim** from §`## Index (severity-sorted, for Phase 69 filing order)`
and is not re-sorted — that table is severity → PRIO → effort, already computed.

The route predicate, stated mechanically and decidable from two record fields alone: a record
routes to a **private draft advisory** **iff** its `dimension:` is `D1` **and** its `severity:` is
`critical` or `high`. Every other record routes to a **public issue**.

The label rule (D-09): labels come only from `proposed_labels:`, never from `effort:` or
`severity:`. Split the value on `;`, strip the `area=` prefix from the first part, and use all
three resulting values verbatim as three `gh` labels.

The title rule (D-10): every title is `<area>: <problem>`, where `<area>` is the bare area label
(no `area=` prefix) and `<problem>` is a one-line problem statement authored from the record's
`evidence:`. The finding ID never appears in the title — it lives in the body's `## Traceability`
section — and titles are derived once, deterministically, in the shard that renders the record
(the filing run's resume check matches on them, D-14).

The six-section body order (identical for all 144 records):

1. `## Problem` — 1-3 sentences authored from `evidence:`.
2. `## Evidence` — the `location:` value verbatim in backticks, then surface / problem class /
   impact drawn from `evidence:`.
3. `## Failure scenario` — `failure_scenario:` lifted **verbatim** (D-11).
4. `## Proposed approach` — `proposed_approach:` lifted **verbatim** (D-11).
5. `## Acceptance criteria` — authored per D-12: the observable condition under which the failure
   scenario no longer occurs, plus whatever regression coverage the proposed approach implies. No
   new scope, no design commitment, no schedule promise.
6. `## Traceability` — one line naming the finding ID, dimension, severity and effort, plus, for a
   record whose `dedup:` is not `none`, one line stating what this finding adds beyond the named
   existing issue (D-08).

The verbatim-lift rule (D-11): `failure_scenario:` and `proposed_approach:` are copied byte-for-byte
into their sections. Where the lifted text contains a review-internal reference (`RU-nn-nn`, an
`INVENTORY.md` or `COVERAGE.md`-file name, or a `§` pointer), the sentence is still lifted verbatim
and a bracketed gloss is appended immediately after it, naming the referenced thing in terms an
outside reader can use. Seventeen records need this gloss: `P64-D6-008`, `P63-D1-007`, `P64-D1-002`,
`P61-D1-004`, `P64-D3-002`, `P64-D6-005`, `P62-D5-002`, `P63-D5-001`, `P63-D6-002`, `P64-D6-010`,
`P63-D3-006`, `P63-D4-008`, `P62-D1-005`, `P62-D5-003`, `P63-D7-003`, `P63-D7-006`, `P63-D7-002`.

## Reconciliation

`144 = 135 public issues + 9 private draft advisories` — the nine, in `## Index` order:

| # | finding_id |
|---|---|
| 1 | `P62-D1-003` |
| 2 | `P64-D1-004` |
| 3 | `P61-D1-003` |
| 4 | `P63-D1-007` |
| 5 | `P64-D1-006` |
| 6 | `P63-D1-001` |
| 7 | `P63-D1-003` |
| 8 | `P64-D1-002` |
| 9 | `P64-D1-003` |

`17 wave-1 = 9 advisories + 8 public issues` — the eight public wave-1 finding IDs: `P64-D6-007`,
`P64-D6-008`, `P64-D6-006`, `P61-D3-002`, `P61-D3-003`, `P63-D2-004`, `P64-D6-002`, `P66-D3-001`.

`144 = 17 wave-1 + 127 wave-2`.

Severity: `1 critical + 16 high + 70 medium + 57 low = 144`.

Area: `53 vscode + 53 intellij + 16 BBj integration and infrastructure + 11 dependencies +
9 javascript + 2 documentation = 144`.

Dedup: `11 records carry a dedup annotation, 133 read none, and all 11 are filed with the
annotation carried into the body — 0 are skipped` (D-08; the corpus `duplicate` count is 0).

The seven render shards cover rows 1-17, 18-40, 41-64, 65-87, 88-107, 108-125 and 126-144, which
sum to `17 + 23 + 24 + 23 + 20 + 18 + 19 = 144` — no gap, no overlap.

## Routing decisions

1. **The nine-advisory route.** The two-field predicate (`dimension: D1` and `severity:` in
   {`critical`, `high`}) selects exactly nine records for the private advisory route. The four
   `high` dependency findings — `P64-D6-002`, `P64-D6-006`, `P64-D6-007`, `P64-D6-008` — stay
   **public** despite being `high` severity, because none is D1-primary (each is D6-primary) and
   they concern already-published CVEs in third-party packages; privatizing tracking of a public
   CVE protects nothing and makes it harder to fix. Rejected: routing on severity alone (would
   privatize the four dependency findings for no protective benefit) and routing on `high`/
   `critical` regardless of dimension (same defect).

2. **The `supersedes` pair.** `P66-D4-001` (filing-order row 63) states it supersedes `P63-D4-010`
   (filing-order row 53), and both are among the 144. **Both are filed as separate public issues,
   each body's `## Traceability` section naming the other.** Row 53's (`P63-D4-010`) body states
   that its finding is superseded by row 63's (`P66-D4-001`) issue and what remains true of it; row
   63's body states which finding it supersedes and what it adds beyond it. Rejected: filing only
   the superseding record (`P66-D4-001`), which would drop a documented finding from the 144
   denominator and leave `P63-D4-010`'s `issue:` slot pointing at an issue that does not describe
   it; and filing both without stating the relationship, which would leave a triager two
   overlapping issues with no way to tell they are related. This preserves the 135/9 arithmetic and
   ISSUE-05's one-tracker-entry-per-record property. **This decision is one of the named items the
   `69-08` approval gate must put in front of the developer.**

3. **The `P64-D1-004` redaction limit.** Carried from that record's own cross-unit referral
   (`64-COVERAGE.md:1747`), which addresses Phase 69 by name. Its body states surface, problem
   class and impact only, and does not reconstruct the omitted detail from the surrounding
   workflow-security cells of `64-COVERAGE.md`, which describe the same steps at the same
   abstraction for a different purpose.

## Discrepancies

Both stated for the `69-08` gate to rule on, not silently absorbed:

1. **Title shape vs. `#497`-`#500`.** D-10 says titles are `<area>: <problem>` and cites
   `#497`-`#500` as the matched shape, but those four titles actually use a component prefix
   (`java-interop:`, `Completion:`, `Formatter:`, `Decompile:`), not an area-label prefix. Titles in
   this draft are rendered per D-10's literal rule (area-label prefix). If the developer prefers the
   component-prefix shape instead, the gate is the place to say so — changing it afterwards means
   editing filed titles on a public tracker.

2. **The 35-character area prefix.** Under D-10's literal rule, the 16 records with
   `area=BBj integration and infrastructure` get a 35-character title prefix
   (`BBj integration and infrastructure: `). Named here so it reads as deliberate rather than an
   oversight.

## Dedup baseline

The written baseline the `69-09` live re-query starts from (ISSUE-04):

**The 15 issues frozen in `INVENTORY.md` §"Frozen Open-Issue Snapshot"** (queried 2026-08-17):
`#33`, `#65`, `#83`, `#90`, `#108`, `#231`, `#381`, `#385`, `#410`, `#466`, `#472`, `#475`, `#476`,
`#485`, `#486`.

**The four issues opened mid-milestone:** `#497` (java-interop LRU eviction), `#498` (completion
`activeCancelToken` singleton), `#499` (formatter in-flight promise), `#500` (decompile `.lst`
freshness gate).

**Result:** none of the 144 records matches any of the four mid-milestone issues (grepped against
the corpus at context-gathering time).

This baseline does **not** discharge D-07 — the live re-query over open **and** closed issues still
runs immediately before the first create, in `69-09`.

## D1 security surface

All 33 D1-primary records, grouped under one heading so the security surface is visible as a
single block at the moment of approval. Nine route to advisories; 24 file exactly like every other
record, with no difference in template, labels, order or batch. A further 11 records carry D1 as a
*secondary* dimension and stay public (not listed below — this table is D1-*primary* only, per D-03).

| finding_id | severity | route | location |
|---|---|---|---|
| `P61-D1-001` | medium | public issue | `bbj-vscode/src/language/java-interop.ts:116-120` |
| `P61-D1-002` | medium | public issue | `bbj-vscode/src/language/java-interop.ts:598-644` |
| `P61-D1-003` | high | private draft advisory | `bbj-vscode/src/language/bbj-cpl-service.ts:82-155,228-235` |
| `P61-D1-004` | medium | public issue | `bbj-vscode/src/language/bbj-hover.ts:88-106, bbj-vscode/src/language/bbj-completion-provider.ts:670-691` |
| `P61-D1-005` | medium | public issue | `bbj-vscode/src/language/bbj-code-action-provider.ts:82-83, bbj-vscode/src/language/bbj-completion-provider.ts:99-113` |
| `P61-D1-006` | medium | public issue | `bbj-vscode/src/language/bbj-ws-manager.ts:53-55` |
| `P61-D1-007` | medium | public issue | `bbj-vscode/src/language/bbj-ws-manager.ts:118-126` |
| `P61-D1-008` | medium | public issue | `bbj-vscode/src/language/bbj-document-builder.ts:303-317` |
| `P61-D1-009` | low | public issue | `bbj-vscode/src/language/bbj-ws-manager.ts:231-241` |
| `P62-D1-001` | low | public issue | `bbj-vscode/src/msgbox-composer-webview.ts:82-119` |
| `P62-D1-002` | low | public issue | `bbj-vscode/src/msgbox-composer-webview.ts:366-373` |
| `P62-D1-003` | critical | private draft advisory | `bbj-vscode/src/Commands/Commands.cjs:263,325-328` |
| `P62-D1-004` | medium | public issue | `bbj-vscode/src/extension.ts:415,420,639` |
| `P62-D1-005` | low | public issue | `bbj-vscode/src/addwindow-composer.ts:195-282, bbj-vscode/src/addchildwindow-composer.ts:117-215, bbj-vscode/src/msgbox-composer.ts:145,162,410` |
| `P62-D1-006` | low | public issue | `bbj-vscode/src/document-formatter.ts:59` |
| `P62-D1-007` | low | public issue | `bbj-vscode/src/decompile-io.ts:15-27,29-35` |
| `P63-D1-001` | high | private draft advisory | `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34-35,110-117,47-59` |
| `P63-D1-002` | low | public issue | `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:52` |
| `P63-D1-003` | high | private draft advisory | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:103,BbjRunActionBase.java:302,BbjRunBuiAction.java:127,BbjRunDwcAction.java:127` |
| `P63-D1-004` | medium | public issue | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88` |
| `P63-D1-005` | medium | public issue | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:295,303,BbjEMLoginAction.java:96,104` |
| `P63-D1-006` | low | public issue | `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:107-115,172-196` |
| `P63-D1-007` | high | private draft advisory | `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:32,38-43,45-66` |
| `P63-D1-008` | low | public issue | `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-150` |
| `P64-D1-001` | medium | public issue | `bbj-vscode/tools/web.bbj:30-31` |
| `P64-D1-002` | high | private draft advisory | `bbj-vscode/tools/em-login.bbj:10-13,41-43` |
| `P64-D1-003` | high | private draft advisory | `bbj-vscode/tools/formatter/BBjCFCli.jar` |
| `P64-D1-004` | high | private draft advisory | `.github/workflows/preview.yml:96-102` |
| `P64-D1-005` | medium | public issue | `.github/workflows/preview.yml:8-10` |
| `P64-D1-006` | high | private draft advisory | `bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5` |
| `P65-D1-001` | low | public issue | `bbj-vscode/src/addwindow-composer-webview.ts:121-131, bbj-vscode/src/addchildwindow-composer-webview.ts:126-137` |
| `P65-D1-002` | medium | public issue | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:25-29` |
| `P65-D1-003` | medium | public issue | `bbj-vscode/src/extension.ts:339-366` |

## Index

<!-- ASSEMBLE: INDEX -->

## Bodies

<!-- ASSEMBLE: BODIES -->
