---
phase: 63-intellij-plugin-review
verified: 2026-08-18T13:12:40Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "P63-D1-002's false symlink-following failure scenario — withdrawn in place and the finding rewritten to the true, source-verified cache-read trust defect at BbjNodeDownloader.java:52"
    - "Three off-scale effort values (P63-D3-005=3, P63-D8-006=1, P63-D8-007=1) — all normalized to 2, INVENTORY §3d scale now clean at 20/29/13"
  gaps_remaining: []
  regressions: []
  fix_commit: f14ffb9
deferred:
  - truth: "Whether extractTarGz's delegation to the system `tar` binary permits path traversal via a crafted archive entry"
    addressed_in: "Phase 65"
    evidence: >-
      Recorded as `not-reproducible` under RU-63-03 with a written reason (RVW-06 drop-vs-disposition
      rule), not dropped; Phase 65's goal covers "process spawning across both IDEs".
---

# Phase 63: IntelliJ Plugin Review Verification Report

**Phase Goal:** The IntelliJ plugin's 61 Java files (~6.6k LOC) are swept across all 8 review dimensions, including the security of its Node.js runtime download path.
**Verified:** 2026-08-18T13:12:40Z (re-verification after `f14ffb9`)
**Status:** passed
**Re-verification:** Yes — after gap closure. Initial verification at 2026-08-18T12:55:21Z returned `gaps_found` (3/4).

## Verdict

**Phase 63 passes.** All four ROADMAP success criteria are Met, both D-17 gates hold under
independent re-derivation, and both gaps raised by the initial verification are closed and
source-verified. Phase 63 can be marked complete in `ROADMAP.md`.

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | All 61 files have a recorded pass/fail against D1-D8 | ✓ VERIFIED (Met) | Re-run post-fix: tree holds exactly **61** hand-written `.java` files (0 Kotlin, no test source set); the set named across the five `## RU-63-0N` sections is a **byte-identical set match** to the tree. Cell gate re-derived from INVENTORY: `35 5 40`; coverage file's own content: 40 cell lines = 35 pass/fail verdicts + 5 verbatim `n/a`, **0 `pending`**. Unchanged by the fix commit. |
| 2 | `BbjNodeDownloader.java`'s integrity posture is documented — transport, checksum/signature, zip-slip | ✓ VERIFIED (Met) | All three required aspects present and source-accurate (see initial report). Fact (4) cache trust now carries an in-place withdrawal of the refuted symlink clause and correctly identifies its load-bearing half as the `exists && isExecutable` trust decision at `:52`. |
| 3 | Every recorded finding carries `file:line`, dimension, and a verified failure scenario | ✓ VERIFIED (Met) — **was FAILED** | 62/62 records carry all 12 required fields non-blank; IDs unique and contiguous per dimension; **127/127 `location:` line references resolve inside real files**; effort now legal in all 62. The single false failure scenario is gone — P63-D1-002's replacement claim is verified true against source below. |
| 4 | Every recorded finding has been checked against the 15 open GitHub issues | ✓ VERIFIED (Met) | 62/62 `dedup:` non-blank and template-legal: 58 `none`, 3 `#NNN partial-overlap`, 1 `DEBT-05` cross-reference. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

## Confirmations Requested by the Coordinator

### 1. No residual statement of the false symlink mechanism — ✓ CONFIRMED (with a count correction)

Independent scan for every occurrence of `follow`/`symlink`/`symbolic`/`NOFOLLOW` across all 3,243
lines, then per-hit adjudication:

| Line | Text | Adjudication |
|---|---|---|
| 99 (`RU-63-03` D1 cell) | "a symlink already present at `targetPath` is *replaced*, not followed — the contrary claim originally recorded here was refuted by direct reproduction during verification and withdrawn" | ✓ States the **correct** behavior |
| 118 (SEC-03 fact 4) | "(An earlier version of this fact added that a symlink at `targetPath` would be *followed* … that was refuted … and is withdrawn.)" | ✓ Withdrawal-in-place — restates the wording, asserts nothing |
| 182 (`revised:`) | "previously asserted a symlink-following mechanism at :149. That mechanism is FALSE and was withdrawn" | ✓ Withdrawal marker |
| 188-189 (`corrected_claim:`) | verbatim quote of the withdrawn assertion | ✓ The audit quote |
| 194-195 (`corrected_claim:`) | reproduction output: `victim content: ORIGINAL`, `target is symlink: false` | ✓ The refutation |

