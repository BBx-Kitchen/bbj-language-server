# Phase 120: ClassValidator & activate() Splits - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-29
**Phase:** 120-classvalidator-activate-splits
**Areas discussed:** ClassValidator module cut, Shared exec helper shape, Dead-branch ripple, activate() layout & guards

---

## Todos

| Option | Description | Selected |
|--------|-------------|----------|
| Fold none | All three matched on keywords only | ✓ |
| IntelliJ interop key mismatch | Unrelated IntelliJ plus language-server change | |
| Signature-help escaping | Unrelated security fix | |

## ClassValidator module cut

| Question | Options | Selected |
|----------|---------|----------|
| Module count | Four modules / Issue's three-way cut | Four modules |
| Shape | Free functions / Small classes / You decide | Free functions |
| Registration | One registerClassChecks / One register* per module | One registerClassChecks |
| Shared helpers | New class-types helper / Stay in check-classes.ts / Re-export for compatibility | New class-types helper |

## Shared exec helper shape

| Question | Options | Selected |
|----------|---------|----------|
| The helper | Layer on runProcess / One helper for all three | Layer on runProcess |
| execWithProgress alias | Keep the alias / Inline to runProcess | Keep the alias |
| Error handling | Stays with callers / Helper normalizes errors | Stays with callers |
| EM home | New em-auth module / Stay in extension.ts | New em-auth module |

**Notes:** After "New em-auth module", Claude pointed out that `em-secret-env-channel.test.ts`
requires a launcher call inside `extension.ts`. The conflict was settled in the last area
("Widen file lists only").

## Dead-branch ripple

| Question | Options | Selected |
|----------|---------|----------|
| runWeb non-token else | Remove it too / Keep it | Remove it too |
| `__token__` sentinel | Keep the shape / Return the token only | Keep the shape |
| Stale bbj.em.credentials secret | Leave it / Delete it once | Leave it |

## activate() layout & guards

| Question | Options | Selected |
|----------|---------|----------|
| Source guards | Widen file lists only / Keep guarded code in extension.ts | Widen file lists only |
| Layout | Mixed by size / All in extension.ts / One module each | Mixed by size |
| Shared state | Pass as deps / Keep module globals | Pass as deps |
| Command check | New package.json cross-check / Existing suite only | New package.json cross-check |

## Claude's Discretion

- Module and file names; exactly which activate() concerns get their own module; whether the
  always-true `__token__` check in `ensureValidToken` stays; the plan split.

## Deferred Ideas

- Bare-token credential shape; deleting the stale SecretStorage entry; #466 coverage extension.
