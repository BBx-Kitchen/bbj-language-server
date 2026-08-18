---
phase: 63-intellij-plugin-review
verified: 2026-08-18T12:55:21Z
status: gaps_found
score: 3/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Every recorded finding carries file:line, dimension, and a verified failure scenario per the Phase 60 standard (ROADMAP SC3)"
    status: partial
    reason: >-
      One of the 62 findings (P63-D1-002) records a failure scenario that is empirically false —
      disproven on this machine against the JDK the project targets — so it does not clear its own
      declared `repro` evidence tier. Separately, 3 findings carry an `effort` value outside
      INVENTORY §3d's locked {2,4,8} scale, which the close-out discloses but does not correct.
    artifacts:
      - path: ".planning/reviews/63-COVERAGE.md"
        issue: >-
          P63-D1-002 (BbjNodeDownloader.java:149) claims `Files.copy(extractedNode, targetPath,
          REPLACE_EXISTING)` "follows [a symlink at targetPath] and overwrites the link's target
          rather than replacing the link itself". Verified empirically (Temurin 25.0.3, Linux,
          single-file Java probe): the symlink itself is replaced and the link's target file is left
          byte-identical. `LinkOption.NOFOLLOW_LINKS` in `Files.copy(Path,Path,...)` governs the
          SOURCE, not the target. The stated "redirects this copy's write to an arbitrary filesystem
          location" scenario does not occur.
      - path: ".planning/reviews/63-COVERAGE.md"
        issue: >-
          The same false mechanism is repeated outside the finding record — in the `RU-63-03` D1
          cell check line ("by not specifying LinkOption.NOFOLLOW_LINKS, follows a symlink if one is
          already present at targetPath") and in `### SEC-03 Integrity Posture` fact (4) — so the
          SEC-03 write-up carries the same incorrect statement.
      - path: ".planning/reviews/63-COVERAGE.md"
        issue: >-
          `effort:` values outside INVENTORY §3d's {2,4,8} scale: P63-D3-005 = 3, P63-D8-006 = 1,
          P63-D8-007 = 1. INVENTORY states the effort value IS the ISSUE-03 label "with no
          translation step", so Phase 69 has no label to apply for these three.
    missing:
      - >-
        Re-disposition P63-D1-002: either move it to `RU-63-03`'s `### Not-reproducible dispositions`
        (RVW-06 drop-vs-disposition rule), or rewrite it to the claim that IS true and evidenced —
        that the copy target is trusted with no ownership/provenance check before it is marked
        executable — and correct the two propagated restatements (D1 cell line, SEC-03 fact 4).
      - >-
        Normalize the 3 off-scale effort values to {2,4,8}, or record an explicit, accepted deviation
        from INVENTORY §3d so Phase 68/69 has a defined label for each.
deferred:
  - truth: "Whether extractTarGz's delegation to the system `tar` binary permits path traversal via a crafted archive entry"
    addressed_in: "Phase 65"
    evidence: >-
      Correctly recorded as `not-reproducible` under RU-63-03 per RVW-06 rather than dropped; Phase
      65 (Cross-Cutting Security Audit — "process spawning across both IDEs") is the milestone phase
      that owns the process-spawn surface this question sits on.
human_verification:
  - test: >-
      Decide whether the 3 off-scale `effort` values (P63-D3-005 = 3, P63-D8-006 = 1,
      P63-D8-007 = 1) are corrected to INVENTORY §3d's {2,4,8} scale or accepted as a recorded
      deviation via a verification override.
    expected: >-
      Either 62/62 findings carry an effort in {2,4,8}, or an `overrides:` entry documents the
      accepted deviation so Phase 69's ISSUE-03 labelling has a defined input.
    why_human: >-
      INVENTORY.md is immutable for the milestone and 63-COVERAGE.md's write contract barred plan
      63-05 from editing another plan's committed `### Findings` block — resolving this requires a
      human decision about which document gives way.
---

# Phase 63: IntelliJ Plugin Review Verification Report

**Phase Goal:** The IntelliJ plugin's 61 Java files (~6.6k LOC) are swept across all 8 review dimensions, including the security of its Node.js runtime download path.
**Verified:** 2026-08-18T12:55:21Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

Verification was performed goal-backward and independently: every gate the phase claims was
re-derived from the tree and from `INVENTORY.md` rather than read out of `63-COVERAGE.md`'s own
close-out, and 8 findings were re-read against the actual Java source.

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | All 61 files have a recorded pass/fail against D1-D8 | ✓ VERIFIED (Met) | Tree enumeration returns exactly 61 hand-written `.java` files (0 `.kt`, no test source set, no build output in scope). The 61 paths listed across the five `## RU-63-0N` sections are a **byte-identical set** to the tree (`diff` on sorted lists: no difference). Per-unit distribution 6/11/13/13/18 = 61 matches INVENTORY. Every file is referenced inside its own unit section beyond the file list (stopping rule ii) — programmatic check found 0 unreferenced. Cell gate re-derived from INVENTORY independently: `35 5 40`; the coverage file's own content independently counts 40 `- D[1-8]` cell lines = 35 pass/fail verdicts + 5 `n/a` carry-forwards, **0 `pending`**. All 35 verdict lines are substantive (shortest is 1,511 chars naming concrete checks; the 5 short lines are the verbatim `n/a` carry-forwards). `git diff c3b1783..HEAD -- bbj-intellij` is empty, so the swept tree is still the current tree. |
| 2 | `BbjNodeDownloader.java`'s integrity posture is documented — transport, checksum/signature, zip-slip | ✓ VERIFIED (Met) | `### SEC-03 Integrity Posture` covers all three required aspects plus cache trust and the executable-bit step. Re-verified against source: `:34-35` constants, `:104` URL build, `:110` `Files.createTempFile`, `:112-117` `HttpRequests.request(...).connect(...)` with no TrustManager/redirect override — transport claim accurate. `grep -nE "MessageDigest\|Checksum\|Signature\|SHA"` over the 290-line file returns **nothing** — the "none exists" claim is accurate. `extractZip` (`:167-188`) resolves the **hardcoded literal** `"node.exe"` at `:174`, not `entry.getName()`, and `break`s at `:183` — the "no zip-slip on this path" claim is accurate. `extractTarGz` (`:190-218`) shells out to `ProcessBuilder("tar","xzf",...,"--strip-components=1")` at `:192-196` with no entry validation of its own — the delegation claim is accurate, and the unprovable half is correctly parked under `### Not-reproducible dispositions`. See Findings note below for the one inaccurate sub-claim in fact (4). |
| 3 | Every recorded finding carries `file:line`, dimension, and a verified failure scenario | ✗ FAILED (Partially Met) | Mechanically strong: 62/62 records carry all 12 required fields non-blank; IDs unique and contiguous per dimension (D1 001-008, D2 001-016, D3 001-007, D4 001-014, D5 001, D6 001-002, D7 001-006, D8 001-008); **all 127 line references across all `location:` fields resolve inside real files** (0 out-of-range, 0 missing files). But **P63-D1-002's failure scenario is empirically false** (disproven below), so it does not clear its declared `repro` tier — and 3 findings carry an `effort` outside INVENTORY §3d's locked scale. |
| 4 | Every recorded finding has been checked against the 15 open GitHub issues | ✓ VERIFIED (Met) | 62/62 `dedup:` fields non-blank, every one resolving to a template-legal value: 58 `none`, 3 `#NNN partial-overlap` (P63-D7-002 → #65, P63-D7-005 → #475, P63-D7-006 → #65), 1 `DEBT-05` cross-reference (P63-D4-010). 29 findings name specific frozen-snapshot issue numbers checked-and-dismissed. See Observations for the weaker half. |

**Score:** 3/4 truths verified (0 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | Whether `extractTarGz`'s delegation to the system `tar` permits path traversal via a crafted archive entry | Phase 65 | Correctly recorded `not-reproducible` under RU-63-03 with a written reason (RVW-06 drop-vs-disposition), not dropped; Phase 65's goal covers "process spawning across both IDEs". |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.planning/reviews/63-COVERAGE.md` | Sole deliverable: grid, gates, 5 unit sweeps, 62 findings, close-out A-G | ✓ VERIFIED (substantive, wired) | 3,188 lines; all five `## RU-63-0N` sections filled; close-out sections A-G present; committed (working tree clean apart from `.gsd/`). |
| `.planning/reviews/INVENTORY.md` | Unmodified by this phase | ✓ VERIFIED | `git log -- .planning/reviews/INVENTORY.md` shows no commit after Phase 60; content matches what the coverage file carries forward verbatim. |
| `bbj-intellij/` source | Unmodified (read-only review) | ✓ VERIFIED | `git diff c3b1783..HEAD -- bbj-intellij` empty; `git status --porcelain bbj-intellij` empty. |
| `.planning/REQUIREMENTS.md` | RVW-04, SEC-03 marked complete | ✓ VERIFIED | Both `[x]` at lines 37/46 and `Complete` in the traceability table at 128/129. |
| `.planning/ROADMAP.md` | Phase 63 marked complete | ⚠️ PARTIAL | Line 190 still reads `- [ ] **Phase 63: IntelliJ Plugin Review**` while Phases 60-62 read `- [x] ... (completed …)`. Phase-detail block already says "5/5 plans executed". Bookkeeping only — see Observations. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `63-COVERAGE.md` grid | `INVENTORY.md` grid rows `RU-63-0[1-5]` | Cell-total awk re-derivation | ✓ WIRED | Independently re-run: `35 5 40` from INVENTORY, `35 5 40` from the coverage file's own cell lines. Agreement is real, not restated. |
| `63-COVERAGE.md` unit sections | `bbj-intellij/src/main/java/` tree | 61 file paths | ✓ WIRED | Listed set ≡ tree set (exact diff match). Not a superset, not a subset, no invented file. |
| Finding `location:` fields | Actual Java/Kotlin sources | `file:line` | ✓ WIRED | 127/127 line references land inside real files; 8 records re-read line-by-line against source with no reference error. |
| Inherited referral ledger (8 rows) | Per-unit `### Inherited referral triage` | Disposition column | ✓ WIRED | All 8 rows carry a non-`pending` disposition; rows 4+5 correctly merged to one (`P63-D7-005`); row 6 `not-reproducible` with reason. Header ledger and close-out section D agree row-for-row. |
| Finding `dedup:` fields | INVENTORY Frozen Open-Issue Snapshot | Issue numbers | ⚠️ PARTIAL | Legal and non-blank in all 62; but 33 of 62 assert "no frozen open issue names X" without naming any number, and 7 of the 15 frozen issues (#33, #83, #90, #108, #466, #472, #485) are never named anywhere in the file. |

### Behavioral Spot-Checks

Run in this verifier's own process; not read from SUMMARY.md.

| Behavior | Command | Result | Status |
|---|---|---|---|
| D-17 file gate (61 hand-written files) | `find bbj-intellij/src -name '*.java' -o -name '*.kt' \| wc -l` | `61` | ✓ PASS |
| Every file named in 63-COVERAGE.md | basename presence loop over all 61 | 0 missing | ✓ PASS |
| Listed set ≡ tree set | `diff` of sorted listed vs. actual paths | identical | ✓ PASS |
| Per-unit file naming (stopping rule ii) | per-section scan, file list excluded from haystack | 0 unreferenced | ✓ PASS |
| D-17 cell gate from INVENTORY | `awk` over `RU-63-0[1-5]` grid rows | `35 5 40` | ✓ PASS |
| Coverage file's own cell lines | count of `^- D[1-8] ` lines / verdicts / `n/a` | `40 / 35 / 5`, 0 `pending` | ✓ PASS |
| Finding count and split | field extraction over 62 fenced records | 62 findings, 10 `easy-fix`, 52 `major-refactor`, 0 duplicate IDs | ✓ PASS |
| Severity split | `severity:` tally | 0 critical, 4 high, 17 medium, 41 low — matches close-out §C | ✓ PASS |
| All `location:` line refs resolve | 127 refs checked against real file lengths | 0 out-of-range, 0 missing file | ✓ PASS |
| **P63-D1-002 symlink mechanism** | single-file Java probe on Temurin 25.0.3: create symlink at target → `Files.copy(src, target, REPLACE_EXISTING)` | `victim content after copy: ORIGINAL` / `target still symlink: false` / `target content: NEWCONTENT` | ✗ **FAIL — finding's claimed mechanism does not occur** |
| P63-D6-001 Node.js EOL evidence | `curl -s https://nodejs.org/dist/index.json` | latest v20 = `v20.20.2` (2026-03-24); `v20.18.1` = 2024-11-20, lts `Iron`, security `false`; later v20 security releases = exactly the 5 the finding names | ✓ PASS (evidence reproduces exactly) |
| Debt-marker gate on phase-modified files | `grep -nE "\bTBD\b\|\bFIXME\b\|\bXXX\b"` over `63-COVERAGE.md` + summaries | no matches | ✓ PASS |
| Gradle probe (context for D-07) | — | Not re-run; the phase's D-07 environment constraint (JDK 25.0.3 vs `VERSION_17`) is consistent with the local JDK (`Temurin 25.0.3`) and with the known project quirk | ? SKIP |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exists in this repository and no PLAN/SUMMARY declares a probe. **Step 7c: SKIPPED (no declared or conventional probes).** The phase's own gates were re-executed directly instead, as recorded in the table above.

### Finding Spot-Checks (source-level)

Ten records across four review units and five dimensions were re-read against the actual Java source.

| Finding | Claim | Source check | Verdict |
|---|---|---|---|
| P63-D1-001 (high, D1) | HTTPS from fixed host, no checksum/signature anywhere, cache trusted on every launch | `:34-35`, `:104`, `:110`, `:112-117`, `:47-59`, `:52` all exact; `grep` for `MessageDigest\|Checksum\|Signature` returns nothing in 290 lines | ✓ ACCURATE |
| **P63-D1-002 (low, D1)** | `Files.copy(..., REPLACE_EXISTING)` without `NOFOLLOW_LINKS` follows a symlink at `targetPath` and overwrites the link's **target** | `:149` line reference is exact, but the **behavior claim is false** — empirical probe shows the symlink itself is replaced and the victim file is untouched; `NOFOLLOW_LINKS` in `Files.copy(Path,Path,…)` applies to the source, not the target | ✗ **FALSE SCENARIO** |
| P63-D1-003 (high, D1) | EM password and JWT passed as process argv at 4 call sites | `BbjEMLoginAction.java:103` `cmd.addParameter(password)`, `BbjRunActionBase.java:302` `addParameter(token)`, `BbjRunBuiAction.java:127`, `BbjRunDwcAction.java:127` — all four exact; CWE-214 scenario real | ✓ ACCURATE |
| P63-D1-004 (medium, D1) | `isTokenExpired()` fails open on 3 branches; no signature verification in the 89-line file | `:64-66` (`parts.length != 3` → `return false`), `:76-77` (no `exp` → `false`), `:84-86` (catch → `false`); file is exactly 89 lines; no `Signature`/JWT library | ✓ ACCURATE |
| P63-D1-007 (high, D1) | `resolveNodePath()` falls back to bare literal `"node"`, launched with the project dir as CWD (CWE-426) | `:32`, `:38` `new GeneralCommandLine(nodePath, serverPath, "--stdio")`, `:40` `setWorkDirectory(new File(project.getBasePath()))`, `:45-66` with `return "node"` at `:65` — all exact | ✓ ACCURATE |
| P63-D1-008 (low, D1) | TCP-handshake-only liveness probe drives "Connected" | `:129-130` socket connect, `:132` `CONNECTED`, no read/write anywhere — accurate. `location:` says `:117-150`; the method actually spans `:117-160` (the record's own evidence says `:117-160`) | ✓ ACCURATE (minor range typo) |
| P63-D2-004 (high, D2) | `buildCommandLine()` runs on the EDT at `:60`, before the pooled-thread dispatch at `:67`; BUI/DWC chain reaches 10s + 15s blocking calls | `BbjRunActionBase.java:60` / `:67` exact; `BbjRunBuiAction.java:81` and `BbjRunDwcAction.java:81` call `validateTokenServerSide`, `:63`/`:95` call `BbjEMLoginAction.performLogin`; `:308` `runProcess(10000)`, `BbjEMLoginAction.java:115` `runProcess(15000)` | ✓ ACCURATE |
| P63-D2-005 (low, D2) | `BbjEMLoginAction` alone has no `update()`/`getActionUpdateThread()` | Confirmed: `BbjEMLoginAction.java` has neither; siblings do (three run subclasses inherit from `BbjRunActionBase`). Wording "all ten other actions … each of which explicitly declares" is loose (5 declare, 3 inherit, and `BbjEMTokenStore` is not an action) but the conclusion holds | ✓ ACCURATE (loose wording) |
| P63-D2-016 (medium, D2) | `BbjCommenter` returns `"REM "` while the grammar terminal is case-insensitive; `getCommentTokens()` is `TokenSet.EMPTY` | `BbjCommenter.java:9-11` returns `"REM "`; `bbj.langium:923` is `/([rR][eE][mM])…/`; `BbjParserDefinition.java:56-58` returns `TokenSet.EMPTY` — all exact (file is 36 lines, record says 37) | ✓ ACCURATE |
| P63-D7-001 (medium, D7) | `BbjCompileAction` is a `TODO` stub that never invokes `bbjcpl` | `:35` `// TODO: Implement language server custom notification for bbj.compile command`; `actionPerformed()` only calls `service.logToConsole(...)` | ✓ ACCURATE |

**9 of 10 spot-checks are accurate to the line.** The single failure is P63-D1-002.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| RVW-04 | 63-01..63-05 | `bbj-intellij/` reviewed across all 8 dimensions | ✓ SATISFIED | 61/61 files, 40/40 cells, 35 substantive verdicts independently re-derived |
| SEC-03 | 63-01 | Node.js download audited — transport, checksum/signature, zip-slip, cache trust | ✓ SATISFIED (with one inaccurate sub-claim) | All four aspects documented and source-verified; cache-trust aspect contains the false symlink mechanism (see gap) |

No orphaned requirements: `grep "Phase 63" .planning/REQUIREMENTS.md` maps only RVW-04 and SEC-03, both claimed by the phase's plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/reviews/63-COVERAGE.md` | 182-190 (P63-D1-002 record), RU-63-03 D1 cell line, SEC-03 fact (4) | Asserted-but-false runtime behavior presented as a cleared `repro`-tier trace | 🛑 Blocker | A `repro`-tier D1 finding that does not clear its tier. Phase 67/68/69 consume this file directly — as recorded it would produce a public GitHub issue describing a vulnerability that does not exist. |
| `.planning/reviews/63-COVERAGE.md` | P63-D3-005, P63-D8-006, P63-D8-007 | `effort:` outside INVENTORY §3d's `{2,4,8}` | ⚠️ Warning | Self-disclosed in close-out §C but uncorrected. INVENTORY states the effort value **is** the ISSUE-03 label with no translation step, so Phase 69 has no label for these three. |
| `.planning/ROADMAP.md` | 190 | Phase checkbox not advanced while REQUIREMENTS.md/STATE.md record the phase closed | ℹ️ Info | Bookkeeping drift against the Phase 60-62 convention (`[x] … (completed …)`). |
| `.planning/reviews/63-COVERAGE.md` | 33 `dedup:` fields | "no frozen open issue names X" without naming a number | ℹ️ Info | Template-legal, but the check is asserted rather than enumerated for just over half the findings. |

No `TBD`/`FIXME`/`XXX` markers in any file this phase modified. No source file was modified by the phase (confirmed independently, not from the summary).

### Human Verification Required

#### 1. Resolve the off-scale `effort` values

**Test:** Decide whether P63-D3-005 (`effort: 3`), P63-D8-006 (`effort: 1`) and P63-D8-007 (`effort: 1`) are normalized to INVENTORY §3d's `{2, 4, 8}` scale, or accepted as a recorded deviation.
**Expected:** Either 62/62 findings carry an effort in `{2,4,8}`, or an `overrides:` entry in this file documents the accepted deviation so Phase 69's ISSUE-03 labelling has a defined input for all 62.
**Why human:** `INVENTORY.md` is immutable for the milestone and `63-COVERAGE.md`'s own write contract barred plan `63-05` from editing another plan's already-committed `### Findings` block. Resolving this requires a human decision about which document gives way — the verifier cannot choose.

**If this deviation is intentional**, add to this file's frontmatter and re-run verification:

```yaml
overrides:
  - must_have: "Every recorded finding carries file:line, dimension, and a verified failure scenario per the Phase 60 standard"
    reason: "Three findings' effort values (1, 1, 3) deviate from INVENTORY §3d's {2,4,8} scale; accepted as recorded, Phase 69 will round to the nearest label"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

Note that an override on the effort scale does **not** clear the P63-D1-002 gap — that is a factual error, not an intentional deviation, and should be corrected rather than accepted.

### Gaps Summary

Phase 63 delivered a genuinely thorough sweep. Both D-17 gates survive independent re-derivation
rather than merely being restated: the tree contains exactly **61** hand-written Java files (0
Kotlin, no test source set), the set named in `63-COVERAGE.md` is **byte-identical** to the tree, and
INVENTORY's Phase 63 grid slice re-derives to **35 applies / 5 n/a / 40 cells**, matching the
coverage file's own 40 cell lines with **0 `pending`** placeholders. All 62 findings carry the full
13-field record shape, IDs are unique and contiguous per dimension, and **all 127 `file:line`
references land inside real files**. The 62-finding / 10-easy / 52-major accounting reproduces
exactly. The close-out is unusually honest — it surfaces its own effort-scale violation rather than
hiding it, and parks the unprovable `tar` path-traversal question under `not-reproducible` instead of
inflating the finding count.

The gap is a quality defect inside that otherwise-solid corpus, and it sits on the phase's highest-
stakes surface. **P63-D1-002's failure scenario is false.** The record claims that
`Files.copy(extractedNode, targetPath, REPLACE_EXISTING)` at `BbjNodeDownloader.java:149` "follows"
a symlink at the target and "overwrites the link's target rather than replacing the link itself",
enabling a redirected write to an arbitrary location. Executed against the JDK on this machine, the
opposite happens: the symlink is replaced and the pointed-to file is left byte-identical.
`LinkOption.NOFOLLOW_LINKS` in `Files.copy(Path,Path,…)` governs the **source**, not the target, so
the named fix does not address the named problem either. The same incorrect mechanism is restated
twice more — in the `RU-63-03` D1 cell check line and in `### SEC-03 Integrity Posture` fact (4) —
so the SEC-03 write-up that requirement SEC-03 rests on carries it too. Because `63-COVERAGE.md`
feeds Phase 67's apply path and Phase 69's issue-filing path unmodified, this would surface publicly
as a security issue against `bbj-intellij` that does not exist. It should be re-dispositioned under
`### Not-reproducible dispositions`, or rewritten to the claim that **is** evidenced and true — that
the copy target is trusted with no ownership or provenance check before `setExecutable(true)`.

The secondary gap is the three off-scale `effort` values, which the phase disclosed but could not
correct within its own write contract; that needs a human decision (see above).

Success criteria 1, 2 and 4 are **Met**. Criterion 3 is **Partially Met**: mechanically complete and
9-of-10 spot-checks accurate to the line, but one recorded finding's failure scenario is not verified
— it is disproven — and three records violate the locked effort scale.

---

_Verified: 2026-08-18T12:55:21Z_
_Verifier: Claude (gsd-verifier)_