**Zero assertions of the false mechanism survive.** One correction to your count: there are **two**
restatements of the withdrawn wording, not one — `corrected_claim` (the quote you counted) **and**
SEC-03 fact (4)'s parenthetical at line 118. Both are unambiguously framed as refuted-and-withdrawn,
so both are correct as written; I flag the count only so the record is exact. Line 99, which
previously carried the assertion, now states the opposite and is correct.

### 2. The rewritten P63-D1-002 claim is true against source — ✓ CONFIRMED

Every element re-checked against `BbjNodeDownloader.java` and its callers:

| Claim | Source check | Verdict |
|---|---|---|
| `:52` is the entire trust decision | `getCachedNodePath()` `:47-59`: resolves at `:50`, and `if (Files.exists(nodePath) && Files.isExecutable(nodePath)) return nodePath;` at `:52-53`. Nothing else gates the return. | ✓ TRUE |
| No verification exists elsewhere in the file | `grep -nE "MessageDigest\|Checksum\|Signature\|digest\|sha\|SHA\|--version\|getNodeVersion\|length()\|size()\|NOFOLLOW"` over the file → **no matches**. File is exactly **290** lines, as the record states. | ✓ TRUE |
| Cache path is `<plugins>/bbj-intellij-data/nodejs` | `:244` `Paths.get(PathManager.getPluginsPath(), "bbj-intellij-data", "nodejs")` — exact, and `:243-246` is the right range | ✓ TRUE |
| The cache-hit path skips the download | Both callers verified. `BbjLanguageServer.resolveNodePath()` `:59-62`: `if (cachedNode != null) return cachedNode.toString();` — returned straight into `new GeneralCommandLine(nodePath, serverPath, "--stdio")` (`:38`) with no download and no check. `BbjMissingNodeNotificationProvider` `:55-58`: a non-null cache hit `return null`s, suppressing the "Download Node.js" prompt entirely. | ✓ TRUE |
| Plugin's own code marks it executable at `:153` | `targetPath.toFile().setExecutable(true)` at `:153`, non-Windows branch | ✓ TRUE |
| `location:` moved to `:52` | Field reads `BbjNodeDownloader.java:52` | ✓ TRUE |

The `revised:`/`corrected_claim:` fields are a good call — the withdrawal is auditable rather than a
silent deletion, and `corrected_claim` records the reproduction output verbatim, so a Phase 68/69
reader can see why the original claim was dropped without re-deriving it.

**One precision note, not a defect.** The failure scenario reads "On the next IDE launch
`getCachedNodePath()` returns it". `resolveNodePath()` consults settings (`:47-50`) and PATH
auto-detection (`:52-56`) *before* the cache (`:58-62`), so the cache branch is reached only when
both miss. That is precisely the population the finding is about — a user whose node came from the
plugin's own Download button is by definition one for whom detection failed — so the scenario is
sound as written.

### 3. P63-D1-001 and P63-D1-002 are genuinely distinct — ✓ CONFIRMED

Neither subsumes the other, on three independent tests:

- **Different code paths.** D1-001 covers bytes arriving over the network (`:110-117` → extraction). D1-002 covers bytes read back from disk (`:47-59`). The cache-hit path never executes the download path at all — verified at both call sites above.
- **Different fixes, separately applicable.** D1-001's named edit is "compare a published SHASUMS256.txt entry before extraction" (effort 8). D1-002's is "record the downloaded binary's digest alongside the cache and re-verify in `getCachedNodePath()`, or at minimum probe `node --version` against `NODE_VERSION`" (effort 2). Applying either leaves the other's path unguarded.
- **Different threat entry points.** D1-001 needs influence over the transport or the origin; D1-002 needs only local write access to a predictable, non-randomised directory — and, as the record correctly stresses, on that path D1-001's absent checksum "is not merely insufficient, it is never reached."

The new `dedup:` wording ("Distinct from P63-D1-001 … the two are separately fixable and neither subsumes the other") is accurate.

**Accepted-not-actioned observation:** D1-001 was correctly left untouched, but its `location:` still lists `:47-59` and its `evidence:` still narrates the cache-read trust — territory that now belongs to D1-002. Presentational overlap only; D1-002's `dedup:` draws the line explicitly. Worth a glance at Phase 68 assembly so the two records don't read as duplicates.

### 4. Both D-17 gates hold and counts are unchanged — ✓ CONFIRMED

Every number re-derived post-fix, not read from the close-out:

| Check | Command | Result | Expected | Status |
|---|---|---|---|---|
| File gate | `find bbj-intellij/src -name '*.java' -o -name '*.kt'` | `61` | 61 | ✓ |
| Listed set ≡ tree set | `diff` of sorted listed vs. actual | identical | identical | ✓ |
| Cell gate (INVENTORY) | `awk` over `RU-63-0[1-5]` rows | `35 5 40` | 35/5/40 | ✓ |
| Cell lines in coverage | `grep -cE '^- D[1-8] '` | `40` | 40 | ✓ |
| Pass/fail verdicts | `grep -cE '… — (pass\|fail) — '` | `35` | 35 | ✓ |
| `n/a` carry-forwards | `grep -cE '… — n/a — '` | `5` | 5 | ✓ |
| Placeholders | `grep -cE '… — pending$'` | `0` | 0 | ✓ |
| Findings | `grep -c '^id: '` | `62` | 62 | ✓ |
| Duplicate IDs | set comparison | none | none | ✓ |
| Per-dimension contiguity | seq check D1-D8 | 8/16/7/14/1/2/6/8, all contiguous from 001 | — | ✓ |
| **Effort distribution** | `effort:` tally | **20 × `2`, 29 × `4`, 13 × `8`** | 20/29/13 | ✓ |
| **Off-scale efforts** | values outside `{2,4,8}` | **0** | 0 | ✓ |
| Classification | `classification:` tally | 10 `easy`, 52 `major` | 10/52 | ✓ |
| Disposition | `disposition:` tally | 10 `easy-fix`, 52 `major-refactor` | 10/52 | ✓ |
| Severity | `severity:` tally | 0 critical, 4 high, 17 medium, 41 low | unchanged | ✓ |
| Blank `dedup:` | `grep -cE '^dedup: *$'` | `0` | 0 | ✓ |
| All line refs resolve | 127 refs vs. real file lengths | 0 out-of-range, 0 missing file | 0 | ✓ |
| Required fields | 12-field check over all 62 records | 0 missing, 0 blank | 0 | ✓ |
| Debt markers | `TBD\|FIXME\|XXX` in phase-modified files | none | none | ✓ |

No regressions: the fix commit touched only `63-COVERAGE.md` (+92/−37), and every count above is
identical to the pre-fix run except the effort distribution, which moved from `17/29/13 + 3 off-scale`
to `20/29/13 + 0 off-scale` exactly as described.

**Note on the effort-field shape.** The three revised records read `effort: 2 (revised 2026-08-18: recorded as 3 …)`
— the legal value leads and the rationale follows inline. That matches the file's established
recording shape, which INVENTORY's own worked example sanctions for `classification:` (value, then
the six D-13 tests as prose) and which `dedup:`/`disposition:` already use. A naive
`grep -oE '^effort: +[0-9]+'` extracts `2` correctly. No change needed; noted so Phase 69's label
extraction takes the leading token rather than the whole field.

### 5. The unqualified `tar` executable — RECOMMENDATION: do not file. The distinction is defensible.

I raised this in the initial report; on investigation the asymmetry has a real technical basis rather
than being an oversight.

The property that makes P63-D1-007 a genuine CWE-426 is **not** the unqualified name on its own — it
is the unqualified name **combined with an explicitly-set untrusted working directory**, on a
platform whose process-creation API searches that directory:

- `BbjLanguageServer` `:38` builds `new GeneralCommandLine("node", …)` and `:40` calls `cmd.setWorkDirectory(new File(project.getBasePath()))` — the CWD is set to workspace-controlled content, and on Windows `CreateProcess` searches the CWD. That is the hazard, and it is correctly filed.
- `extractTarGz` `:192-196` builds `new ProcessBuilder("tar", "xzf", …)` with **no `directory()` call anywhere in the file** (verified: `grep -n "\.directory("` → no matches), so the child inherits the IDE's own CWD, not a project directory. And it is reached **only on the non-Windows branch** — `:125-129` dispatches `extractZip` on Windows and `extractTarGz` otherwise. On macOS/Linux, `ProcessBuilder` resolves an unqualified name through `PATH` only; the CWD is not searched.

So the CWE-426 shape simply does not exist on the platforms where `extractTarGz` runs. What remains is
an ordinary dependency on the integrity of the user's own `PATH` — the same trust the plugin already
places in it at `BbjNodeDetector.java:27` (`PathEnvironmentVariableUtil.findInPath("node")`) and that
the IDE places in it generally. Filing that would be a bare assertion, which INVENTORY §3b explicitly
rules out as a finding.

**Recommendation:** do not file it, and do not reopen the phase for it. Instead, when Phase 68
assembles the coverage statement, add one clause to SEC-03 fact (3) recording *why* it was not
filed — no CWD is set and the path is non-Windows-only, so PATH integrity is the only dependency.
That is a sentence, not a finding, and it closes the loop against INVENTORY's own "re-report risk"
concern: without it, a Phase 68/69 reader will re-derive this exact question and may re-report it.

