# v0.16.0 Release Notes — Curation Record

Captured before any edit. Nothing in this file has been applied to the live release yet.

## As published by the workflow (do not lose this)

Captured via `gh release view v0.16.0 --repo BBx-Kitchen/bbj-language-server --json body --jq '.body'`.
This is byte-identical to the live release body at capture time.

```
## Installation

### VS Code
Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang) or download the `.vsix` file below and install via **Extensions > ... > Install from VSIX...**

### IntelliJ IDEA
Install from [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/30033-bbj-language-support) (may take a few days for review) or download `bbj-intellij-0.16.0.zip` from the Assets below and install via **Settings > Plugins > ⚙ > Install Plugin from Disk...**

---


## What's Changed
* fix(vscode): unify logger output format by @Tiancheng-Xu in https://github.com/BBx-Kitchen/bbj-language-server/pull/665
* fix(intellij): classify the EM token backend from the public password-safe API, and run verifyPlugin in CI by @StephanWald in https://github.com/BBx-Kitchen/bbj-language-server/pull/674
* Release 0.16.0: v4.4 IntelliJ Focus (milestone #7) by @StephanWald in https://github.com/BBx-Kitchen/bbj-language-server/pull/679

## New Contributors
* @Tiancheng-Xu made their first contribution in https://github.com/BBx-Kitchen/bbj-language-server/pull/665

**Full Changelog**: https://github.com/BBx-Kitchen/bbj-language-server/compare/v0.15.0...v0.16.0
```

The `## Installation` block above (through the first `---`) is the part that must reappear
unchanged after the edit. The `## What's Changed` / `## New Contributors` / `Full Changelog` lines
below it are the auto-generated commit list — per the plan, this gets **replaced**, not appended to,
by the curated text below.

## Draft for approval

0.16.0 closes out milestone v4.4, an IntelliJ-focused reliability and cleanup release. It fixes
nine concrete failure scenarios you may have hit in the plugin, removes one settings page that
never worked, and improves how the plugin explains Node.js problems — with ten further internal
clean-ups that change nothing you'll notice.

### Fixes

