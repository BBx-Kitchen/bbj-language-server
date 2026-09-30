# Phase 117: Dependency Hygiene & Dependabot Coverage - Pattern Map

**Mapped:** 2026-09-28
**Files analyzed:** 9 (in-repo) + 1 out-of-repo note
**Analogs found:** 7 / 9 exact or role-match, 2 config-only edits with no code pattern needed

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `bbj-vscode/package.json` (move `@vscode/vsce` dependencies→devDependencies) | config | transform (manifest edit) | itself (existing file, edit in place) | n/a — direct edit |
| `bbj-vscode/tools/formatter/lib/bom.json` (NEW) | config (SBOM data file) | file-I/O (static record) | `bbj-vscode/src/formatter-verifier.ts`'s `FORMATTER_ARTIFACT_PINS` table (source of truth to mirror) | role-match |
| `bbj-vscode/tools/formatter/lib/README.md` (NEW) | config (docs) | file-I/O | none in-repo (first human-readable provenance note); mirrors `bom.json` fields | no close analog |
| `bbj-vscode/test/formatter-pins-drift.test.ts` (EXTEND, add bom.json-drift assertion) | test | CRUD (read+compare) | itself — existing file already has the exact pattern to extend | exact |
| `java-interop/build.gradle` (bump Guava version) | config | transform (manifest edit) | itself (existing file, edit in place) | n/a — direct edit |
| `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` (add optional port arg, D-12) | service (entrypoint) | event-driven (socket listener) | itself (existing file, edit in place); CLI-arg pattern borrowed from `bbj-vscode/tools/interop-test-harness/run-tests.ts`'s `--port` flag (different language, same intent) | role-match (cross-language reference only) |
| `.github/dependabot.yml` (add `github-actions` + `/documentation` npm entries, langium ignore rule) | config | CRUD (declarative list append) | itself — existing `npm`/`gradle` entries are the direct template for the new entries and the langium ignore rule mirrors the `chevrotain`/`typescript` ignore rules already present | exact |
| `/home/coder/repos/tmp/langium-44-regression-repro/` (NEW standalone project: `for-4.3/`, `for-4.4/`, `package.json`, `ISSUE-DRAFT.md`) | — (external, outside this repo) | batch (offline repro/report) | none — explicitly outside repo scope (D-08); no analog hunt required | n/a |

## Pattern Assignments

### `bbj-vscode/package.json` (config, manifest edit)

**Analog:** itself — `bbj-vscode/package.json:706-720`

**Current shape** (verified this session):
```json
  "dependencies": {
    "@vscode/vsce": "^4.0.0",
    ... (other runtime deps: chevrotain, langium, properties-file, properties-reader,
         vscode-jsonrpc, vscode-languageclient, vscode-uri)
  },
  ...
  "devDependencies": {
    "@vitest/coverage-v8": "^4.1.10",
    "concurrently": "^10.0.5",
    ...
  }
```

