---
phase: 123-documentation-drift
plan: 03
subsystem: docs
tags: [vscode, documentation, docusaurus]

requires:
  - phase: 123-documentation-drift
    provides: DOC-DRIFT-2026-09-30.md drift scan (research input)
provides:
  - VS Code user guide pages matching the shipped extension (index, getting-started,
    configuration, commands, features)
affects: [123-06 composers page (links to commands.md), 123-08 developer docs]

actuals:
  tokens: 6152
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Docs pages cite source files (package.json, config-path-trust.ts, interop-config.ts,
      em-auth.ts, em-username-memory.ts, formatter-java-resolver.ts, Commands.cjs) instead of
      restating stale wording"

key-files:
  created: []
  modified:
    - documentation/docs/vscode/index.md
    - documentation/docs/vscode/getting-started.md
    - documentation/docs/vscode/configuration.md
    - documentation/docs/vscode/commands.md
    - documentation/docs/vscode/features.md

key-decisions:
  - "MDX build failure on a bare `<title>` placeholder in commands.md's intro sentence — reworded
    to avoid angle brackets entirely rather than escaping, since the escaped form is harder to
    read in rendered prose."
  - "Settings example test requires exactly 21 keys (20 non-compiler settings plus
    bbj.compiler.trigger); verified programmatically against package.json before commit."

requirements-completed: [VSC-01, VSC-02, VSC-03, VSC-04, VSC-05, VSC-06]

coverage:
  - id: D1
    description: "VS Code guide states 1.101.0 as the minimum version everywhere it names one"
    requirement: "VSC-01"
    verification:
      - kind: other
        ref: "grep -rc '1\\.67' documentation/docs/vscode/ (0 matches) + docs build"
        status: pass
    human_judgment: false
  - id: D2
    description: "configuration.md documents bbj.configPath's value rules (absolute, leading ~
      expanded, relative rejected) and Workspace Trust behaviour; no longer claims workspace
      settings always override user settings"
    requirement: "VSC-02"
    verification:
      - kind: other
        ref: "grep -c 'Restricted Mode|relative|machine' configuration.md + old-claim removal grep"
        status: pass
    human_judgment: false
  - id: D3
    description: "configuration.md documents the invalid interop host/port fallback and its
      single warning line in the BBj output channel"
    requirement: "VSC-03"
    verification:
      - kind: other
        ref: "grep -c 'Ignoring invalid|65535' configuration.md"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every non-compiler.* setting has its own section; the complete example lists
      exactly those 21 settings as valid JSON matching package.json"
    requirement: "VSC-04"
    verification:
      - kind: other
        ref: "node settings-check script (settings ok) against bbj-vscode/package.json"
        status: pass
    human_judgment: false
  - id: D5
    description: "EM login text (configuration.md and commands.md) matches the code: remembered
      username (admin the first time), automatic re-prompt on missing/expired/revoked/undecodable
      token, unusable tokens rejected at login"
    requirement: "VSC-05"
    verification:
      - kind: other
        ref: "grep -c 'admin|EM token expired or invalid' configuration.md"
        status: pass
    human_judgment: false
  - id: D6
    description: "commands.md uses real Command Palette titles, describes Show the Active Config
      File, the formatter's Java resolution, compile's bbjcpl, and both decompile commands"
    requirement: "VSC-06"
    verification:
      - kind: other
        ref: "node commands-check script (commands ok) against bbj-vscode/package.json"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-30
status: complete
---

# Phase 123 Plan 03: VS Code User Guide Drift Summary

**VS Code guide now states the real 1.101.0 minimum, every setting's real rules and scope
(including six previously undocumented settings), the invalid-interop fallback, the current EM
login flow, and the actual Command Palette titles — all traced to the shipping code rather than
the old wording.**

## Performance

- **Duration:** 25 min
- **Started:** ~2026-09-30T09:14:00Z
- **Completed:** 2026-09-30T09:39:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- `index.md` and `getting-started.md` state VS Code 1.101.0 as the minimum, matching
  `bbj-vscode/package.json`'s `engines.vscode: "^1.101.0"`.
- `configuration.md` documents `bbj.configPath`'s absolute/`~`-expansion/relative-rejection rules
  and its Workspace Trust gating (workspace value ignored until trusted, no reload needed), and
  the Workspace Configuration section no longer claims workspace settings always win — it names
  the `bbj.formatter.javaPath` (machine-scoped) and untrusted-`configPath` exceptions.
- `configuration.md` documents the Java interop invalid-value fallback: an invalid host or port
  falls back to its own default independently, with one warning line per rejected value in the
  `BBj` output channel.