- The BBj composer no longer shows an "IDE Internal Error" balloon when the server returns a
  malformed or partial catalog response — it now shows the same graceful "not ready" message a
  fully-null response already produced (#609)
- Text typed into a composer dialog that would break BBj statement syntax is now rejected or
  escaped before it reaches your source file (#607)
- A malformed hex edit in the composer no longer throws an internal array-bounds error — it now
  fails gracefully (#591)
- An Enterprise Manager login temp file is now deleted even if the process launch before cleanup
  fails, so no partially-written login output is left on disk (#590)
- "Login to Enterprise Manager" now correctly enables and disables based on whether a project is
  open, and updates its state off the UI thread like its sibling actions — it previously had
  neither check (#589)
- A java-interop health check already running when a project closes no longer touches the disposed
  project (#592)
- The java-interop status poll now stops re-arming while no BBj file is selected, instead of
  probing every 5 seconds for the life of the project. Window-focus gating was deliberately left
  out — no such API exists in the plugin today — so an IDE left open on a BBj file still polls (#593)
- The status bar now reports "Java: Connected" only when the listening peer is confirmed to
  actually be java-interop, not merely because a network handshake succeeded (#587)
- The IntelliJ TextMate bundle now reuses a cached directory across IDE launches instead of
  allocating and re-copying a fresh temp directory every time, and abandoned directories are
  cleaned up (#613)

### Under the hood

Ten further internal, behavior-preserving consolidations landed across the composer, Enterprise
Manager, and java-interop/platform-integration code — shared base classes and helpers replacing
duplicated logic, with no observable change for users (#630, #619, #618, #616, #617, #615, #614,
#594, #620, #622).

### Removed

The Settings > Editor > Color Scheme > BBj customization page has been removed (#621). It never
changed editor highlighting — BBj syntax highlighting is driven entirely by the bundled TextMate
grammar and follows your active IDE theme. To change how BBj code looks, change your IDE theme.

### Node.js

"Node.js not yet downloaded" and "Node.js cache directory inaccessible" are now distinguishable
(#588), so you're shown the right diagnosis instead of being pointed at a download that will fail
the same way again — the cache-inaccessible case no longer offers a "Download Node.js" action that
was always going to fail. A configured Node.js path that turns out to be unusable now falls back to
a previously cached download before the plugin gives up and shows the "Node.js required" banner.

### Also in this release

- The IntelliJ log is cleaner: no more "Unsupported notification method: bbj/bbjcplAvailability"
  warning printed on every server start.
- The optional Node.js download no longer logs an exception trace for a routine progress-indicator
  state change.

## Installation

### VS Code
Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang) or download the `.vsix` file below and install via **Extensions > ... > Install from VSIX...**

### IntelliJ IDEA
Install from [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/30033-bbj-language-support) (may take a few days for review) or download `bbj-intellij-0.16.0.zip` from the Assets below and install via **Settings > Plugins > ⚙ > Install Plugin from Disk...**

---

## As applied (2026-09-20)

**Deviation from the plan as originally written:** Task 2's blocking-human checkpoint was answered
by the maintainer with "Approve + keep auto block (Recommended)" — the curated summary above is
approved verbatim, but the plan's Task 3 instruction to *replace* the release body wholesale is
narrowed: GitHub's own auto-generated block (`## What's Changed`, `## New Contributors`,
`Full Changelog`) is **kept**, not dropped, so contributor credit for @Tiancheng-Xu's and
@StephanWald's PRs stays visible. Maintainer's stated reason: contributor credit.

The body actually applied is, in order: the curated summary (as drafted above) → the existing
auto-generated block (verbatim from the live body at capture time) → the `## Installation` block
(verbatim from the live body, its trailing `---` rule dropped since it no longer terminates the
document). The draft's hard-wrapped lines within paragraphs and bullets were unwrapped to single
lines per list item / paragraph before applying — GitHub renders a single newline inside a release
body as a visible line break, and the drafted text was wrapped for readability in this file, not
for the rendered page; wording is unchanged from "Draft for approval" above.

Applied via exactly one command:

```
gh release edit v0.16.0 --repo BBx-Kitchen/bbj-language-server --notes-file <scratch-file>
```

The exact text supplied to `--notes-file` was:

```
0.16.0 closes out milestone v4.4, an IntelliJ-focused reliability and cleanup release. It fixes nine concrete failure scenarios you may have hit in the plugin, removes one settings page that never worked, and improves how the plugin explains Node.js problems — with ten further internal clean-ups that change nothing you'll notice.

### Fixes

- The BBj composer no longer shows an "IDE Internal Error" balloon when the server returns a malformed or partial catalog response — it now shows the same graceful "not ready" message a fully-null response already produced (#609)
- Text typed into a composer dialog that would break BBj statement syntax is now rejected or escaped before it reaches your source file (#607)
- A malformed hex edit in the composer no longer throws an internal array-bounds error — it now fails gracefully (#591)
- An Enterprise Manager login temp file is now deleted even if the process launch before cleanup fails, so no partially-written login output is left on disk (#590)
- "Login to Enterprise Manager" now correctly enables and disables based on whether a project is open, and updates its state off the UI thread like its sibling actions — it previously had neither check (#589)
- A java-interop health check already running when a project closes no longer touches the disposed project (#592)
- The java-interop status poll now stops re-arming while no BBj file is selected, instead of probing every 5 seconds for the life of the project. Window-focus gating was deliberately left out — no such API exists in the plugin today — so an IDE left open on a BBj file still polls (#593)
- The status bar now reports "Java: Connected" only when the listening peer is confirmed to actually be java-interop, not merely because a network handshake succeeded (#587)
- The IntelliJ TextMate bundle now reuses a cached directory across IDE launches instead of allocating and re-copying a fresh temp directory every time, and abandoned directories are cleaned up (#613)

### Under the hood

Ten further internal, behavior-preserving consolidations landed across the composer, Enterprise Manager, and java-interop/platform-integration code — shared base classes and helpers replacing duplicated logic, with no observable change for users (#630, #619, #618, #616, #617, #615, #614, #594, #620, #622).

### Removed

The Settings > Editor > Color Scheme > BBj customization page has been removed (#621). It never changed editor highlighting — BBj syntax highlighting is driven entirely by the bundled TextMate grammar and follows your active IDE theme. To change how BBj code looks, change your IDE theme.

### Node.js

"Node.js not yet downloaded" and "Node.js cache directory inaccessible" are now distinguishable (#588), so you're shown the right diagnosis instead of being pointed at a download that will fail the same way again — the cache-inaccessible case no longer offers a "Download Node.js" action that was always going to fail. A configured Node.js path that turns out to be unusable now falls back to a previously cached download before the plugin gives up and shows the "Node.js required" banner.

### Also in this release

- The IntelliJ log is cleaner: no more "Unsupported notification method: bbj/bbjcplAvailability" warning printed on every server start.
- The optional Node.js download no longer logs an exception trace for a routine progress-indicator state change.

## What's Changed
* fix(vscode): unify logger output format by @Tiancheng-Xu in https://github.com/BBx-Kitchen/bbj-language-server/pull/665
* fix(intellij): classify the EM token backend from the public password-safe API, and run verifyPlugin in CI by @StephanWald in https://github.com/BBx-Kitchen/bbj-language-server/pull/674
* Release 0.16.0: v4.4 IntelliJ Focus (milestone #7) by @StephanWald in https://github.com/BBx-Kitchen/bbj-language-server/pull/679

## New Contributors
* @Tiancheng-Xu made their first contribution in https://github.com/BBx-Kitchen/bbj-language-server/pull/665

**Full Changelog**: https://github.com/BBx-Kitchen/bbj-language-server/compare/v0.15.0...v0.16.0

## Installation

### VS Code
Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang) or download the `.vsix` file below and install via **Extensions > ... > Install from VSIX...**

### IntelliJ IDEA
Install from [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/30033-bbj-language-support) (may take a few days for review) or download `bbj-intellij-0.16.0.zip` from the Assets below and install via **Settings > Plugins > ⚙ > Install Plugin from Disk...**
```

**Read-back verification (2026-09-20, this continuation), against
`gh release view v0.16.0 --repo BBx-Kitchen/bbj-language-server --json body,tagName,assets,isDraft,isPrerelease`:**

- Live body is byte-identical (`cmp` exit 0, both 4628 bytes) to the text block above.
- `## Installation` appears exactly once in the live body, and its VS Code / IntelliJ IDEA
  paragraphs match the "As published by the workflow" capture above byte-for-byte (only the
  original's trailing `---` rule is absent, as intended — it no longer terminates the document).
- No closing keyword (`close(s)`/`fix(es)`/`resolve(s)` + `#NNN`) appears anywhere in the live body.
- No planning identifier (`D-NN`, `C-NN`, `CR-NN`, `COMP-`/`PLAT-`/`EM-`/`IOP-`/`REL-` + digits, or
  a `9[3-7]-NN` plan token) appears anywhere in the live body.
- No mention of crash detection, auto-restart or the status transition log appears anywhere in the
  live body (D-22 held).
- `tagName`: `v0.16.0`. `isDraft`: `false`. `isPrerelease`: `false`.
- Assets unchanged from `97-RELEASE-EVIDENCE.md`: `bbj-intellij-0.16.0.zip`
  (`sha256:ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a`) and
  `bbj-lang-0.16.0.vsix` (`sha256:0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8`),
  two assets total.

## Drafter's finding carried forward to 97-11

REQUIREMENTS.md's EM-02 text says the EM login action should gate on "project and
server-readiness state". The shipped `BbjEMLoginAction.update()` gates on project presence only,
and its `ActionUpdateThread` is `BGT` — pinned by `EmLoginEnablementSourceGuardTest` and recorded
as a Phase 94 decision in STATE.md (EM login never talks to the language server and must keep
firing the BBj-Home dialog for new users, so a server-readiness gate would be wrong). The release
notes above describe the shipped code, not EM-02's literal requirement wording. Plan 97-11's #589
closing comment must say the same thing: closed on the shipped, gate-on-project-presence behavior,
not on EM-02's literal text.