## Accepted-Not-Actioned Observations

Carried forward from the initial report; each verified as still present and each judged not worth a
gap. Recorded here so they are visible to Phase 68/69 rather than lost.

| # | Observation | Assessment |
|---|---|---|
| 1 | `P63-D1-008` `location:` reads `:117-150`; `checkConnection()` actually spans `:117-160` (the record's own `evidence:` says `:117-160`) | Cosmetic range typo; start line correct, claim accurate |
| 2 | `P63-D2-016` calls `BbjCommenter.java` a "37-line file"; it is 36 lines | Off-by-one in prose; the finding's substance is exact |
| 3 | `P63-D2-005`'s "all ten other actions … each of which explicitly declares `ActionUpdateThread.BGT`" | Loose: 5 declare it, 3 inherit it from `BbjRunActionBase`, and `BbjEMTokenStore` is a utility, not an action. Conclusion (only `BbjEMLoginAction` lacks enablement gating) holds |
| 4 | 33 of 62 `dedup:` fields assert "no frozen open issue names X" without naming a number; 7 of the 15 frozen issues (#33, #83, #90, #108, #466, #472, #485) are never named anywhere | Template-legal (`none` is a legal value with a reason) but asserted rather than enumerated for just over half the corpus. Phase 69 re-queries the tracker live before filing, which backstops it |
| 5 | `P63-D1-001` still lists `:47-59` in `location:` and narrates the cache-read trust in `evidence:`, now D1-002's territory | Presentational overlap only; D1-002's `dedup:` draws the boundary explicitly |
| 6 | Revised `effort:` fields carry an inline parenthetical after the legal value | Matches the file's sanctioned recording shape; leading-token extraction is unaffected |

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| RVW-04 | `bbj-intellij/` reviewed across all 8 dimensions | ✓ SATISFIED | 61/61 files, 40/40 cells, 35 substantive verdicts, all independently re-derived |
| SEC-03 | Node.js download audited — transport, checksum/signature, zip-slip, cache trust | ✓ SATISFIED | All four aspects documented and source-verified; the cache-trust aspect is now correct after the fix |

No orphaned requirements — REQUIREMENTS.md maps only RVW-04 and SEC-03 to Phase 63, both claimed and
both marked `Complete`.

## Outstanding Action (bookkeeping, not a gap)

`ROADMAP.md:190` still reads `- [ ] **Phase 63: IntelliJ Plugin Review**` while Phases 60-62 read
`- [x] … (completed …)`. REQUIREMENTS.md and STATE.md already record the phase as closed. With this
verification passing, the checkbox can be advanced to match the Phase 60-62 convention.

## Summary

The two gaps are closed, and closed well. The P63-D1-002 rewrite is the better of the two available
repairs: rather than demoting a finding whose *surface* was real, it relocated the claim to the
defect that actually exists — the cache **read** path, where `Files.exists && Files.isExecutable`
at `:52` is the entire trust decision and where every launch after the first bypasses the download
and therefore P63-D1-001's absent checksum entirely. I verified each element of that claim against
source: `:52` really is the whole gate, no verification primitive of any kind exists in the file's
290 lines, `:244` really resolves to `<plugins>/bbj-intellij-data/nodejs`, and both callers really
do short-circuit on a cache hit. The `revised:`/`corrected_claim:` fields make the withdrawal
auditable instead of silent, which is the right instinct for a file that feeds public issue filing.
Zero assertions of the false mechanism survive anywhere; the two places that restate its wording
both frame it explicitly as refuted.

The effort normalization is clean — 20/29/13 across `{2,4,8}`, zero off-scale — and the rounding
rationale is recorded per record rather than only in the close-out.

Everything else held under re-derivation with no regression: 61/61 file gate by exact set match,
35/5/40 cell gate from three independent sources, 62 findings, 127/127 line references resolving,
0 blank fields, 0 duplicate IDs, 0 placeholders. On the `tar` question I recommend not filing — the
CWE-426 shape that justifies P63-D1-007 genuinely does not exist there, since no working directory
is set and the path runs only on platforms that do not search the CWD — with a one-clause note at
Phase 68 to stop the question being re-derived downstream.

**Phase 63 achieves its goal. Mark it complete.**

---

_Verified: 2026-08-18T13:12:40Z_
_Verifier: Claude (gsd-verifier)_
_Supersedes: initial verification 2026-08-18T12:55:21Z (gaps_found, 3/4)_