**Edit:** Remove the `"@vscode/vsce": "^4.0.0"` line from `dependencies`; insert it into `devDependencies` in alphabetical position — after `@vitest/coverage-v8`, before `concurrently` (existing devDependencies are alphabetically sorted; matches D-01's discretion note). Then regenerate `package-lock.json` (prefer `npm install --package-lock-only` under whatever Node is available — Pitfall 2 in RESEARCH.md documents the `prepare` lifecycle script risk on `npm install` without `--package-lock-only`/`--ignore-scripts`).

**Verification command** (from RESEARCH.md, not a new test file):
```bash
cd bbj-vscode && npm ls --omit=dev
```
Expected output after the move: no `@vscode/vsce` or `@vscode/vsce-sign` entries.

---

### `bbj-vscode/tools/formatter/lib/bom.json` (NEW, CycloneDX SBOM)

**Analog:** `bbj-vscode/src/formatter-verifier.ts` lines 43-71 (the `FORMATTER_ARTIFACT_PINS` table) — this is the existing source-of-truth record whose fields the new SBOM must mirror without duplicating the comparison logic.

**Source pin entry to mirror** (`src/formatter-verifier.ts:57-63`):
```typescript
{
    relativePath: 'lib/jcommander-1.71.jar',
    sizeBytes: 67503,
    sha256: 'b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804',
    origin: 'Vendored third-party build (jcommander 1.71); no upstream digest obtainable for this version — re-vendor deliberately from a verifiable source if updating.',
    vendoredOn: '2023-07-10',
},
```

**Target CycloneDX shape** (schema 1.5, per RESEARCH.md D-02, values taken from the pin above):
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "components": [
    {
      "type": "library",
      "name": "jcommander",
      "group": "com.beust",
      "version": "1.71",
      "purl": "pkg:maven/com.beust/jcommander@1.71",
      "publisher": "Cedric Beust",
      "hashes": [
        { "alg": "SHA-256", "content": "b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804" }
      ]
    }
  ]
}
```
Write to `bbj-vscode/tools/formatter/lib/bom.json` (next to the JAR, per D-02). Do not add a new hashing/compare implementation — the drift guard below cross-checks this file's `hashes[0].content` against the existing pin table value only.

---

### `bbj-vscode/tools/formatter/lib/README.md` (NEW, human-readable provenance)

**Analog:** none in-repo; closest style reference is the block comments in `src/formatter-verifier.ts` lines 1-16 and 20-42 (the module's own doc comments already narrate origin/provenance in prose). Mirror the same facts as `bom.json` (library, version, vendor/publisher, SHA-256, origin) in plain prose, plus the OSV finding note (jcommander 1.71: OSV query returns no advisory; Snyk's build-time-only finding is not applicable — see RESEARCH.md Pitfall 3, do not omit but do not treat as blocking).

---

### `bbj-vscode/test/formatter-pins-drift.test.ts` (EXTEND)

**Analog:** itself — the file already contains four `describe`/`test` blocks in this exact idiom (lines 54-126). Add a fifth test in the same `describe` block, following the existing style: import `bom.json` (via `fs.readFileSync` + `JSON.parse`, or a static `import bom from '../tools/formatter/lib/bom.json'` with `resolveJsonModule`), find the jcommander pin via `FORMATTER_ARTIFACT_PINS.find(p => p.relativePath === 'lib/jcommander-1.71.jar')`, and assert `bom.components[0].hashes[0].content === pin.sha256`.

**Exact style to copy** (imports, lines 1-9; one full test body, lines 93-111, as the closest-shaped existing assertion — single-artifact field-equality check with a remediation message):
```typescript
import { describe, expect, test } from 'vitest';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    FORMATTER_ARTIFACT_PINS,
    FORMATTER_TOOLS_DIR,
    formatterArtifactNames,
} from '../src/formatter-verifier.js';
```
```typescript
    test('every pinned entry carries a well-formed digest and non-empty provenance', () => {
        for (const pin of FORMATTER_ARTIFACT_PINS) {
            expect(
                pin.sha256,
                `'${pin.relativePath}' has a malformed sha256 pin (expected 64 lowercase hex characters). ` +
                    remediation(pin.relativePath)
            ).toMatch(/^[0-9a-f]{64}$/);
            ...
        }
    });
```
New test to add (same file, same `describe` block, following the `remediation()` helper pattern at lines 32-38):
```typescript
    test('bom.json SHA-256 matches the committed jcommander pin', () => {
        const bom = JSON.parse(fs.readFileSync(path.join(FORMATTER_TOOLS_DIR, 'lib/bom.json'), 'utf-8'));
        const pin = FORMATTER_ARTIFACT_PINS.find((p) => p.relativePath === 'lib/jcommander-1.71.jar')!;
        const bomHash = bom.components[0].hashes[0].content;
        expect(
            bomHash,
            `bom.json's recorded SHA-256 no longer matches FORMATTER_ARTIFACT_PINS' jcommander entry. ` +
                remediation(pin.relativePath)
        ).toBe(pin.sha256.toLowerCase());
    });
