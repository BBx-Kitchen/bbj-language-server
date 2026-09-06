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

## fake-node-unix.tar.gz

Unix-branch fixture. One top-level directory so `--strip-components=1` yields `README.md` and
`bin/node` directly under the extraction directory. `bin/node` carries recognisable marker bytes.

Built from a scratch directory containing:

```
node-v20.18.1-linux-x64/README.md    -> "Node.js v20.18.1 readme (fixture)\n"
node-v20.18.1-linux-x64/bin/node     -> "fake-node-binary-unix\n"
```

with the following commands:

```
mkdir -p scratch/node-unix/node-v20.18.1-linux-x64/bin
printf 'Node.js v20.18.1 readme (fixture)\n' > scratch/node-unix/node-v20.18.1-linux-x64/README.md
printf 'fake-node-binary-unix\n' > scratch/node-unix/node-v20.18.1-linux-x64/bin/node
tar -czf scratch/fake-node-unix.tar.gz -C scratch/node-unix node-v20.18.1-linux-x64
sha256sum scratch/fake-node-unix.tar.gz
```

SHA-256: `4917712360d519aeca16db0811b9ed99b076992d91b1d978d3beac8dd2d0951d`

## fake-node-win-no-binary.zip

Windows-branch negative fixture: only the decoy `CHANGELOG.md` entry, no `node.exe`.

Built from a scratch directory containing:

```
node-v20.18.1-win-x64/CHANGELOG.md   -> "Node.js v20.18.1 changelog (fixture)\n"
```

with the following commands:

```
mkdir -p scratch/node-win-no-binary/node-v20.18.1-win-x64
printf 'Node.js v20.18.1 changelog (fixture)\n' > scratch/node-win-no-binary/node-v20.18.1-win-x64/CHANGELOG.md
python3 -c "
import zipfile
with zipfile.ZipFile('scratch/fake-node-win-no-binary.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('scratch/node-win-no-binary/node-v20.18.1-win-x64/CHANGELOG.md', arcname='node-v20.18.1-win-x64/CHANGELOG.md')
"
sha256sum scratch/fake-node-win-no-binary.zip
```

SHA-256: `b550d1ac01b4d700749cd110df57578ea9176d80d1e4c36a62e29b313c7f398c`

## fake-node-unix-no-binary.tar.gz

Unix-branch negative fixture: one top-level directory with only `README.md`, no `bin/node`.

Built from a scratch directory containing:

```
node-v20.18.1-linux-x64/README.md    -> "Node.js v20.18.1 readme (fixture)\n"
```

with the following commands:

```
mkdir -p scratch/node-unix-no-binary/node-v20.18.1-linux-x64
printf 'Node.js v20.18.1 readme (fixture)\n' > scratch/node-unix-no-binary/node-v20.18.1-linux-x64/README.md
tar -czf scratch/fake-node-unix-no-binary.tar.gz -C scratch/node-unix-no-binary node-v20.18.1-linux-x64
sha256sum scratch/fake-node-unix-no-binary.tar.gz
```

SHA-256: `b9c180afeb6ca2746f6ddb17681649b21e3b35680733c739dddc9705e3a1c75b`
