# Vendored formatter libraries: provenance

This directory ships pre-built, vendored `.jar` files that the bundled BBj code formatter CLI
loads at runtime. This note records where each library with a public package coordinate came
from, so an advisory scanner (or a person) can check it against known vulnerabilities.

## jcommander

| Field | Value |
|---|---|
| Library | jcommander |
| Maven coordinate | `com.beust:jcommander` |
| Version | 1.71 |
| Vendor / publisher | Cedric Beust |
| License | Apache-2.0 |
| SHA-256 | `b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804` |
| Size | 67503 bytes |
| Package URL | `pkg:maven/com.beust/jcommander@1.71` |
| Vendored on | 2023-07-10 |

### Origin

The JAR's own manifest identifies it as jcommander 1.71 (Apache-2.0, built 2017-04-27). Version
1.71 is not published on Maven Central (1.69 and 1.72 are), so no upstream digest exists for
this exact build; the SHA-256 above records the bytes as vendored into this repository on
2023-07-10. `BBjCFCli.jar`'s manifest `Class-Path` names `lib/jcommander-1.71.jar` explicitly,
which is why this file is never swapped or renamed on its own — the BASIS-supplied CLI expects
that exact filename next to it.

### Checking for advisories

Run an advisory scanner against the CycloneDX SBOM committed alongside this file:

```bash
osv-scanner scan --sbom bbj-vscode/tools/formatter/lib/bom.json
```

or query the [OSV API](https://osv.dev) directly with the package URL above. Nothing in this
repository re-runs either check automatically, so treat any specific result as a snapshot from
whenever it was last run, not a standing guarantee — re-run the scanner or the API query
yourself before relying on jcommander's advisory status. As a point-in-time example, a manual
OSV API query for `pkg:maven/com.beust/jcommander@1.71` on 2026-09-28 returned no advisories
(`{}`); a positive-control query against `pkg:maven/com.google.guava/guava@31.1-jre` in the same
session returned `CVE-2023-2976`, which at least confirmed the query path was live and not
silently failing closed at that moment.

One tangential, non-blocking finding: Snyk's vulnerability database (not OSV) lists
[SNYK-JAVA-COMBEUST-174815](https://security.snyk.io/vuln/SNYK-JAVA-COMBEUST-174815), "Unsafe
Dependency Resolution," affecting jcommander versions before 1.75. That advisory describes a
build-time issue in how jcommander itself resolves its own dependencies over plain HTTP when
built from source — it does not apply to a JAR vendored here as a committed binary that is never
rebuilt from source in this repository's pipeline. It is not present in OSV. The JAR was not
swapped in response to it.

### Not recorded here

`BBjCFCli.jar` and `BBjCodeFomatter.jar`, the two BASIS-supplied JARs also vendored in this
directory tree, have no public package coordinate an advisory database could match — they are
BASIS-internal builds with no upstream registry entry. They are guarded instead by their
SHA-256 pins in `bbj-vscode/src/formatter-verifier.ts`, alongside jcommander's own pin.

### Updating

If jcommander is ever re-vendored, do it deliberately from a source you can independently
verify, and update `bom.json`, this README, and the `lib/jcommander-1.71.jar` entry in
`FORMATTER_ARTIFACT_PINS` (`bbj-vscode/src/formatter-verifier.ts`) together. The existing vitest
drift suite (`bbj-vscode/test/formatter-pins-drift.test.ts`) fails if any of the three records —
the real bytes, the pin table, and this provenance record — stop agreeing with each other.
