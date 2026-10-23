---
phase: 261023-mtv-intellij-version-aware-node-js-cache-pin
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifier.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifierTest.java
  - bbj-intellij/src/test/resources/node-fixtures/README.md
  - bbj-intellij/src/test/resources/node-fixtures/fake-node-win.zip
  - bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip
  - bbj-intellij/src/test/resources/node-fixtures/fake-node-win-no-binary.zip
  - bbj-intellij/src/test/resources/node-fixtures/fake-node-unix.tar.gz
  - bbj-intellij/src/test/resources/node-fixtures/fake-node-unix-no-binary.tar.gz
autonomous: true
requirements: [MTV-R1, MTV-R2, MTV-R3]

estimate:
  tokens: 110000
  raw_tokens: 110000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "An install whose Node.js cache was filled for an older version (the legacy unversioned nodejs/node[.exe] with a valid digest record, or a nodejs/v<older>/node[.exe] with a valid record) gets null from cachedNodePath(), so the plugin reports Node.js as missing and offers the download (MTV-R1)"
    - "A download installs to nodejs/<NODE_VERSION>/node[.exe] with its digest record beside it, and the next cachedNodePath() returns exactly that path (MTV-R1)"
    - "After a successful download, the legacy unversioned executable, its digest record and every other nodejs/v<x.y.z> directory are gone; entries that are not Node.js version directories stay (MTV-R2)"
    - "A stale entry that cannot be deleted never fails the download: install() still returns the installed path and cachedNodePath() returns it (MTV-R2)"
    - "A failed install (digest mismatch, missing binary, cancellation) creates nothing in the data directory and removes nothing from it (MTV-R1, MTV-R2)"
    - "NODE_VERSION is v22.23.4, the pinned digest table holds exactly the six v22.23.4 archive digests from nodejs.org SHASUMS256.txt, and the whole bbj-intellij test suite passes (MTV-R3)"
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java"
      provides: "version-scoped installedPath(), best-effort removeStaleInstallsQuietly(), NODE_VERSION v22.23.4"
      contains: "dataDirectory.resolve(NODE_VERSION)"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifier.java"
      provides: "PINNED_TABLE with the six v22.23.4 digests"
      contains: "node-v22.23.4-win-x64.zip"
    - path: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java"
      provides: "older-version cache miss, stale-cleanup and cleanup-failure tests; updated pinned literals and fixture digests"
    - path: "bbj-intellij/src/test/resources/node-fixtures/README.md"
      provides: "rebuild recipes and SHA-256 values matching the five rebuilt fixture archives"
  key_links:
    - from: "BbjNodeDownloader.getCachedNodePath()"
      to: "NodeInstallPipeline.installedPath()"
      via: "productionPipeline().cachedNodePath() -> installedPath() -> <plugins>/bbj-intellij-data/nodejs/<NODE_VERSION>/node[.exe]"
      pattern: "dataDirectory.resolve(NODE_VERSION)"
    - from: "NodeInstallPipeline.NODE_VERSION"
      to: "NodeArchiveVerifier.PINNED_TABLE"
      via: "NodeInstallPipelineSourceGuardTest couples the version to six pinned archive names"
      pattern: "node-v22.23.4-"
    - from: "NodeInstallPipeline.extractZip expected entry name"
      to: "fake-node-win*.zip fixture entry names"
      via: "exact match on node-<NODE_VERSION>-win-x64/node.exe"
      pattern: "node-v22.23.4-win-x64/"
---

<objective>
Make the IntelliJ plugin's downloaded Node.js cache version-aware, so changing
`NodeInstallPipeline.NODE_VERSION` makes existing installs see "no cached Node.js" and take the normal
download path again. Then move the pin to v22.23.4. GitHub issue #753, on branch
`fix/issue-753-node-cache-version` (already checked out).

