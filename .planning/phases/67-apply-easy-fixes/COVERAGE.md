# API Coverage — Phase 67 (Apply Easy Fixes)

No external API integration: Phase 67 applies 73 already-classified `easy-fix` findings to existing
source, config, CI and documentation files and integrates no external API, SDK or service.

The `api-coverage` detector fired on a single signal — the phrase "the language server has no direct
VS Code API" in `67-03-PLAN.md` — which is a statement that an API is *not* available on that code
path, not an integration. Re-reading the phase scope confirms it: every one of the 12 plans edits a
named `file:line` range in a file that already exists, and INVENTORY §3c test 3 required every
`easy-fix` record to add or upgrade no dependency, so no new client, SDK or service surface enters
the tree.

The two integration surfaces the phase *touches* were both integrated in earlier milestones and gain
no new capability here:

- **java-interop socket peer (127.0.0.1:5008)** — plan 67-02 fixes 7 defects in the existing client
  (`bbj-vscode/src/language/java-interop.ts`): connection lifecycle, cache invalidation, an unbounded
  cache, a duplicated request path and a stale comment. No new request type, no new endpoint, no
  protocol change. The peer is unreachable in this environment and every test drives the existing
  `JavaInteropTestService` double.
- **LSP client/server surface** — plans 67-04, 67-07 and 67-09 fix defects in completion, document
  symbols, signature help, hover and the TextMate grammar. INVENTORY §3c test 2 required every
  `easy-fix` record to make no public API, grammar or LSP contract change, so the request/response
  contract is identical before and after.

Fabricating a capability matrix for either surface would record decisions this phase does not make.
</content>
