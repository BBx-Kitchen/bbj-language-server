# Phase 122: Release & CI Pipeline Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-29
**Phase:** 122-release-ci-pipeline-hardening
**Areas discussed:** PR gate shape, Action pins & majors, Gradle caching, Packaging & prepare

---

## PR gate shape

| Option | Description | Selected |
|--------|-------------|----------|
| Merge into build.yml | One unconditional workflow: build, lint, typecheck, test, VSIX, sticky comment; pr-vsix.yml deleted | ✓ |
| build.yml gate, pr-vsix packages only | Both files kept; pr-vsix drops its test run; still two installs/builds | |
| Paths filter on build.yml | Docs/java-interop-only PRs would lose the gate | |

**User's choice:** Merge into build.yml

| Option | Description | Selected |
|--------|-------------|----------|
| Always package + comment | Every PR gets a VSIX link | ✓ |
| Only for bbj-vscode changes | Needs a changed-files check | |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave pr-validation separate | Only gets preamble, caching, pins, permissions | ✓ |
| Fold into build.yml | Paths-conditioned IntelliJ job inside build.yml | |

| Option | Description | Selected |
|--------|-------------|----------|
| Per-PR, cancel superseded | Same as pr-vsix today | ✓ |
| Per-PR, no cancel | Queue runs | |

---

## Action pins & majors

| Option | Description | Selected |
|--------|-------------|----------|
| Latest release of the current major | Behaviour unchanged; majors come via Dependabot later | ✓ |
| Upgrade to the current majors now | Node 24 runtimes and new defaults in the riskiest phase | |

| Option | Description | Selected |
|--------|-------------|----------|
| Normal review, no special rule | Grouped weekly PR through the build.yml gate | ✓ |
| Ignore majors in dependabot.yml | Only minor/patch SHA bumps | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, extend the hygiene check | New .mjs checker + test in workflow-hygiene.yml | ✓ |
| One-off grep at verification | No CI guard | |

---

## Gradle caching

| Option | Description | Selected |
|--------|-------------|----------|
| gradle/actions/setup-gradle | Excludes, cleanup, main-only writes | ✓ |
| setup-java `cache: gradle` | Caches the multi-GB IDE downloads too | |

| Option | Description | Selected |
|--------|-------------|----------|
| Verify jobs cache, publish jobs don't | Token-holding jobs never restore a cache | ✓ |
| Cache everywhere | Simplest, cache reaches credential jobs | |

---

## Packaging & prepare

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow to `langium generate` | Fresh checkout still compiles | ✓ |
| Remove prepare; build runs generate | Editor errors until first build | |

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit lint + typecheck step in release verify | prepublish only bundles | ✓ |
| Keep lint in prepublish | Lint hidden inside packaging | |

| Option | Description | Selected |
|--------|-------------|----------|
| Minify + keepNames, no sourcemap | Readable names in stack traces | ✓ |
| Plain minify, no sourcemap | Smallest, unreadable traces | |
| Minify + external sourcemap as CI artifact | More wiring, maps expire | |

| Option | Description | Selected |
|--------|-------------|----------|
| Drop every onCommand entry | Only onLanguage entries; two tests change assertions | ✓ |
| Remove autoComment, add the two missing | Can drift again | |

---

## Claude's Discretion

- Per-job least-privilege permissions layout (top-level `contents: read`, job-level escalation)
- Composite action (not reusable workflow); checkout stays inline; wrapper-validation stays inline
- Dependabot `github-actions` entry extended to the composite action directory
- Composite action naming/inputs, `--ignore-scripts` for publish jobs, checker layout, plan split

## Deferred Ideas

- Action major upgrades via the grouped Dependabot PR after this phase
- Folding IntelliJ PR verification into build.yml
- Three keyword-only todo matches reviewed, not folded (signature-help escaping, Windows Node
  download bar, IntelliJ initOptions key mismatch)
