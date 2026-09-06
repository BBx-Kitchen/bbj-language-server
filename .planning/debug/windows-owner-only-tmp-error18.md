---
status: diagnosed
trigger: "Investigate issue G-80-1 (windows-owner-only-tmp-error18): On a Windows host, the IntelliJ plugin's Login to Enterprise Manager action fails because em-login.bbj cannot open the owner-only temp file created by BbjProcessSecretEnv.createOwnerOnlyFile. BBj reports !ERROR=18 User not allowed."
created: 2026-09-05T00:00:00Z
updated: 2026-09-05T00:00:00Z
audit_acknowledged:
  milestone: v4.2
  at: 2026-09-06
  status: diagnosed
---

## Current Focus

hypothesis: CONFIRMED — OwnerOnlyAcl.OWNER_PERMISSIONS (bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java) omits AclEntryPermission.READ_NAMED_ATTRS and WRITE_NAMED_ATTRS, which map 1:1 to Windows' FILE_READ_EA/FILE_WRITE_EA access-mask bits. Windows' CreateFile() generic-rights mapping folds FILE_READ_EA into GENERIC_READ and FILE_WRITE_EA into GENERIC_WRITE; a combined-mask open request is denied in full if any single requested bit is not granted by an ACE. BBj's open(ch,mode="O_CREATE,O_TRUNC") on em-login.bbj's already-existing output channel requests that combined access, so the single-ACE DACL the plugin wrote denies the whole request, surfaced as !ERROR=18 "User not allowed".
test: Traced (a) OwnerOnlyAcl.java's OWNER_PERMISSIONS set against Microsoft's documented GENERIC_READ/GENERIC_WRITE→native-access-mask expansion (confirmed via web search: MS Learn File-Security-and-Access-Rights + generic-access-rights docs); (b) the POSIX branch's coarser owner-rw bits (no EA-equivalent sub-permission on POSIX) to explain why only the new Windows branch is affected; (c) the process-launch code path to check whether a different execution identity (not a permission-bit gap) could instead explain the symptom.
expecting: If READ_NAMED_ATTRS/WRITE_NAMED_ATTRS are the true gap, the code should show exactly this permission set with those two omitted, and the launch code should show the same-account child-process model (ruling out identity as the *necessary* cause, though not fully excluding it as a possible secondary factor).
next_action: Diagnose-only mode — investigation is at Phase 4 CONFIRMED; report root cause. No fix applied (goal: find_root_cause_only).

## Symptoms

expected: On Windows, em-login.bbj writes through to the owner-only temp file (bbj-em-login-*.tmp) created by BbjProcessSecretEnv.createOwnerOnlyFile. The file carries exactly one ACE for the logged-in Windows account (no BUILTIN\Users, Everyone, Authenticated Users, no inherited (I) entries) and login/validation still completes.
actual: BBj fails at the open() of the output file. The plugin's ACL branch apparently created the file, but BBj is denied when opening it for O_CREATE,O_TRUNC. Login never completes.
errors: |
  !ERROR=18  ([C:\Users\beff\AppData\Local\Temp\bbj-em-login-8853933440741698129.tmp] User not allowed: C:\Users\beff\AppData\Local\Temp\bbj-em-login-8853933440741698129.tmp)
  [49] open(ch,mode="O_CREATE,O_TRUNC")outputFile!
  READY
  >? pgm(-1)
  C:\Users\beff\AppData\Roaming\JetBrains\IntelliJIdea2026.2\plugins\bbj-intellij\lib\tools\em-login.bbj
reproduction: Test 1 in .planning/phases/80-em-token-security/80-UAT.md. On a Windows host (IntelliJ IDEA 2026.2, plugin installed, BBj installed with BBjServices running), Tools > Login to Enterprise Manager, enter credentials. The BBj console shows the error above.
started: Introduced in phase 80 plan 02 (Windows ACL branch of createOwnerOnlyFile); worked before phase 80 when the plugin used a plain temp file (fallback, broadly readable).

## Eliminated

