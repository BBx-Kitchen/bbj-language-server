# Phase 96: Platform Integration & Node.js Diagnosis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-19
**Phase:** 96-platform-integration-node-js-diagnosis
**Areas discussed:** Color Scheme page, Node diagnosis & fallback, Notification base scope, Windows attestation & pipeline

**Area selection:** all four offered gray areas were selected. A fifth — PLAT-01's TextMate bundle
cache — was presented in prose as Claude's default (a stable directory mirroring
`getNodeDataDirectory()`), offered twice for discussion, and left as discretion by choice.

---

## Color Scheme page (PLAT-02, #621)

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the page | Remove `BbjColorSettingsPage` and its `plugin.xml:236` registration — ROADMAP criterion 2's second branch. Nothing outside the file references the nine keys. | ✓ |
| Keep it, mark it inert | #621's third option; ROADMAP criterion 2 deliberately dropped this branch, so it would need the criterion amended. | |
| Wire semantic tokens | LSP4IJ semantic-token support plus a token→key map; lights at most 3 of 9 descriptors and contests TextMate for the same ranges. | |

**User's choice:** Delete the page
**Notes:** Scouting established that #621's "wire it up" branch is not actually reachable — IntelliJ's
TextMate engine offers no supported EP for a third-party plugin to remap scopes onto its own
`TextAttributesKey`s. The language server already registers `BBjSemanticTokenProvider`, but it emits
only `parameter`/`variable`/`keyword`.

| Option | Description | Selected |
|--------|-------------|----------|
| Replace the docs section | Rewrite `features.md:39-41` to say highlighting is TextMate-driven and follows the IDE theme. | ✓ |
| Delete the docs section | Remove the heading and its line; smallest edit, but leaves the reader's question unanswered. | |
| Leave docs, file a todo | Keeps the phase strictly inside `bbj-intellij/`; ships docs pointing at a removed page. | |

**User's choice:** Replace the section
**Notes:** Accepted as a deliberate small departure from STATE.md's "v4.4 is IntelliJ-only" constraint.

| Option | Description | Selected |
|--------|-------------|----------|
| UAT only | Hand-verify the BBj node is gone; no absence guard, so the deferred semantic-token route is not blocked by a guard it must first delete. | ✓ |
| Absence guard + UAT | `assertEquals(0, countOccurrences(pluginXml, "colorSettingsPage"))` — idiomatic here, but permanently pins "no color page". | |
| Guard with a documented escape | Same assertion, failure message naming the semantic-token route as the sanctioned exit. | |

**User's choice:** UAT only

| Option | Description | Selected |
|--------|-------------|----------|
| Done, cited reasoning | Deletion supersedes both of #621's branches; its acceptance criteria were too narrow. | ✓ |
| Done, plus amend the issue | Same close, but edit #621's acceptance criteria on GitHub first. | |
| Close as won't-fix | Honest about history, but understates what shipped. | |

**User's choice:** Done, cited reasoning
**Notes:** Follows the Phase 93 D-06 / 94 D-05 / 95 D-11 precedent.

---

## Node diagnosis & fallback (PLAT-04 #588, PLAT-05)

| Option | Description | Selected |
|--------|-------------|----------|
| One engine: route banner through the resolver | Banner stops calling `NodeAvailability.decide`, uses `NodeExecutableResolver.resolve` and its `Source`×`Reason` vocabulary; needs the missing version check added. | ✓ |
| Two engines, add the fallback | Minimal: `NodeAvailability`'s configured-unusable branch falls through to detector + cache. Leaves two engines and the version asymmetry. | |
| Keep today's behavior, fix the wording | ROADMAP criterion 4's second branch; contradicts REQUIREMENTS.md's PLAT-05 wording. | |

**User's choice:** One engine
**Notes:** Scouting found the two seams already disagree: `NodeExecutableResolver.resolve` falls
through a rejected configured path and `BbjLanguageServer:59` uses it, so the server already starts
off the cached download while the banner claims Node.js is required.

| Option | Description | Selected |
|--------|-------------|----------|
| Sixth validation step in the resolver | Version checked after "is executable", resolved via `BbjNodeVersionCache`. Observable: a too-old configured Node is now rejected at startup. | ✓ |
| Outside the resolver, per caller | Resolver stays filesystem-only; startup still launches on an unsupported Node. | |
| Injected predicate, defaulted off | Makes the disagreement explicit and permanent by design. | |

**User's choice:** Sixth validation step
**Notes:** Premise verified before asking — `meetsMinimumVersion` has exactly two callers, the banner
and the Settings field validator, and neither is the startup path.

| Option | Description | Selected |
|--------|-------------|----------|
| New Reason on the CACHED source | `Rejected(CACHED, CACHE_UNAVAILABLE, …)` surfaces in `rejections()` and `failureMessage()`. | ✓ |
| Sealed result from `getCachedNodePath()` | #588's own suggestion; a second vocabulary alongside `Source`/`Reason`. | |
| Log the swallowed IOException | #588's minimal branch; does not make the states distinguishable to callers. | |

**User's choice:** New Reason on the CACHED source

| Option | Description | Selected |
|--------|-------------|----------|
| Text and actions both vary | A `NodePresentation` seam returns the sentence plus which actions to offer; cache-inaccessible drops "Download Node.js". | ✓ |
| Text varies, actions fixed | Closest transplant of Phase 95's seam, but leaves the doomed download link in place. | |
| Text always, actions only when inaccessible | Narrowest change that still closes #588's scenario; a one-off special case. | |

**User's choice:** Text and actions both vary
**Notes:** #588's stated failure scenario is a user retrying a download doomed to fail at the same
directory-creation step — only a varying action set closes it.

