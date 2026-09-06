# Node install pipeline fixtures

These archives are committed on purpose and are never generated at test time. Each one is a
tiny, hand-built stand-in for a real Node.js distribution archive, built once outside this
repository with a real `zip`/`tar` invocation and copied in. If you need to change one, rebuild
it the same way, recompute its digest with `sha256sum`, and update both this file and the pinned
digest literal in the test that consumes it — the pin is a literal in the test precisely so a
fixture changed without updating the pin fails a test instead of silently passing.

## fake-node-win.zip

Windows-branch fixture. Two entries, in this order: a decoy `CHANGELOG.md` first (so the
extractor's skip-non-matching-entry branch is exercised), then `node.exe` carrying recognisable
marker bytes.

Built from a scratch directory containing:

```
node-v20.18.1-win-x64/CHANGELOG.md   -> "Node.js v20.18.1 changelog (fixture)\n"
node-v20.18.1-win-x64/node.exe       -> "fake-node-binary-windows\n"
```

with the following commands (`scratch/` is a throwaway directory outside this repository):

```
mkdir -p scratch/node-win/node-v20.18.1-win-x64
printf 'Node.js v20.18.1 changelog (fixture)\n' > scratch/node-win/node-v20.18.1-win-x64/CHANGELOG.md
printf 'fake-node-binary-windows\n' > scratch/node-win/node-v20.18.1-win-x64/node.exe
python3 -c "
import zipfile
with zipfile.ZipFile('scratch/fake-node-win.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('scratch/node-win/node-v20.18.1-win-x64/CHANGELOG.md', arcname='node-v20.18.1-win-x64/CHANGELOG.md')
    z.write('scratch/node-win/node-v20.18.1-win-x64/node.exe', arcname='node-v20.18.1-win-x64/node.exe')
"
sha256sum scratch/fake-node-win.zip
```

SHA-256: `3debcb508f3ec25a01dba16ab0dde84217a48c74c621f8a69d6d1e3debc76df7`