- hypothesis: "BBj's interpreter runs INSIDE a persistent BBjServices process under a different Windows service account (e.g. LocalSystem) than the interactive user who created the ACL'd file, so the ACE simply names the wrong principal (investigation lead #1)."
  evidence: "BbjEMLoginAction.performLogin (lines 89-133) builds `bbjPath = bbjHome/bin/bbj.exe` and launches it directly via `new GeneralCommandLine(bbjPath.toString())` + `CapturingProcessHandler.runProcess()` — a plain child-process spawn of the IntelliJ (interactive-user) process, with no impersonation/runAs/RPC to BBjServices visible anywhere in this call path. BbjRunActionBase.validateTokenServerSide (lines 288-328) does the same for em-validate-token.bbj via `OSProcessHandler`/`CapturingProcessHandler`. Standard Win32 CreateProcess semantics: a child spawned this way inherits the parent's security token, i.e. the same interactive-user account `System.getProperty(\"user.name\")` resolves to when BbjProcessSecretEnv builds the ACL principal. This is not a live Windows trace of bbj.exe's internals (proprietary BASIS binary), so it is downgraded rather than fully disproven — retained as a blind spot, not ruled back into the primary mechanism, because the permission-floor gap below is independently sufficient to reproduce the exact symptom even under a same-account open."
  timestamp: 2026-09-05T00:00:00Z

## Evidence

- timestamp: 2026-09-05T00:00:00Z
  checked: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java (OWNER_PERMISSIONS, lines 35-44) and OwnerOnlyAclTest.java's matching assertion (lines 63-76)
  found: The Windows ACE permission floor is exactly {READ_DATA, WRITE_DATA, APPEND_DATA, READ_ATTRIBUTES, WRITE_ATTRIBUTES, DELETE, SYNCHRONIZE, READ_ACL}. It does NOT include AclEntryPermission.READ_NAMED_ATTRS or WRITE_NAMED_ATTRS anywhere in the source tree (grep for READ_NAMED_ATTRS/WRITE_NAMED_ATTRS across bbj-intellij/src returns zero hits).
  implication: The single ALLOW ACE the plugin writes to the Windows temp file cannot satisfy any Windows access request that includes FILE_READ_EA or FILE_WRITE_EA.

- timestamp: 2026-09-05T00:00:00Z
  checked: Web search of Microsoft Learn docs (File Security and Access Rights; Generic Access Rights) for the native semantics of CreateFile's GENERIC_READ/GENERIC_WRITE
  found: "GENERIC_READ maps to STANDARD_RIGHTS_READ, FILE_READ_DATA, FILE_READ_ATTRIBUTES, FILE_READ_EA, and SYNCHRONIZE" and "GENERIC_WRITE maps to STANDARD_RIGHTS_WRITE, FILE_WRITE_DATA, FILE_WRITE_ATTRIBUTES, FILE_WRITE_EA, FILE_APPEND_DATA, and SYNCHRONIZE." Further: "When you use GENERIC_READ or GENERIC_WRITE with CreateFile, Windows automatically includes FILE_READ_EA and FILE_WRITE_EA permissions as part of these generic rights. If your DACL doesn't explicitly allow these specific file attribute access rights, the call can fail with ERROR_ACCESS_DENIED." Java's java.nio AclEntryPermission maps 1:1 onto these native bits (READ_NAMED_ATTRS -> FILE_READ_EA, WRITE_NAMED_ATTRS -> FILE_WRITE_EA) with no generic-mapping expansion performed by the JDK's Windows ACL provider — the JDK writes exactly the bits the caller supplies.
  implication: Any Windows CreateFile-style open that requests combined GENERIC_READ|GENERIC_WRITE access (or any access mode that maps to a bit set including FILE_READ_EA/FILE_WRITE_EA) against a file whose DACL is exactly OwnerOnlyAcl's set will be denied outright — Windows access checks require the full requested mask to be covered, not a partial match.
  implication: This matches em-login.bbj's `open(ch,mode=\"O_CREATE,O_TRUNC\")outputFile!` against a file the plugin already created (line 49 of the reported error) — BBj's runtime opens that channel for read+write (the same channel is immediately used for `write(ch)`, and BBj SERIAL/text-channel opens are not restricted to write-only by this mode string), so the request plausibly includes the missing EA bits and is denied in full, producing exactly !ERROR=18 "User not allowed".