Purpose: today `installedPath()` is `<nodejs data dir>/node[.exe]` regardless of version, and
`cachedNodePath()` accepts that file whenever it exists, is executable and matches its install-time
digest record. Bumping NODE_VERSION alone therefore leaves every existing user on the old binary.
Only the cached resolution step changes; the Settings path and PATH-detected Node.js still win over
the cache (NodeExecutableResolver order unchanged).

Output: a per-version install directory `<nodejs data dir>/<NODE_VERSION>/`, best-effort removal of
stale installs after a successful download, the v22.23.4 pin with its six archive digests, rebuilt
test fixtures, and updated tests.
</objective>

<execution_context>
@~/.claude-shared/dot-claude/gsd-core/workflows/execute-plan.md
@~/.claude-shared/dot-claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallIntegrity.java
@bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
@bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java

## Executor constraints (apply to every task)

- Wording: describe the Node.js change only as a routine Node.js update, everywhere: code,
  comments, tests, commit messages and the SUMMARY. The wording gate in Task 3's `<verify>` lists
  the terms that must not appear.
- No planning ids (this quick id, MTV-R requirement ids, D-xx) in source or test comments.
  `#753` is fine in commit messages. Put `(#753)` in the commit subject and no closing keyword in
  the body (the PR closes the issue).
- Shell: absolute paths under the checkout root for every ad-hoc command; never `cd … && grep/cat/sed/find`;
  `cd bbj-intellij && ./gradlew …` is the only allowed `cd` form; use `git -C <abs path>` for git;
  never `git stash`; stage with `git add <exact path>` only (one path per fixture file); run
  Gradle in the foreground (generous timeout, up to 10 minutes) and never poll it with a
  `pgrep`/`sleep` wait loop.
- Commits: plain `git -C … commit` with the session's `Co-Authored-By` trailer at the end of the message.
- Deviations go in the SUMMARY only; do not open WINDOWS.md ledger entries.

## Known facts (verified at planning time, HEAD e71b17e6)

- The previous pin is `v22.23.2` (NodeInstallPipeline.java line 29). It also appears in the two
  example comments in NodeInstallPipeline.java (archiveFileName() javadoc, extractZip comment), in
  NodeArchiveVerifier.java (PINNED_TABLE javadoc + six keys), NodeInstallPipelineTest.java,
  NodeArchiveVerifierTest.java, and throughout node-fixtures/README.md and inside all five fixture
  archives.
- `BbjNodeVersionCacheTest.java` also contains that string, but only as made-up `node --version`
  output for the PATH-version probe cache. It is unrelated to the pin; leave that file untouched.
- `BbjNodeDownloader.getNodeDataDirectory()` returns `<PathManager.getPluginsPath()>/bbj-intellij-data/nodejs`
  and stays unchanged. `BbjTextMateBundleProvider` uses the sibling `bbj-intellij-data/textmate`,
  which this plan never touches (cleanup only lists the `nodejs` data directory).
- `extractZip` matches the zip entry `node-<NODE_VERSION>-<platform>-<arch>/node.exe` exactly. The three
  committed zip fixtures carry entries under the previous version's top-level folder, so bumping
  NODE_VERSION without rebuilding them breaks the Windows pipeline tests. The tar fixtures are
  extracted with `--strip-components=1` (folder name not checked) but are rebuilt too so the README
  matches the committed bytes.
- No test pins the real Node.js archive digests (NodeArchiveVerifierTest checks only names and
  64-lower-hex format).
- Source guards (NodeInstallPipelineSourceGuardTest) that must keep passing: `cachedNodePath()` holds
  exactly one `return path;` after `paths.exists(`, `paths.isExecutable(` and `matchesRecordedDigest(`;
  `installExtracted` has `Files.copy(` before exactly one `integrity.record(`; `install(` has exactly
  one `extractArchive(` and `NodeArchiveVerifier.verify(` before it and before `installExtracted(`;
  `deleteRecursively` passes no follow-links option. The guard's brace counter assumes no string
  literal in NodeInstallPipeline.java holds a brace, so no `{n}` regex quantifiers in string literals there.