```

**Run command** (targeted, per RESEARCH.md Validation Architecture):
```bash
cd bbj-vscode && npx vitest run test/formatter-pins-drift.test.ts test/formatter-verifier-tamper.test.ts
```

---

### `java-interop/build.gradle` (Guava version bump)

**Analog:** itself — `java-interop/build.gradle:20-24`

**Current dependencies block:**
```groovy
dependencies {
    implementation 'org.eclipse.lsp4j:org.eclipse.lsp4j.jsonrpc:0.20.1'
    implementation 'com.google.guava:guava:31.1-jre'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.9.1'
}
```

**Edit:** change `'com.google.guava:guava:31.1-jre'` to `'com.google.guava:guava:33.7.1-jre'`. Single-line version-string edit, no structural change — reference pin confirmed at `/home/coder/repos/bbj-ls/bbj-ls/pom.xml:88-91` (sibling repo, read-only).

**Verification:** `cd java-interop && ./gradlew build`, then the live smoke test described below (SocketServiceApp.java pattern).

---

### `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` (D-12: optional port argument)

**Analog:** itself — the file to edit in place. Full current content (62 lines) already read; the port is hard-coded at line 31:
```java
public void run()  {
    var address = new InetSocketAddress("localhost", 5008);
```
and `main` at lines 22-28 discards `args`:
```java
public static void main(String[] args) {
    try {
        new Thread(new SocketServiceApp()).run();
    } catch (Exception exc) {
        exc.printStackTrace();
    }
}
```

**Cross-language CLI-arg reference pattern** (not a Java analog, but the project's own convention for an optional `--port`-style override): `bbj-vscode/tools/interop-test-harness/run-tests.ts` documents its own `--port` flag (default `5008`) in its header comment (lines 14-27) and via `parseArgs` (line 31 onward) — same default-port convention to preserve on the Java side (default stays 5008 when no arg is given).

**Recommended minimal edit** (matches D-12's "optional port argument (argv or a `-D` system property), defaulting to 5008"):
```java
public static void main(String[] args) {
    int port = args.length > 0 ? Integer.parseInt(args[0]) : 5008;
    try {
        new Thread(new SocketServiceApp(port)).run();
    } catch (Exception exc) {
        exc.printStackTrace();
    }
}
```
Thread the `port` field through the constructor and use it in `run()`'s `InetSocketAddress("localhost", port)`. Keep the class's existing `extends Thread` / `logger` / `startJsonRpc` structure untouched — this is a scoped, additive change, not a restructure.

**Smoke test command pattern** (reuses the existing interop harness, RESEARCH.md DEP-04 section):
```bash
cd bbj-vscode
npm run interop-harness -- --host 127.0.0.1 --port <free-port>
```

---

### `.github/dependabot.yml` (extend: two new entries + langium ignore rule)

**Analog:** itself — the entire existing file (28 lines) is the direct template.

**Full current content:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/bbj-vscode"
    schedule:
      interval: "weekly"
    ignore:
      # chevrotain is pinned to the version Langium depends on. Bumping it above
      # Langium's own chevrotain breaks grammar generation ("non exhaustive match"
      # during `langium generate`) — see PR #347. It should only move when a Langium
      # upgrade pulls in a newer chevrotain, so let Langium drive it.
      - dependency-name: "chevrotain"
      # TypeScript major versions are gated by typescript-eslint, which supports
      # only `typescript >=4.8.4 <6.1.0` — TS 6/7 (the native compiler) crash
      # `npm run lint`. See PR #397. Allow 5.x updates; block majors until
      # typescript-eslint adds support.
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
  # No `ignore:` block here (D-08, discretion resolved): letting Gradle wrapper
  # version bumps flow through is deliberate. workflow-hygiene.yml's
  # check-gradle-wrapper.mjs fails any Dependabot wrapper PR whose checksums
  # are not yet in GRADLE_CHECKSUMS — that red check is the intended control,
  # forcing a human to record the new checksums before the bump can merge.
  - package-ecosystem: "gradle"
    directory: "/bbj-intellij"
    schedule:
      interval: "weekly"
```

**Comment style to copy exactly:** every existing `ignore` rule is preceded by a `#`-prefixed prose comment naming the PR that motivated it (`see PR #347`, `See PR #397`) and explaining the mechanism, not just the symptom. The new langium rule must follow this same shape, citing PR #682/#684.

**Edits to make (all inside the existing structure, following the copied style above):**
1. Add to the existing `/bbj-vscode` npm entry's `ignore:` block, after the `typescript` rule:
```yaml
      # langium 4.4.0/langium-cli 4.4.0 regress error-recovery parse performance
      # (~2.3s vs 1-2ms per document on an unclosed call) and DEF FN parameter
      # completion. Verified locally and held back — see PR #682, PR #684.
      # Revisit once a later langium 4.4.x/4.5 fixes these regressions.
      - dependency-name: "langium"
        versions: ["4.4.x"]
      - dependency-name: "langium-cli"
        versions: ["4.4.x"]
```
2. Add two new top-level `updates:` entries (new ecosystems, no existing analog needed beyond the two entries already in the file):
```yaml
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/documentation"
    schedule:
      interval: "weekly"
```

---

### `/home/coder/repos/tmp/langium-44-regression-repro/` (out of repository — brief note only)

Per CONTEXT.md D-08, this standalone npm project lives entirely outside `bbj-language-server` and outside the langium fork; no in-repo analog hunt applies. RESEARCH.md's own DEP-05 section (sibling-subprojects structure `for-4.3/`, `for-4.4/`, top-level `package.json` with `npm run repro`, `ISSUE-DRAFT.md`) is the closest thing to a pattern spec and should be treated as authoritative since no codebase precedent exists. No PATTERNS.md excerpt is needed for the planner beyond pointing at RESEARCH.md's DEP-05 section directly.

## Shared Patterns

### Vendored-artifact provenance (pin table ↔ SBOM cross-check)
**Source:** `bbj-vscode/src/formatter-verifier.ts` (table) + `bbj-vscode/test/formatter-pins-drift.test.ts` (guard)
**Apply to:** `bom.json`, `README.md`, and the new drift-test assertion. Never re-implement the SHA-256 recompute-and-compare logic a second time against the JAR bytes — only assert the SBOM's recorded hash equals the existing pin table's value (RESEARCH.md's "Anti-Patterns to Avoid").

### Dependabot ignore-rule commenting convention
**Source:** `.github/dependabot.yml` (existing `chevrotain`/`typescript` rules)
**Apply to:** the new langium/langium-cli ignore rule — every rule cites the motivating PR/issue number and explains the mechanism in prose above the `dependency-name:` line.

### CLI/config default-port convention
**Source:** `bbj-vscode/tools/interop-test-harness/run-tests.ts` (`--port`, default `5008`)
**Apply to:** `SocketServiceApp.java`'s new optional port argument — preserve `5008` as the default when no argument is supplied, matching the harness's own default and BBjServices' well-known port.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `bbj-vscode/tools/formatter/lib/README.md` | config (docs) | file-I/O | First human-readable provenance note in this tree; no prior README exists next to vendored JARs — use `bom.json`'s fields plus formatter-verifier.ts's prose-comment style as the only reference |
| `/home/coder/repos/tmp/langium-44-regression-repro/` (all files) | external standalone project | batch | Deliberately outside the repository (D-08); RESEARCH.md's DEP-05 section is the only spec |

## Metadata

**Analog search scope:** `bbj-vscode/src/`, `bbj-vscode/test/`, `bbj-vscode/tools/formatter/`, `bbj-vscode/tools/interop-test-harness/`, `java-interop/`, `.github/dependabot.yml`, `bbj-vscode/package.json`
**Files scanned:** 7 read in full (formatter-verifier.ts, formatter-pins-drift.test.ts, dependabot.yml, SocketServiceApp.java, build.gradle, run-tests.ts header, package.json grep)
**Pattern extraction date:** 2026-09-28
