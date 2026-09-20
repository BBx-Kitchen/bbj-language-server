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
node-v22.23.2-win-x64/CHANGELOG.md   -> "Node.js v22.23.2 changelog (fixture)\n"
node-v22.23.2-win-x64/node.exe       -> "fake-node-binary-windows\n"
```

with the following commands (`scratch/` is a throwaway directory outside this repository):

```
mkdir -p scratch/node-win/node-v22.23.2-win-x64
printf 'Node.js v22.23.2 changelog (fixture)\n' > scratch/node-win/node-v22.23.2-win-x64/CHANGELOG.md
printf 'fake-node-binary-windows\n' > scratch/node-win/node-v22.23.2-win-x64/node.exe
python3 -c "
import zipfile
with zipfile.ZipFile('scratch/fake-node-win.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('scratch/node-win/node-v22.23.2-win-x64/CHANGELOG.md', arcname='node-v22.23.2-win-x64/CHANGELOG.md')
    z.write('scratch/node-win/node-v22.23.2-win-x64/node.exe', arcname='node-v22.23.2-win-x64/node.exe')
"
sha256sum scratch/fake-node-win.zip
```

SHA-256: `7886ad2638168e4b4a2823b4d8149090ef421a6a2a8da7e7a75cb42a9dc1a454`

## fake-node-unix.tar.gz

Unix-branch fixture. One top-level directory so `--strip-components=1` yields `README.md` and
`bin/node` directly under the extraction directory. `bin/node` carries recognisable marker bytes.

Built from a scratch directory containing:

```
node-v22.23.2-linux-x64/README.md    -> "Node.js v22.23.2 readme (fixture)\n"
node-v22.23.2-linux-x64/bin/node     -> "fake-node-binary-unix\n"
```

with the following commands:

```
mkdir -p scratch/node-unix/node-v22.23.2-linux-x64/bin
printf 'Node.js v22.23.2 readme (fixture)\n' > scratch/node-unix/node-v22.23.2-linux-x64/README.md
printf 'fake-node-binary-unix\n' > scratch/node-unix/node-v22.23.2-linux-x64/bin/node
tar -czf scratch/fake-node-unix.tar.gz -C scratch/node-unix node-v22.23.2-linux-x64
sha256sum scratch/fake-node-unix.tar.gz
```

SHA-256: `b907928f77ce903538200180fb376929fd2fa35b98ddb3bd17ca247c74e05f1e`

## fake-node-win-no-binary.zip

Windows-branch negative fixture: only the decoy `CHANGELOG.md` entry, no `node.exe`.

Built from a scratch directory containing:

```
node-v22.23.2-win-x64/CHANGELOG.md   -> "Node.js v22.23.2 changelog (fixture)\n"
```

with the following commands:

```
mkdir -p scratch/node-win-no-binary/node-v22.23.2-win-x64
printf 'Node.js v22.23.2 changelog (fixture)\n' > scratch/node-win-no-binary/node-v22.23.2-win-x64/CHANGELOG.md
python3 -c "
import zipfile
with zipfile.ZipFile('scratch/fake-node-win-no-binary.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('scratch/node-win-no-binary/node-v22.23.2-win-x64/CHANGELOG.md', arcname='node-v22.23.2-win-x64/CHANGELOG.md')
"
sha256sum scratch/fake-node-win-no-binary.zip
```

SHA-256: `5350aad3b4373234603e54e8de4a5de4231ff9d2729dd0f8408a125e840027c7`

## fake-node-unix-no-binary.tar.gz

Unix-branch negative fixture: one top-level directory with only `README.md`, no `bin/node`.

Built from a scratch directory containing:

```
node-v22.23.2-linux-x64/README.md    -> "Node.js v22.23.2 readme (fixture)\n"
```

with the following commands:

```
mkdir -p scratch/node-unix-no-binary/node-v22.23.2-linux-x64
printf 'Node.js v22.23.2 readme (fixture)\n' > scratch/node-unix-no-binary/node-v22.23.2-linux-x64/README.md
tar -czf scratch/fake-node-unix-no-binary.tar.gz -C scratch/node-unix-no-binary node-v22.23.2-linux-x64
sha256sum scratch/fake-node-unix-no-binary.tar.gz
```

SHA-256: `8eaf190d87eac28ae2253ce1af15ea560e50a3b504e767521398135a8d15dc76`

## fake-node-win-decoy.zip

Windows-branch fixture proving the exact-path entry match: a wrong-path decoy entry whose name
still ends with `node.exe` comes first, followed by the real entry at its correct relative path.
An extractor doing a loose suffix match would install the decoy and stop; the exact-path match
must skip the decoy and install the real entry.

Built from a scratch directory containing:

```
other/decoy-node.exe                  -> "decoy-not-the-real-binary\n"
node-v22.23.2-win-x64/node.exe        -> "fake-node-binary-windows\n"
```

with the following commands (`scratch/` is a throwaway directory outside this repository):

```
mkdir -p scratch/node-win-decoy/other scratch/node-win-decoy/node-v22.23.2-win-x64
printf 'decoy-not-the-real-binary\n' > scratch/node-win-decoy/other/decoy-node.exe
printf 'fake-node-binary-windows\n' > scratch/node-win-decoy/node-v22.23.2-win-x64/node.exe
python3 -c "
import zipfile
with zipfile.ZipFile('scratch/fake-node-win-decoy.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('scratch/node-win-decoy/other/decoy-node.exe', arcname='other/decoy-node.exe')
    z.write('scratch/node-win-decoy/node-v22.23.2-win-x64/node.exe', arcname='node-v22.23.2-win-x64/node.exe')
"
sha256sum scratch/fake-node-win-decoy.zip
```

SHA-256: `f7f1bd8402a99c7631bbfe3c7ca892a3c8929d02f986068ad430525b9b102663`