---

## Notification base scope (PLAT-03, #622)

| Option | Description | Selected |
|--------|-------------|----------|
| All four, fix the guard | Fold in `BbjServerCrashNotificationProvider` and put every banner on the resolved-file-type guard. Overrides ROADMAP criterion 3 with recorded reasoning. | ✓ |
| Three only, per #622 | Criterion 3 holds literally; ships the `.bbl`/`.bbx` bug and keeps two file-guard conventions. | |
| All four, preserve exact semantics | Base carries an override whose only purpose is to preserve a known defect. | |

**User's choice:** All four, fix the guard
**Notes:** Scouting found the crash provider checks extensions `bbj|bbl|bbjt|src` while the file type
is registered for `bbj;bbjt;src;bbx` — so it fires on `.bbl` and misses `.bbx`. `BbjFileVisibility`'s
javadoc already documents why extension checks are wrong here.

| Option | Description | Selected |
|--------|-------------|----------|
| Normalize all three | All four become `DumbAware`, all construct the panel with `fileEditor`, `Status` stays a per-subclass hook. | ✓ |
| Base holds only what is identical | Zero extra behaviour change; base ends up nearly empty. | |
| Normalize the panel, leave DumbAware alone | Keeps the observable list shorter; leaves an unexplained asymmetry. | |

**User's choice:** Normalize all three
**Notes:** Adds a third observable change — the crash banner now appears during indexing, safe
because `isServerCrashed()` is a plain field read.

| Option | Description | Selected |
|--------|-------------|----------|
| Widen `BbjFileVisibility` | Make `isBbjProgramFileTypeName` public; one shared definition for widgets and banners. | ✓ |
| Use `BbjFileType.INSTANCE` in the base | No widening, no new coupling; leaves two definitions of "is this a BBj program file". | |
| Move all four providers into `ui` | Single definition, no widening; four `plugin.xml` FQN changes and four file moves. | |

**User's choice:** Widen `BbjFileVisibility`
**Notes:** Verified safe before asking — `BbjStatusBarWidgetSourceGuardTest:146` counts
`getFileType()` reads inside `BbjFileVisibility.java` only, and the base's read lives in its own file.

**Carried forward, not asked:** #622 closes as done on cited reasoning (four providers where the
issue named three), consistent with the #621 decision and the Phase 93/94/95 precedent.

---

## Windows attestation & pipeline (PLAT-06)

| Option | Description | Selected |
|--------|-------------|----------|
| You run it at phase end | Attest against the phase-final build, after all other PLAT work and any code-review fixes, per the ROADMAP ordering note. | ✓ |
| You run it, but earlier | Attest as soon as PLAT-04/05 are committed; earlier warning, likely re-attestation. | |
| No Windows machine available | PLAT-06 carries to a third milestone with the reason recorded. | |
| Someone else attests | Hand the four-step procedure to another person with Windows access. | |

**User's choice:** You run it at phase end

| Option | Description | Selected |
|--------|-------------|----------|
| WR-02 + WR-04 | The two that change what the attestation produces: a truthful `idea.log`, and an exact `node.exe` match on the Windows-only zip branch. | ✓ |
| All four pipeline findings | Also WR-01 (tar cancellation) and WR-03 (leaked stdin); both Unix-side. | |
| None — file them instead | Keeps the phase to its six requirements; risks WR-02 hiding why the attestation failed. | |
| All four plus WR-05 | Adds the Settings-dialog EDT fix, unrelated to the attestation. | |

**User's choice:** WR-02 + WR-04
**Notes:** All five findings were re-verified against current code on 2026-09-19 and confirmed still
open — they were not taken on trust from the v4.2-era review.

| Option | Description | Selected |
|--------|-------------|----------|
| Record outcome, don't block | Failure becomes a `WINDOWS.md` entry with `idea.log` and directory contents, and its own debug session or phase. | ✓ |
| Block until it passes | Strongest guarantee; risks stalling the phase and the release on an environment problem. | |
| Fix in-phase if it fails | Unbounded scope — the todo itself says the likely cause is Windows filesystem/ACL/proxy/AV behaviour. | |

**User's choice:** Record outcome, don't block
**Notes:** `workflow.windows_enforce` is not set in `.planning/config.json`, so a `WINDOWS.md` entry
does not currently block `/gsd-ship`.

---

## Claude's Discretion

- PLAT-01 (#613) in full — the stable cache directory, its staleness/invalidation key,
  concurrent-launch safety, and whether to sweep the `textmate-bbj*` directories earlier launches
  abandoned on users' disks. Offered for discussion twice and left as discretion.
- `NodeAvailability`'s fate and the disposition of its 10 pinned tests.
- Names and packages of the `NodePresentation` seam, its action-id vocabulary, and the notification
  base.
- Exact wording of each reason-specific banner sentence.
- Whether `BbjSettingsLookups`' field validator also routes through the unified resolver.
- How the base carries Phase 95's varying banner text, and how the broken guards are re-pointed.
- Whether `BbjMissingNodeNotificationSourceGuardTest` is rewritten in place or replaced.
- Whether IN-02 is folded alongside WR-04.
- Javadoc wording throughout.

## Deferred Ideas

- Semantic-token coloring in IntelliJ as a future phase.
- 83-REVIEW WR-01, WR-03, WR-05, IN-01 and IN-02 — all verified still open on 2026-09-19.
- Whether `.bbl` files should get BBj language support at all (a file-type-registration question).
- Reviewed but not folded: the gradle-wrapper-hygiene todo (fixed 2026-09-06, needs close-out) and
  the `getAllClassNames` live-interop todo (local environment drift, not IntelliJ work).