- v22.23.4 archive digests, transcribed from https://nodejs.org/dist/v22.23.4/SHASUMS256.txt on 2026-10-23:
  - node-v22.23.4-darwin-arm64.tar.gz  c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428
  - node-v22.23.4-darwin-x64.tar.gz    efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819
  - node-v22.23.4-linux-arm64.tar.gz   f7a1e486dbc8b286847815b477d4fb5e9fb963ed4489c3e1588853d685f589f9
  - node-v22.23.4-linux-x64.tar.gz     b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406
  - node-v22.23.4-win-arm64.zip        a8b8cd79cbbb3062435f449591d98dd63730bbbf30ce2d7cc3a6376c236cb111
  - node-v22.23.4-win-x64.zip          cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20

<interfaces>
From NodeInstallIntegrity.java (same package as the tests):
- package-private constructor `NodeInstallIntegrity()`; tests build a fresh one per pipeline so memo state never leaks
- `public static Path sidecarFor(Path executable)`: sibling file named `<executable file name>.sha256`
- `public static final String SIDECAR_SUFFIX = ".sha256"`
- `public void record(Path executable, NodeArchiveVerifier.ByteSource bytes) throws IOException`: writes the digest record
- `public boolean matchesRecordedDigest(Path executable, NodeArchiveVerifier.ByteSource bytes)`: never throws; a missing executable or record reads as false

From NodeInstallPipelineTest.java (existing helpers to reuse):
- `windowsPipeline(dataDirectory, temporaryRoot, FixtureCopyingFetcher, FixedDigestSource, FakePathProbe, NodeInstallIntegrity)`
- `pipeline(Target, dataDirectory, temporaryRoot, Fetcher, DigestSource, PathProbe, NodeInstallIntegrity)`
- `FakePathProbe` (exists/regularFile/executable all true by default, for every path), `FixtureCopyingFetcher(Path fixture)`,
  `FixedDigestSource(Map)`, constants `WINDOWS_FIXTURE`, `WINDOWS_ARCHIVE_NAME`, `WINDOWS_FIXTURE_DIGEST`, `WINDOWS_MARKER_BYTES_TEXT`
