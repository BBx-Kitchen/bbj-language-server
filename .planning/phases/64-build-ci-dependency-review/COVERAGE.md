# API Coverage — Phase 64: Build, CI & Dependency Review

No external API integration: Phase 64 writes no code and calls no service — it reads the 6 GitHub
Actions workflows, `.github/dependabot.yml`, the Gradle/esbuild/packaging manifests, the 3
`bbj-vscode/tools/*.bbj` scripts and the 3 vendored formatter JARs as read-only review **subject
matter**, and records verdicts into `.planning/reviews/64-COVERAGE.md`.

The `npm audit` and advisory-lookup queries the phase runs are evidence-gathering against public
registries for SEC-08, not an integration this project builds or ships.
