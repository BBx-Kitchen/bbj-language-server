# Archived Quick Tasks

- [260914-7tx-fix-667-input-verification-rules-accept-](260914-7tx-fix-667-input-verification-rules-accept-/260914-7tx-SUMMARY.md)
- [260914-l1o-fix-663-run-and-call-file-targets-hover-](260914-l1o-fix-663-run-and-call-file-targets-hover-/260914-l1o-SUMMARY.md)
- [260916-7vf-fix-671-stale-outputchannel-and-672-spur](260916-7vf-fix-671-stale-outputchannel-and-672-spur/260916-7vf-SUMMARY.md)
- [260916-9jy-drop-the-internal-passwordsafesettings-a](260916-9jy-drop-the-internal-passwordsafesettings-a/260916-9jy-SUMMARY.md)
- [260917-9ei-verify-before-publish-in-the-release-and](260917-9ei-verify-before-publish-in-the-release-and/260917-9ei-SUMMARY.md)

## Completed table (moved from STATE.md at the v4.4 close, 2026-09-20)

Directory links are relative to this archive. Row 2 (Gradle 9 migration, PR #669) never had a directory.

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260914-7tx | Fix #667: INPUT verification rules accept numeric literals/expressions (e.g. pick:(c)) | 2026-09-14 | 082d02f8 | — | [260914-7tx-fix-667-input-verification-rules-accept-](./260914-7tx-fix-667-input-verification-rules-accept-/) |
| 2 | Gradle 9 migration: land #652 (wrapper 9.7.1) + #654 (IntelliJ Platform plugin 2.18.1) via PR #669 — 9.7.1 checksums, drop instrumentationTools() | 2026-09-14 | 890e1125 | — | — |
| 260914-l1o | Fix #663: RUN/CALL file targets — hover shows resolved path, Ctrl/Cmd-Click opens the program (shared resolver with #173 warning) | 2026-09-14 | f695aec4 | — | [260914-l1o-fix-663-run-and-call-file-targets-hover-](./260914-l1o-fix-663-run-and-call-file-targets-hover-/) |
| 260916-7vf | Fix #671 ("Channel has been closed" — extension now owns the output channel so a restart cannot dispose it) + #672 (a transient unreadable config.bbx no longer restarts the language server) | 2026-09-16 | 3e5ecaa5 | — | [260916-7vf-fix-671-stale-outputchannel-and-672-spur](./260916-7vf-fix-671-stale-outputchannel-and-672-spur/) |
| 260916-9jy | SEED-001: BbjEMTokenStore.resolveBackend() classifies from the public PasswordSafe.isMemoryOnly() instead of the internal PasswordSafeSettings/ProviderType, unblocking the verifyPlugin INTERNAL_API_USAGES gate that failed the v0.15.0 release; folds in running verifyPlugin in PR validation + preview (ci: 54960905) | 2026-09-16 | 1c80dfb1 | — | [260916-9jy-drop-the-internal-passwordsafesettings-a](./260916-9jy-drop-the-internal-passwordsafesettings-a/) |
| 260917-9ei | SEED-002 (both parts): one verification job now gates every publish, tag and push in manual-release.yml (5 jobs) and preview.yml (4 jobs + concurrency group); Part B caches the verifier's ~211 MB plugin downloads in all three verifyPlugin jobs, IDE distributions deliberately not cached | 2026-09-17 | fa2c80bf | — | [260917-9ei-verify-before-publish-in-the-release-and](./260917-9ei-verify-before-publish-in-the-release-and/) |
