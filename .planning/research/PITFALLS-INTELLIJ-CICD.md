# Pitfalls Research: IntelliJ CI/CD

**Domain:** IntelliJ Plugin CI/CD automation for BBj Language Server
**Researched:** 2026-02-05
**Overall Confidence:** HIGH (verified against official docs, real project context, and community issues)

---

## Critical Pitfalls

These mistakes cause build failures, blocked releases, or require significant rework.

### P1: Gradle Build Cache Security Vulnerability

**Risk:** The `gradle/gradle-build-action` repository was archived on Feb 21, 2025. A security vulnerability allowed secrets configured for GitHub Actions to be persisted into the GitHub Actions cache when configuration cache was enabled. Secrets could be read by workflows running in untrusted contexts (PRs from forks).

**Warning Signs:**
- Using `gradle/gradle-build-action` version < 2.4.2
- Configuration cache enabled without encryption
- Stale cache entries from archived action

**Prevention:**
- Migrate to `gradle/actions/setup-gradle` (the successor action)
- Upgrade to at least v2.4.2 if using legacy action
- Review cache configuration for sensitive data exposure
- Consider `cache-encryption-key` secret for encrypted caching

**Phase:** Infrastructure setup (Phase 1)

**Sources:**
- [gradle/gradle-build-action security advisory](https://github.com/gradle/gradle-build-action/security/advisories/GHSA-h3qr-39j9-4r5v)
- [Gradle Config Cache Reuse on CI](https://www.jasonpearson.dev/gradle-config-cache-reuse-on-ci/)

---

### P2: IntelliJ Platform 2025.3+ Unified Distribution Breaking Change

**Risk:** Starting with version 2025.3, IntelliJ IDEA Community and Ultimate are delivered as a unified platform. Gradle fails with "Could not find idea:ideaIC:253.x.x" because Community Edition builds are not available separately for versions 2025.3+.

**Warning Signs:**
- Build fails when targeting 2025.3+ with `intellijIdeaCommunity()`
- Error: "Could not resolve idea:ideaIC:253.x.x"
- Plugin Verifier fails to find IDE releases for 2025.3+

**Prevention:**
- Upgrade IntelliJ Platform Gradle Plugin to 2.10.4+ (current: 2.11.0)
- Switch from `intellijIdeaCommunity()` to `intellijIdea()` dependency helper
- Update Plugin Verifier configuration to handle 4-component version numbers (e.g., 2025.3.1.1)
- Current project uses `intellijIdeaCommunity("2024.2")` which is safe, but CI verification against 2025.3+ will fail

**Phase:** Build configuration (Phase 1)

**Sources:**
- [IntelliJ Platform 2025.3: Plugin Developer Update](https://blog.jetbrains.com/platform/2025/11/intellij-platform-2025-3-what-plugin-developers-should-know/)
- [IntelliJ Platform Gradle Plugin Migration](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-migration.html)

---

### P3: Plugin Signing Certificate Misconfiguration

**Risk:** Plugin signing is required for Marketplace distribution. If signing is misconfigured, the plugin upload fails. Multi-line certificate values in environment variables cause base64 encoding issues.

**Warning Signs:**
- `signPlugin` task fails with "Invalid certificate" or "Could not read certificate"
- Marketplace upload fails with signature verification error
- Certificate secrets contain newlines that GitHub Actions misinterprets

**Prevention:**
- Base64 encode ALL certificate-related secrets (private key, certificate chain)
- Use HEREDOC or `secrets.` syntax correctly in workflow files
- Test signing locally before CI setup: `./gradlew signPlugin`
- Store secrets in GitHub: `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD`
- Generate certificates via JetBrains Marketplace certificate request

**Phase:** Signing and publishing (Phase 2)

**Sources:**
- [Plugin Signing Documentation](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
- [JetBrains intellij-platform-plugin-template](https://github.com/JetBrains/intellij-platform-plugin-template)

---

### P4: Version Synchronization Drift Between VS Code and IntelliJ

**Risk:** The project has two release tracks (VS Code preview.yml and manual-release.yml). Adding IntelliJ creates a third artifact with independent versioning. Over time, versions drift, users get confused about which versions are compatible, and coordinated releases become error-prone.

**Warning Signs:**
- VS Code and IntelliJ plugins have different version numbers
- Language server changes don't propagate to both plugins
- Users report "X works in VS Code but not IntelliJ"
- Manual release requires updating multiple version files

**Prevention:**
- Define single source of truth for version (e.g., root `version.txt` or `lerna.json`)
- Create coordinated release workflow that updates both `bbj-vscode/package.json` and `bbj-intellij/build.gradle.kts`
- Consider semantic versioning with project prefix tags: `vscode-v1.0.0`, `intellij-v1.0.0`
- Document compatibility matrix in releases
- Current project versions: VS Code reads from `package.json`, IntelliJ hardcoded `0.1.0` in build.gradle.kts

**Phase:** Version management (Phase 1)

**Sources:**
- [Monorepos: Version, Tag, and Release Strategy](https://medium.com/streamdal/monorepos-version-tag-and-release-strategy-ce26a3fd5a03)
- [Changesets for monorepo versioning](https://github.com/changesets/changesets)

---

### P5: JDK Version Mismatch Between Local and CI

**Risk:** Gradle toolchain auto-detection can select wrong JDK version. GitHub Actions runners have multiple JDKs installed. Mismatch causes "Could not determine the dependencies of task" or silent compatibility issues.

**Warning Signs:**
- Build works locally but fails on CI
- Error: "Toolchain installation does not provide the required capabilities"
- Error: "Android Gradle plugin requires Java 17 to run. You are currently using Java 11"
- Inconsistent bytecode versions in built artifacts

**Prevention:**
- Explicitly configure JDK in workflow using `actions/setup-java@v4`
- Specify exact JDK distribution and version: `distribution: 'temurin'`, `java-version: '17'`
- Configure Gradle toolchain in `build.gradle.kts` to match
- Add `JAVA_HOME` environment verification step
- Current project requires Java 17 (confirmed in `build.gradle.kts`)

**Phase:** Infrastructure setup (Phase 1)

**Sources:**
- [Gradle Toolchains for JVM projects](https://docs.gradle.org/current/userguide/toolchains.html)
- [actions/setup-java](https://github.com/actions/setup-java)

---

## Moderate Pitfalls

These cause delays, flaky builds, or technical debt.

### P6: Gradlew Permission Denied on CI

**Risk:** The `gradlew` script lacks execute permission in Git. Works on macOS/Windows locally but fails on Linux CI runners with "Permission denied".

**Warning Signs:**
- Error: `/home/runner/work/_temp/...sh: line 1: ./gradlew: Permission denied`
- Build fails immediately on first Gradle command

**Prevention:**
- Fix permanently in repository: `chmod +x gradlew && git update-index --chmod=+x gradlew && git commit`
- Alternative: Add `chmod +x gradlew` step in workflow (temporary fix)
- Current project: Check `bbj-intellij/gradlew` permissions before CI setup

**Phase:** Infrastructure setup (Phase 1)

**Sources:**
- [Gradlew Permission denied issue](https://github.com/actions/starter-workflows/issues/171)
- [gradle/gradle-build-action#517](https://github.com/gradle/gradle-build-action/issues/517)

---

### P7: Gradle Daemon Memory Exhaustion in CI

**Risk:** Gradle daemon and Kotlin compiler daemon consume significant memory. GitHub Actions runners have limited RAM (7GB for ubuntu-latest). Daemon can be killed mid-build.

**Warning Signs:**
- Error: "Gradle build daemon disappeared unexpectedly (it may have been killed or may have crashed)"
- Error: "The Daemon will expire after the build after running out of JVM Metaspace"
- Builds randomly fail on memory-intensive steps (verification, packaging)

**Prevention:**
- Disable daemon in CI (no benefit for one-shot builds): `--no-daemon` flag or `org.gradle.daemon=false`
- Configure JVM args in `gradle.properties`: `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m`
- Limit worker processes: `--max-workers=2`
- Run Kotlin compiler in-process: `GRADLE_OPTS=-Dkotlin.compiler.execution.strategy=in-process`

**Phase:** Build optimization (Phase 1)

**Sources:**
- [Gradle daemon crashes](https://github.com/actions/runner/issues/2503)
- [Common Android memory issues](https://support.circleci.com/hc/en-us/articles/360021812453-Common-Android-memory-issues)

---

### P8: Plugin Verifier Internal API Violations

**Risk:** Plugin Verifier catches usage of `@ApiStatus.Internal` APIs that work in current IDE but will break in future versions. Builds pass but verification fails, blocking release.

**Warning Signs:**
- Verification fails with "Internal API is used" or "Deprecated API is used"
- Error references `@org.jetbrains.annotations.ApiStatus.Internal`
- Warnings about `@ApiStatus.ScheduledForRemoval`

**Prevention:**
- Run `verifyPlugin` task in CI before release
- Review [Incompatible Changes lists](https://plugins.jetbrains.com/docs/intellij/api-changes-list-2025.html) for each target IDE version
- Replace internal API usage with public alternatives (see Internal API Migration docs)
- Configure verification to target recommended IDE versions: `pluginVerification { ides { recommended() } }`
- Current project has this configured correctly in `build.gradle.kts`

**Phase:** Verification (Phase 2)

**Sources:**
- [Verifying Plugin Compatibility](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html)
- [intellij-plugin-verifier](https://github.com/JetBrains/intellij-plugin-verifier)

---

### P9: GitHub Release Asset Upload Failures

**Risk:** When uploading release assets, server errors (502) can partially register the asset. Subsequent retries fail with "ReleaseAsset already_exists" (422). The `--clobber` flag doesn't always work.

**Warning Signs:**
- Error: HTTP 422 "Validation Failed" with "ReleaseAsset.name already exists"
- Release shows partial uploads
- Workflow fails on retry after initial timeout

**Prevention:**
- Implement retry logic with asset deletion between attempts
- Use `gh release upload --clobber` (though not always reliable)
- Check for existing assets before upload and delete if needed
- Consider separate release names if coordinating multiple artifacts
- Implement idempotent release workflow that can resume from failures

**Phase:** Release workflow (Phase 2)

**Sources:**
- [release upload --clobber fails](https://github.com/cli/cli/issues/4863)
- [Error uploading release assets](https://github.com/goreleaser/goreleaser/issues/2746)

---

### P10: Marketplace Publishing Token Expiration

**Risk:** JetBrains Marketplace Personal Access Tokens have expiration dates. If token expires, CI silently fails on `publishPlugin` task. First manual upload requirement is often forgotten.

**Warning Signs:**
- `publishPlugin` task fails with authentication error
- "401 Unauthorized" from Marketplace API
- Token works in test but fails in production workflow

**Prevention:**
- Document token expiration date in team wiki/docs
- Set calendar reminder 2 weeks before expiration
- Store token in GitHub Secrets as `JETBRAINS_MARKETPLACE_TOKEN`
- Remember: First publication MUST be manual via web UI
- Test token validity with API call before release workflow

**Phase:** Publishing setup (Phase 2)

**Sources:**
- [Publishing a Plugin](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)

---

## Low-Risk Pitfalls

These cause minor friction or annoyance.

### P11: Parallel Workflow Cache Key Conflicts

**Risk:** Parallel workflows with same job names use same cache key, causing "Failed to save cache entry" errors. Cache is corrupted or incomplete.

**Warning Signs:**
- Error: "Failed to save cache entry"
- Cache restored from wrong workflow
- Build times inconsistent

**Prevention:**
- Use unique cache keys per workflow: `key: ${{ runner.os }}-gradle-${{ github.workflow }}-${{ hashFiles('**/*.gradle*') }}`
- Consider workflow-specific cache prefixes
- Review `gradle/actions/setup-gradle` cache configuration options

**Phase:** Build optimization (Phase 1)

**Sources:**
- [Parallel workflows cache key conflicts](https://github.com/gradle/gradle-build-action/issues/699)

---

### P12: CI Workflow Slow Build Times (10-20 min)

**Risk:** Default IntelliJ plugin template CI takes 10-20 minutes per run. With frequent commits and dependency updates, CI becomes a bottleneck.

**Warning Signs:**
- Build times consistently > 15 minutes
- Queue of pending workflow runs
- Developers skip waiting for CI

**Prevention:**
- Enable Gradle build cache
- Use `--build-cache` flag
- Configure incremental compilation
- Consider matrix builds for different verification targets
- Run expensive tasks (full verification) only on release branches
- Quick builds (compile, basic tests) on PRs

**Phase:** Build optimization (Phase 3)

**Sources:**
- [Fine-grained GitHub Actions for faster CI](https://github.com/JetBrains/intellij-platform-plugin-template/issues/453)

---

### P13: Artifact Naming Conflicts in Multi-Platform Releases

**Risk:** Both VS Code and IntelliJ artifacts might have similar names. GitHub Release with both artifacts could have naming collisions or user confusion.

**Warning Signs:**
- Assets named generically (e.g., `bbj-language-support.zip`)
- Users download wrong artifact for their IDE
- Automation scripts grab wrong file

**Prevention:**
- Use descriptive artifact names: `bbj-language-support-vscode-1.0.0.vsix`, `bbj-language-support-intellij-1.0.0.zip`
- Include platform and version in filename
- Document artifact naming convention
- Consider separate releases per platform or clear naming in single release

**Phase:** Release workflow (Phase 2)

---

### P14: GitHub Actions Rate Limiting Without Token

**Risk:** Without `GITHUB_TOKEN`, API requests are limited to 60/hour per IP. GitHub-hosted runners share IPs, causing intermittent failures when resolving plugin verifier versions.

**Warning Signs:**
- Error: "API rate limit exceeded"
- Intermittent failures on dependency resolution
- Works sometimes, fails randomly

**Prevention:**
- Always pass `GITHUB_TOKEN` to Gradle steps: `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- With token: 1,000 requests/hour per repository
- Current workflows should include this in all Gradle steps

**Phase:** Infrastructure setup (Phase 1)

**Sources:**
- [intellij-platform-plugin-template rate limiting](https://github.com/JetBrains/intellij-platform-plugin-template)

---

### P15: Build Dependency on VS Code Project Not Building First

**Risk:** The IntelliJ plugin depends on artifacts from the VS Code project (`bbj-vscode/out/language/main.cjs`, `bbj-vscode/syntaxes/*.tmLanguage.json`). If CI builds IntelliJ first without building VS Code, the copy tasks fail.

**Warning Signs:**
- Error: "Source directory does not exist: bbj-vscode/out/language"
- Missing TextMate bundles in plugin
- Language server not included in plugin zip

**Prevention:**
- In CI workflow, build VS Code project before IntelliJ: `npm ci && npm run build` in bbj-vscode first
- Use `needs:` dependency in GitHub Actions if separate jobs
- Consider extracting shared artifacts to a separate build step
- Current `build.gradle.kts` assumes these files exist (lines 76-97)

**Phase:** Infrastructure setup (Phase 1)

---

## Project-Specific Concerns

Based on analysis of current repository:

| Concern | Current State | Risk | Mitigation |
|---------|---------------|------|------------|
| VS Code workflow exists | `preview.yml`, `manual-release.yml` | Version drift | Unified version source of truth |
| IntelliJ version hardcoded | `version = "0.1.0"` in build.gradle.kts | Out of sync | Read from shared version file |
| Language server dependency | IntelliJ copies from `bbj-vscode/out/` | Build order dependency | Ensure VS Code builds first |
| TextMate bundle shared | Copied from `bbj-vscode/syntaxes/` | Path assumptions | Verify paths in CI environment |
| No IntelliJ CI yet | Only VS Code workflows | Missing coverage | Add IntelliJ build workflow |
| Gradlew not in repo | `bbj-intellij/` has no gradlew | Wrapper generation needed | Run `gradle wrapper` |

---

## Checklist

### Phase 1: Infrastructure Setup
- [ ] Generate Gradle wrapper in `bbj-intellij/`: `gradle wrapper --gradle-version 8.10`
- [ ] Verify `gradlew` has execute permission in git
- [ ] Configure JDK 17 explicitly in workflow with `actions/setup-java@v4`
- [ ] Use `gradle/actions/setup-gradle` (not archived `gradle-build-action`)
- [ ] Configure Gradle daemon settings for CI (disable or memory limits)
- [ ] Pass `GITHUB_TOKEN` to all Gradle steps
- [ ] Establish version synchronization strategy between VS Code and IntelliJ
- [ ] Ensure VS Code project builds before IntelliJ in CI

### Phase 2: Signing and Publishing
- [ ] Generate JetBrains Marketplace certificate
- [ ] Base64 encode certificate secrets
- [ ] Store `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD` in GitHub Secrets
- [ ] Perform first manual upload to Marketplace
- [ ] Store `JETBRAINS_MARKETPLACE_TOKEN` in GitHub Secrets
- [ ] Document token expiration date

### Phase 3: Release Automation
- [ ] Add `verifyPlugin` step to CI
- [ ] Configure Plugin Verifier for recommended IDEs
- [ ] Implement idempotent release workflow with retry logic
- [ ] Define artifact naming convention
- [ ] Create coordinated release workflow for both platforms
- [ ] Set up version bumping that updates both projects

### Ongoing Maintenance
- [ ] Monitor JetBrains Platform blog for breaking changes
- [ ] Review Incompatible Changes list before targeting new IDE versions
- [ ] Refresh Marketplace token before expiration
- [ ] Update Gradle Plugin version periodically (current: 2.x, recommended: 2.11.0+)

---

## Sources

### Official Documentation
- [IntelliJ Platform Plugin SDK - Publishing](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)
- [IntelliJ Platform Gradle Plugin 2.x](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html)
- [Plugin Signing](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
- [Verifying Plugin Compatibility](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html)
- [Incompatible Changes 2025.*](https://plugins.jetbrains.com/docs/intellij/api-changes-list-2025.html)

### JetBrains Blog
- [IntelliJ Platform 2025.3: Plugin Developer Update](https://blog.jetbrains.com/platform/2025/11/intellij-platform-2025-3-what-plugin-developers-should-know/)
- [Busy Plugin Developers Newsletter Q4 2025](https://blog.jetbrains.com/platform/2026/01/busy-plugin-developers-newsletter-q4-2025/)

### Gradle Documentation
- [Executing Gradle builds on GitHub Actions](https://docs.gradle.org/current/userguide/github-actions.html)
- [Gradle Toolchains](https://docs.gradle.org/current/userguide/toolchains.html)

### GitHub Resources
- [JetBrains/intellij-platform-plugin-template](https://github.com/JetBrains/intellij-platform-plugin-template)
- [JetBrains/intellij-plugin-verifier](https://github.com/JetBrains/intellij-plugin-verifier)
- [gradle/actions/setup-gradle](https://github.com/gradle/actions)