- `NodeInstallPipeline.deleteRecursively(Path)` is public static; private helpers `deleteRecursivelyQuietly`, `deleteIfExistsQuietly` already exist
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Install and look up the cached Node.js under a NODE_VERSION-named subdirectory</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java</files>
  <precondition>bbj-vscode/out/language/main.cjs exists (if missing, run npm --prefix bbj-vscode run build first; Gradle fails fast without it)</precondition>
  <read_first>bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java, bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallIntegrity.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java</read_first>
  <behavior>
    - Test A: dataDirectory holds the legacy unversioned `node.exe` (Windows marker bytes) with a valid digest record written by `new NodeInstallIntegrity().record(legacy, NodeArchiveVerifier.REAL_FILES)`. A Windows pipeline over that dataDirectory, with a fresh NodeInstallIntegrity and a default FakePathProbe (reports exists and executable for every path), returns null from cachedNodePath().
    - Test A (same test, continued): dataDirectory also holds an older-version directory `v20.0.0/node.exe` with a valid digest record; cachedNodePath() is still null. A test constant OLDER_VERSION = "v20.0.0" is guarded by assertNotEquals against NodeInstallPipeline.NODE_VERSION so the test stays meaningful after future pin moves.
    - Test A (end): install() from WINDOWS_FIXTURE returns dataDirectory.resolve(NodeInstallPipeline.NODE_VERSION).resolve("node.exe"), its sidecar exists beside it, and a fresh pipeline's cachedNodePath() returns that same path.
    - Existing tests: every assertion of the installed location uses dataDirectory.resolve(NodeInstallPipeline.NODE_VERSION).resolve(...) instead of dataDirectory.resolve(...); failure-path tests (digest mismatch, missing binary on Windows and Unix, both cancellation points) still see an empty dataDirectory.
  </behavior>
  <action>
    Per MTV-R1. In NodeInstallPipeline.java change installedPath() to return dataDirectory.resolve(NODE_VERSION).resolve(target.nodeExecutableName()), and update its javadoc to say the executable lives in a subdirectory named after NODE_VERSION so a changed pin reads as not cached and the normal download path runs. Leave cachedNodePath() exactly as it is; it already goes through installedPath(), and the source guard pins its shape. In installExtracted(), after the existing "Node binary not found" existence check and before Files.copy, add Files.createDirectories(targetPath.getParent()). It must come after that check so a failed install leaves dataDirectory empty. Update the constructor's dataDirectory @param to say it is the root under which each Node.js version gets its own subdirectory (the root itself is still assumed to exist; BbjNodeDownloader already creates it). Do not change BbjNodeDownloader.

    In NodeInstallPipelineTest.java: add Test A from the behavior block, named in the file's existing sentence style (for example aCacheLeftByAnOlderNodeVersionIsNotReturnedAsCachedForTheCurrentVersion). Write the RED version first and run it to confirm it fails against the unchanged installedPath(), then make the source change. Update the existing installed-location assertions (the two Windows ones expecting dataDirectory.resolve("node.exe") and the Unix one expecting dataDirectory.resolve("node")) to the NODE_VERSION subdirectory. In aReinstallOverAnExistingBinaryReplacesItAndRerecordsTheDigest, list installed.getParent() instead of dataDirectory, so the "exactly one executable-named file" count still means what it says. Comments describe behavior only, with no planning ids. Commit: fix(intellij): keep the downloaded Node.js in a per-version cache directory (#753).
  </action>
  <verify>
    <automated>cd bbj-intellij && ./gradlew test --tests 'com.basis.bbj.intellij.lsp.NodeInstallPipeline*'</automated>
    <automated>grep -q 'dataDirectory.resolve(NODE_VERSION)' bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java</automated>
  </verify>
  <done>NodeInstallPipelineTest (including the new older-version cache-miss test) and NodeInstallPipelineSourceGuardTest pass; installedPath() resolves through the NODE_VERSION subdirectory; failure paths leave the data directory empty; committed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Remove stale Node.js installs after a successful download, never failing the install</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java</files>
  <read_first>bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java</read_first>
  <behavior>
    - Test B: dataDirectory holds the legacy `node.exe` plus `node.exe.sha256`, older-version directories `v20.0.0/` and `v21.1.0/` (each with node.exe and its sidecar), an unrelated file `notes.txt`, and an unrelated directory `vendor/` (starts with v but is not a version name). After a successful Windows install, only the current NODE_VERSION directory (with node.exe and its sidecar), `notes.txt` and `vendor/` remain.
    - Test C (POSIX only, @DisabledOnOs(OS.WINDOWS) plus the existing posix-view assumption): `v20.0.0/node.exe` exists and the `v20.0.0` directory has its owner write bit removed, so deleting its child fails. install() still returns the installed path and cachedNodePath() returns it. Restore the directory's permissions in a finally block, then Assumptions.assumeTrue that `v20.0.0/node.exe` still exists (skip if the host did not enforce the missing write bit, the same pattern aFailingTempFileCleanupNeverMasksTheRealVerificationFailure uses).
    - Test D: dataDirectory holds the legacy `node.exe` plus its sidecar; an install with a wrong expected digest throws IOException and both legacy files still exist, so cleanup runs only after success.
  </behavior>
  <action>
    Per MTV-R2. Add a private void removeStaleInstallsQuietly() to NodeInstallPipeline and call it in install() right after installExtracted(tempExtractDir) returns, before the final progress step. It runs only on the success path, and it must not touch extractArchive(, NodeArchiveVerifier.verify( or integrity.record( (source guards). Behavior: (1) delete the legacy unversioned executable dataDirectory.resolve(target.nodeExecutableName()) and its NodeInstallIntegrity.sidecarFor(...) record with the existing deleteIfExistsQuietly; (2) list the direct children of dataDirectory (Files.list in try-with-resources, collected to a List before deleting anything). For each child that is a real directory (Files.isDirectory with LinkOption.NOFOLLOW_LINKS, so a symlink is never treated as a version directory), whose file name matches v<digits>.<digits>.<digits> (regex v[0-9]+\.[0-9]+\.[0-9]+ written without brace quantifiers) and is not NODE_VERSION, call the existing deleteRecursivelyQuietly. Wrap the whole body so IOException and RuntimeException are swallowed: a delete that fails because Windows holds a lock on a running node.exe, or any listing error, must never fail or abort the install. Touch nothing else in dataDirectory. Javadoc: best-effort removal of installs left by earlier versions, run after a successful install, never throws. Add Tests B, C and D from the behavior block in the existing naming style, RED first. Comments describe behavior only. Commit: fix(intellij): remove Node.js left by earlier versions after a successful download (#753).
  </action>
  <verify>
    <automated>cd bbj-intellij && ./gradlew test --tests 'com.basis.bbj.intellij.lsp.NodeInstallPipeline*'</automated>
    <automated>grep -q 'removeStaleInstallsQuietly()' bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java</automated>
  </verify>
  <done>Tests B, C and D pass alongside every existing NodeInstallPipeline* test; stale legacy and older-version installs are removed only after a successful install, a failed deletion never fails the install, and unrelated entries survive; committed.</done>
</task>

<task type="auto">
  <name>Task 3: Move the Node.js pin to v22.23.4: digests, rebuilt fixtures, test literals</name>
  <files>bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java, bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifier.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifierTest.java, bbj-intellij/src/test/resources/node-fixtures/README.md, bbj-intellij/src/test/resources/node-fixtures/fake-node-win.zip, bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip, bbj-intellij/src/test/resources/node-fixtures/fake-node-win-no-binary.zip, bbj-intellij/src/test/resources/node-fixtures/fake-node-unix.tar.gz, bbj-intellij/src/test/resources/node-fixtures/fake-node-unix-no-binary.tar.gz</files>
  <read_first>bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifier.java, bbj-intellij/src/test/resources/node-fixtures/README.md, bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifierTest.java</read_first>
  <action>
    Per MTV-R3. A routine Node.js update; follow the wording rule in the context block.

    (1) NodeInstallPipeline.java: set NODE_VERSION to "v22.23.4" and update the two example comments (archiveFileName() javadoc, extractZip comment) to the new version.

    (2) NodeArchiveVerifier.java: replace the six PINNED_TABLE entries with the six v22.23.4 name/digest pairs listed under "Known facts", verbatim, in the same order (darwin-arm64, darwin-x64, linux-arm64, linux-x64, win-arm64, win-x64). Update the table javadoc to name v22.23.4, its SHASUMS256.txt URL, and the transcription date 2026-10-23.

    (3) Fixtures: create a fresh scratch directory outside the repository with mktemp -d. Run each of the five recipes in node-fixtures/README.md with every scratch/ path replaced by that absolute scratch directory and the version folder and marker text changed to v22.23.4. The python3 zipfile scripts and tar -czf ... -C <dir> take absolute paths, so no cd is needed. Copy the five resulting archives over the committed ones in bbj-intellij/src/test/resources/node-fixtures/, then run sha256sum on the copied files. Update README.md: every version string in the five recipes and entry listings becomes v22.23.4, and each section's SHA-256 line takes the new digest. Update the five *_FIXTURE_DIGEST literals in NodeInstallPipelineTest.java to the same values; they stay hand-transcribed literals, never computed at test time. Delete the scratch directory afterwards.

    (4) Test literals: in NodeInstallPipelineTest.java update WINDOWS_ARCHIVE_NAME, WINDOWS_DOWNLOAD_URL, UNIX_ARCHIVE_NAME, the six expected names in everyPlatformAndArchitecturePairAssemblesAnArchiveNameThatHasAPinnedDigest and its download-URL prefix. In NodeArchiveVerifierTest.java update KNOWN_NAME, UNKNOWN_NAME and the six names in pinnedArchiveNamesContainsEachOfTheSixDeclaredFileNames. Leave BbjNodeVersionCacheTest.java untouched. Its version strings are fake probe output, not the pin.

    (5) Run the full bbj-intellij suite. Stage each changed path with its own git add, the five binary fixtures included. Commit: chore(intellij): update the downloaded Node.js to v22.23.4 (#753).
  </action>
  <verify>
    <automated>cd bbj-intellij && ./gradlew test</automated>
    <automated>grep -q 'NODE_VERSION = "v22.23.4"' bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java</automated>
    <automated>python3 -I -c "import re,sys; src=open(sys.argv[1]).read(); pins=dict(re.findall(r'\"(node-v[^\"]+)\", \"([0-9a-f]{64})\"', src)); want={'node-v22.23.4-darwin-arm64.tar.gz':'c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428','node-v22.23.4-darwin-x64.tar.gz':'efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819','node-v22.23.4-linux-arm64.tar.gz':'f7a1e486dbc8b286847815b477d4fb5e9fb963ed4489c3e1588853d685f589f9','node-v22.23.4-linux-x64.tar.gz':'b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406','node-v22.23.4-win-arm64.zip':'a8b8cd79cbbb3062435f449591d98dd63730bbbf30ce2d7cc3a6376c236cb111','node-v22.23.4-win-x64.zip':'cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20'}; sys.exit(0 if pins==want else 1)" bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeArchiveVerifier.java</automated>
    <automated>python3 -I -c "import sys,zipfile; names=[n for f in sys.argv[1:] for n in zipfile.ZipFile(f).namelist()]; sys.exit(0 if any(n.startswith('node-v22.23.4-win-x64/') for n in names) and not any('v22.23.2' in n for n in names) else 1)" bbj-intellij/src/test/resources/node-fixtures/fake-node-win.zip bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip bbj-intellij/src/test/resources/node-fixtures/fake-node-win-no-binary.zip</automated>
    <automated>tar -tzf bbj-intellij/src/test/resources/node-fixtures/fake-node-unix.tar.gz | grep -qx 'node-v22.23.4-linux-x64/bin/node'</automated>
    <automated>bash -c 'for f in fake-node-win.zip fake-node-win-decoy.zip fake-node-win-no-binary.zip fake-node-unix.tar.gz fake-node-unix-no-binary.tar.gz; do d=$(sha256sum "bbj-intellij/src/test/resources/node-fixtures/$f" | cut -d" " -f1); grep -q "$d" bbj-intellij/src/test/resources/node-fixtures/README.md || { echo "README digest mismatch: $f"; exit 1; }; grep -q "$d" bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java || { echo "test digest mismatch: $f"; exit 1; }; done'</automated>
    <automated>bash -c 'out=$(grep -rn --include=*.java --include=*.md "22\.23\.2" bbj-intellij/src); [ $? -le 1 ] || exit 2; ! printf "%s\n" "$out" | grep -v BbjNodeVersionCacheTest.java | grep -q .'</automated>
    <automated>bash -c 'out=$(git diff e71b17e6 -- bbj-intellij) || exit 2; ! printf "%s\n" "$out" | grep -inE "^\+.*(securit|vulnerab|\bcve\b|advisor)"'</automated>
    <automated>bash -c 'out=$(git log e71b17e6..HEAD --format=%B -- bbj-intellij) || exit 2; ! printf "%s\n" "$out" | grep -iE "(securit|vulnerab|\bcve\b|advisor)"'</automated>
    <automated>bash -c 'out=$(git diff e71b17e6 -- bbj-intellij/src) || exit 2; ! printf "%s\n" "$out" | grep -nE "^\+.*(261023|MTV-R[0-9]|D-[0-9]{2})"'</automated>
  </verify>
  <done>The full bbj-intellij Gradle test suite passes; NODE_VERSION is v22.23.4; PINNED_TABLE equals exactly the six v22.23.4 pairs; all five fixtures are rebuilt with v22.23.4 folders and their digests agree across archive, README and test literals; the previous version string survives only in BbjNodeVersionCacheTest.java; the wording and planning-id gates are clean; committed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| nodejs.org download -> plugin data directory | archive bytes arrive over the network and are checked against the digest table compiled into the plugin before extraction |
| plugin data directory on disk -> language server launch | the cached executable is re-checked against its install-time digest record before it is used |
| plugin cleanup -> user file system | the new stale-install removal deletes files, and must stay inside the Node.js data directory |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261023-mtv-01 | Tampering | NodeArchiveVerifier.PINNED_TABLE | high | mitigate | Six values transcribed verbatim from nodejs.org v22.23.4 SHASUMS256.txt (listed in context). Task 3's python gate asserts the table equals exactly those six pairs. NodeInstallPipelineSourceGuardTest still couples NODE_VERSION to the table, and the verify step still precedes extraction and install (guard tests unchanged). |
| T-261023-mtv-02 | Tampering | NodeInstallPipeline.cachedNodePath() | medium | mitigate | Body unchanged: a cache hit still needs exists + executable + matching digest record, with a single guarded return (source guard). Only installedPath() changes, so nothing gets past the digest re-check. |
| T-261023-mtv-03 | Tampering | NodeInstallPipeline.removeStaleInstallsQuietly() | medium | mitigate | Deletes only inside dataDirectory: the exact legacy executable name plus its sidecar, and direct child directories (not symlinks, NOFOLLOW_LINKS) whose name matches v<digits>.<digits>.<digits> and differs from NODE_VERSION. deleteRecursively never follows links (existing guard + symlink test). Test B proves unrelated entries survive. |
| T-261023-mtv-04 | Denial of Service | install() on Windows with a locked node.exe | low | mitigate | Every cleanup failure is swallowed (IOException and RuntimeException). Test C makes a deletion fail and asserts install() and cachedNodePath() still succeed. |
| T-261023-mtv-SC | Tampering | npm/pip/cargo installs | low | accept | This plan installs no packages; nothing to vet. |
</threat_model>

<verification>
- `cd bbj-intellij && ./gradlew test` passes (whole IntelliJ suite, including NodeInstallPipelineTest, NodeInstallPipelineSourceGuardTest, NodeArchiveVerifierTest, BbjNodeDownloaderSourceGuardTest).
- An older-version cache (legacy unversioned or `v<older>/`) is not reported as cached; a fresh install lands in `nodejs/v22.23.4/` and is reported as cached.
- Stale installs are removed only after a successful install, and a failed removal never fails the install.
- The previous version string appears nowhere in bbj-intellij/src except BbjNodeVersionCacheTest.java; the wording and planning-id gates in Task 3 are clean.
</verification>

<success_criteria>
- Existing IntelliJ installs with a Node.js cache from before this change (or from any other version) see "Node.js missing" and the existing download banner/flow, and download v22.23.4 into `bbj-intellij-data/nodejs/v22.23.4/`.
- Settings-path and PATH-detected Node.js resolution is unchanged.
- Three atomic commits referencing #753, worded as a routine Node.js update, each ending with the session's Co-Authored-By trailer.
</success_criteria>

<output>
Create `.planning/quick/261023-mtv-intellij-version-aware-node-js-cache-pin/261023-mtv-SUMMARY.md` when done (deviations recorded there only).
</output>