- Six previously undocumented settings now have their own `####` sections, in three new
  subsections (Opening Programs, Diagnostics Settings, Inlay Hints): `bbj.decompile.promptOnOpen`,
  `bbj.denumber.promptOnOpen`, `bbj.diagnostics.suppressCascading`, `bbj.diagnostics.maxErrors`,
  `bbj.compiler.trigger`, `bbj.inlayHints.parameterNames.enabled`.
- The Complete Settings Example is valid JSON with exactly the 21 non-`bbj.compiler.*` settings
  (`bbj.compiler.trigger` included), verified programmatically against `package.json`.
- `configuration.md`'s Enterprise Manager Authentication section and `commands.md`'s Login to
  Enterprise Manager section describe the real flow: username pre-filled from the last successful
  login (`admin` the first time), automatic re-prompt on a missing/expired/undecodable token, and
  a login that returns an unusable token failing with nothing stored.
- `commands.md` uses the real Command Palette titles from `package.json` for all 14 non-composer
  commands, adds a Decompile Commands section for both decompile commands, describes
  "Show the Active Config File" and "Open Enterprise Manager" (EM URL from
  `com.basis.jetty.host`/`port`) accurately, and replaces the "Java must be on PATH" claim with
  the real formatter-Java / `bbjcpl`-from-`{bbj.home}/bin` split.
- `features.md`'s Developer Commands tables and `getting-started.md`'s troubleshooting section use
  the same real titles and the `BBj` output channel name.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): real minimum VS Code version, proven through the docs build** -
   `3e9c4109` (docs)
2. **Task 2: configuration.md — configPath rules and trust, settings scope, interop fallback, six
   settings, complete example, EM login** - `be3e70b9` (docs)
3. **Task 3: commands.md and features.md — real titles, Show the Active Config File, formatter
   Java, bbjcpl, decompile commands, EM login** - `ea6247e3` (docs)

**Plan metadata:** commit will follow this SUMMARY.

## Files Created/Modified
- `documentation/docs/vscode/index.md` - minimum VS Code version corrected
- `documentation/docs/vscode/getting-started.md` - minimum VS Code version and output-channel name
  corrected
- `documentation/docs/vscode/configuration.md` - configPath rules/trust, interop fallback, six new
  settings, complete example, EM login flow, command titles/channel name
- `documentation/docs/vscode/commands.md` - real titles, Decompile Commands section, Show the
  Active Config File / Open Enterprise Manager behaviour, formatter Java vs bbjcpl split
- `documentation/docs/vscode/features.md` - Developer Commands tables use real titles

## Decisions Made
- MDX build failure on a bare `<title>` placeholder in `commands.md`'s intro sentence (Docusaurus
  parses `<title>` as an unclosed JSX tag) — reworded the sentence to avoid angle brackets
  entirely, rather than escaping them, since the escaped form reads worse in prose.
- Verified the Complete Settings Example and the commands page programmatically against
  `bbj-vscode/package.json` (Node one-liners) rather than by hand, per the plan's automated
  `<verify>` blocks — this caught the 21-key count precisely.

## Deviations from Plan

None - plan executed exactly as written. All six `must_haves.truths` and both `artifacts` in the
plan frontmatter are satisfied by the committed content; no auto-fixes, no scope changes.

## Issues Encountered

The docs build failed once after Task 3's first `commands.md` draft: Docusaurus's MDX compiler
rejected a bare `<title>` placeholder in the intro paragraph as an unclosed JSX tag
("Expected a closing tag for `<title>`"). Fixed by rewording the sentence to avoid angle brackets;
rebuilt clean with 0 warnings. Not a plan deviation — a routine MDX authoring pitfall caught by the
plan's own build-based `<verify>` step before commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `commands.md` is ready for 123-06 to add the composer commands' own page and link into it.
- All five VS Code guide pages this plan owns are internally consistent with `package.json` and
  the source files cited in the plan's `read_first` lists.
- No blockers or concerns for subsequent phase 123 plans.

## Self-Check: PASSED

- `documentation/docs/vscode/index.md` — FOUND
- `documentation/docs/vscode/getting-started.md` — FOUND
- `documentation/docs/vscode/configuration.md` — FOUND
- `documentation/docs/vscode/commands.md` — FOUND
- `documentation/docs/vscode/features.md` — FOUND
- Commit `3e9c4109` — FOUND in `git log --oneline --all`
- Commit `be3e70b9` — FOUND in `git log --oneline --all`
- Commit `ea6247e3` — FOUND in `git log --oneline --all`
- All six `must_haves.truths` re-verified via grep/node checks above: PASS
- Plan-level `<verification>`: settings check, commands check, all grep checks pass; docs build
  exits 0 with no WARNING lines; `git diff --name-only 8b53253d -- documentation/docs/vscode/`
  lists exactly this plan's five files: PASS

---
*Phase: 123-documentation-drift*
*Completed: 2026-09-30*
