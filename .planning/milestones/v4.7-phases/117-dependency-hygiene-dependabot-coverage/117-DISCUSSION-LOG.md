# Phase 117: Dependency Hygiene & Dependabot Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-28
**Phase:** 117-dependency-hygiene-dependabot-coverage
**Areas discussed:** Formatter JAR provenance, Guava: upgrade vs drop, Langium 4.4 repro location

---

## Formatter JAR provenance

| Option | Description | Selected |
|--------|-------------|----------|
| All three JARs | BBjCFCli, BBjCodeFomatter, jcommander | |
| BBjCodeFomatter only | Literal DEP-02 reading | |

**User's choice:** jcommander only (free text). The two BASIS JARs are being absorbed by bbj-ls and served through JSON-RPC; confirmed on follow-up ("jcommander only" over "record them, mark transitional").

| Option | Description | Selected |
|--------|-------------|----------|
| CycloneDX SBOM + short README | machine + human readable | ✓ |
| README.md only | | |
| JSON only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, vitest guard | SHA-256 drift check in existing suite | ✓ |
| No, record only | | |

**Notes:** The "record what is known" answer for the BASIS JARs' identity became moot once they were excluded.

---

## Guava: upgrade vs drop

| Option | Description | Selected |
|--------|-------------|----------|
| Bump to 33.7.1-jre | matches bbj-ls production pin | ✓ |
| Latest 33.x at execution time | | |
| Drop Guava | replace Stopwatch/Lists/Primitives/ClassPath | |

| Option | Description | Selected |
|--------|-------------|----------|
| gradle build + live smoke | one class lookup over the socket | ✓ |
| gradle build only | | |

---

## Langium 4.4 repro location

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone dir under ~/repos/tmp | self-contained npm project | ✓ |
| In the langium fork workspace | | |
| Separate public GitHub repo now | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Toy grammar, then BBj fallback | | ✓ |
| Stripped BBj grammar | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Runnable script + issue draft | | ✓ |
| Runnable script only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Only 4.4.x | Dependabot ignore scope | ✓ |
| >=4.4.0 | | |

---

## Claude's Discretion

- Dependabot schedule/grouping/limits for the new github-actions and /documentation entries (area not selected; default weekly)
- DEP-01 mechanics (move vsce to devDependencies, regenerate lockfile)

## Deferred Ideas

- Remove vendored formatter JARs and switch to bbj-ls JSON-RPC formatter
- Todos reviewed, none folded: interop initOptions key mismatch, signature-help escaping, Windows Node download check
