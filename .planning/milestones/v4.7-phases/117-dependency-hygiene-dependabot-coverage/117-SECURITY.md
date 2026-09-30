---
phase: "117"
slug: "dependency-hygiene-dependabot-coverage"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
---

# Phase 117 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → lockfile | Regenerating `package-lock.json` could silently move or re-resolve packages | package versions, integrity hashes |
| repository → CI release jobs | Publish jobs rely on `npm ci` installing vsce before `npx vsce publish` | build tooling |
| vendored binary → formatter process | `jcommander-1.71.jar` runs inside the formatter CLI the extension spawns | executable JAR |
| advisory databases → maintainers | The SBOM is what an advisory scanner matches | package coordinates |
| local process → java-interop socket | Any local process can connect to the listener; the port argument must not widen it to the network | JSON-RPC traffic |
| command line → `SocketServiceApp.main` | The new port argument is untrusted input | CLI arguments |
| npm registry → scratch repro projects | langium 4.3/4.4 trees installed outside the repository | third-party packages |
| local workspace → public upstream tracker | The langium issue draft is written for public filing; the maintainer decides | repro code and text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-117-01 | Tampering | `bbj-vscode/package-lock.json` | medium | mitigate | Diff-shape gate at execution; vsce is a devDependency only (`package.json`), no other version moved | closed |
| T-117-02 | Denial of Service | preview / manual-release publish jobs | medium | mitigate | publish-vscode runs the node-setup action (npm ci, install default on) before `npx vsce publish`; confirmed live by the first preview run after the milestone merge (publish-vscode success) | closed |
| T-117-SC | Tampering | `npm install --package-lock-only` / Guava from Maven Central | low | mitigate / accept | `--ignore-scripts --package-lock-only` at execution; Guava is the coordinate bbj-ls ships (see accepted risks) | closed |
| T-117-03 | Tampering | github-actions Dependabot PRs | medium | transfer | Dependabot PRs still need human review and merge; actions are SHA-pinned (phase 122) and the grouped entry keeps pins current | closed |
| T-117-04 | Denial of Service | preview.yml (no path filter) | low | accept | See accepted risks log | closed |
| T-117-05 | Tampering | langium hold scope | medium | mitigate | `versions: ["4.4.x"]` on exactly `langium` and `langium-cli` in `.github/dependabot.yml`; lockfile holds langium 4.3.1 / langium-cli 4.3.0 | closed |
| T-117-06 | Tampering | `tools/formatter/lib/jcommander-1.71.jar` | medium | mitigate | SHA-256 pin and runtime gate kept; `formatter-pins-drift.test.ts` ties `bom.json` and README to the real bytes | closed |
| T-117-07 | Repudiation | `bom.json` / README origin text | low | mitigate | Origin states only verifiable facts; no upstream digest claimed | closed |
| T-117-08 | Information Disclosure | advisory coverage of jcommander | medium | mitigate | purl test-pinned to file name and version; OSV queried with a positive control at execution | closed |
| T-117-09 | Elevation of Privilege | `SocketServiceApp.run` bind address | high | mitigate | Only the port is configurable; bind is `new InetSocketAddress("localhost", port)` (`SocketServiceApp.java:75`) | closed |
| T-117-10 | Tampering | `SocketServiceApp.parsePort` | medium | mitigate | Invalid arguments exit 2 before any bind (`SocketServiceApp.java:42-55`) | closed |
| T-117-11 | Information Disclosure | Guava temp-directory APIs (CVE-2023-2976, CVE-2020-8908) | medium | mitigate | `guava:33.7.1-jre` (`java-interop/build.gradle:22`), fixed since 32.0.0 | closed |
| T-117-12 | Denial of Service | default port | medium | mitigate | `DEFAULT_PORT = 5008` (`SocketServiceApp.java:25`); no-argument behaviour unchanged | closed |
| T-117-13 | Tampering | bbj-vscode langium pin | high | mitigate | Repro kept under `/home/coder/repos/tmp`; lockfile still langium 4.3.1 | closed |
| T-117-14 | Information Disclosure | ISSUE-DRAFT.md / README.md | medium | mitigate | Public snippets and a public-subset grammar only; grep-gated for planning ids | closed |
| T-117-15 | Repudiation | upstream filing | medium | mitigate | Nothing filed automatically; the maintainer chose to file (UAT test 3) as eclipse-langium/langium#2236 on 2026-09-29 | closed |
| T-117-16 | Tampering | langium pin and repository tree during top-down repro | high | mitigate | `git archive` copies and `--prefix` installs into the scratch project; bbj-vscode manifest, lockfile and installed langium remain 4.3.1 | closed |
| T-117-17 | Information Disclosure | ISSUE-DRAFT.md, README.md, STRIP-LOG.md | medium | mitigate | MIT-licensed public grammar source; grep-gated for PR numbers, local paths and planning ids | closed |
| T-117-18 | Repudiation | upstream filing | medium | mitigate | Same as T-117-15: maintainer-initiated filing only | closed |
| T-117-19 | Denial of Service | runaway 4.4.0 error recovery in probes | low | mitigate | Per-probe 600 s kill and outer `timeout` at execution | closed |
| T-117-SC2 | Tampering | npm installs in the scratch project | medium | mitigate | 4.3 copy from the committed lockfile; 4.4 copy pinned exactly with integrity matched to the registry; `--ignore-scripts` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-117-01 | T-117-04 | Any merge to main publishes previews (pre-existing); grouping github-actions and Docusaurus updates keeps extra publishes to at most two per week, and pending Dependabot updates are rolled up into one PR | plan 117-02 | 2026-09-29 |
| AR-117-02 | T-117-SC | Guava from Maven Central: the same coordinate bbj-ls ships in production, a bump of an existing dependency from its official publisher | plan 117-04 | 2026-09-29 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-29 | 22 | 22 | 0 | /gsd-secure-phase (orchestrator, L1: grep of durable mitigations on main after the milestone merge; execution-time gates taken from the plan summaries) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-29