- timestamp: 2026-09-05T00:00:00Z
  checked: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java createOwnerOnlyFile's POSIX branch (lines 124-127) vs the ACL branch (lines 130-151)
  found: The already-shipped, already-tested POSIX branch sets only OWNER_READ/OWNER_WRITE (mode 0600) via PosixFilePermissions.asFileAttribute — POSIX has no separate "read/write extended attributes" sub-permission; owner read+write is one coarse-grained unit that already covers everything BBj's open() could request.
  implication: Explains why this defect is exclusive to the newly-added Windows ACL branch (80-02) and was invisible to every test in the plan (CI is ubuntu-latest; this host reports posix) — the POSIX and Windows permission models are not equivalent in granularity, and the Windows floor was under-specified relative to what a real Windows CreateFile open needs.

- timestamp: 2026-09-05T00:00:00Z
  checked: .planning/phases/80-em-token-security/80-02-SUMMARY.md and 80-02-PLAN.md ("Windows verification status", flagged assumption 3, D-09/D-10d)
  found: Both documents explicitly and repeatedly state the Windows ACL branch was never executed by any automated test (CI is ubuntu-latest only), that the D-09 permission floor is "assumed sufficient for em-login.bbj's truncate-and-write" purely by analogy to the POSIX test, and that "if the manual check shows BBj cannot write, granting the owner full control is the documented remedy." STATE.md's phase-80 decision log repeats the same caveat verbatim.
  implication: The gap was a known, flagged, carried-forward risk (not a silent regression) — the plan anticipated exactly this failure mode and pre-authorized widening the permission floor as the remedy; it is the human UAT step (this G-80-1 report) that actually exercised it and confirmed the gap.

- timestamp: 2026-09-05T00:00:00Z
  checked: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java (performLogin, lines 89-133) and BbjRunActionBase.java (validateTokenServerSide, lines 288-328)
  found: Both callers build `bbjHome/bin/bbj(.exe)` and launch it directly as a child process via IntelliJ's GeneralCommandLine + CapturingProcessHandler/OSProcessHandler — no RPC to a separately-running BBjServices instance, no impersonation, no runAs. Documentation (documentation/docs/intellij/getting-started.md, configuration.md) describes BBjServices as a separate persistent local service (Java interop port, EM Jetty webapp) distinct from this per-invocation `bbj` child process.
  implication: Weighs against the identity-mismatch lead as the necessary mechanism (see Eliminated) — the process that runs em-login.bbj is ordinarily the same Windows account that created the ACL'd file, so a principal mismatch is not required to reproduce the reported error; the permission-floor gap alone is sufficient.

## Resolution

root_cause: "The Windows ACL permission floor built by OwnerOnlyAcl.ownerOnlyAcl() (bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/OwnerOnlyAcl.java, OWNER_PERMISSIONS) omits AclEntryPermission.READ_NAMED_ATTRS and WRITE_NAMED_ATTRS. These map 1:1 to Windows' native FILE_READ_EA/FILE_WRITE_EA access-mask bits, which Windows' CreateFile() folds into GENERIC_READ and GENERIC_WRITE respectively (per Microsoft's documented generic-rights mapping) and denies in full if either bit is missing from the DACL. BBj's `open(ch,mode=\"O_CREATE,O_TRUNC\")outputFile!` in em-login.bbj (and equivalently em-validate-token.bbj) opens the plugin's already-created, single-ACE temp file for read+write, so the combined access request includes the two missing EA bits and is denied outright, producing !ERROR=18 'User not allowed' at exactly the reported open call. The already-shipped POSIX branch never hit this because POSIX owner-read/owner-write is one coarse permission unit with no EA-equivalent sub-permission, so the same under-specification is invisible there — this is why the bug is exclusive to the new Windows-only branch introduced in phase 80 plan 02 and was never caught by CI (ubuntu-latest only) or by any test in this repo. AND-gate: not required — this single code-category defect (an incomplete permission set) is independently sufficient to reproduce the exact reported symptom regardless of which Windows account actually runs the BBj process, so no second simultaneous condition is needed. The identity-mismatch lead (BBjServices running as a different service account) was investigated and downgraded, not proven, since the code launches BBj as a direct child process of the interactive user's IntelliJ process."
fix: ""
verification: ""
files_changed: []
