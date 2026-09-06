import { afterAll, describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeWrapperJar, GRADLE_CHECKSUMS } from '../tools/check-gradle-wrapper.mjs';

/**
 * Regression coverage for `check-gradle-wrapper.mjs`: pins its CLI contract
 * (exit codes 0, 1, and 2, and stdout shape) against the real repository
 * tree and purpose-built fixture trees covering each derived edge
 * predicate, so the check cannot silently go vacuous.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
const CHECKER_PATH = process.env.GRADLE_WRAPPER_CHECKER_PATH
    ?? path.join(REPO_ROOT, 'bbj-vscode', 'tools', 'check-gradle-wrapper.mjs');

const REAL_WRAPPER_DIR = path.join(REPO_ROOT, 'bbj-intellij', 'gradle', 'wrapper');
const REAL_WRAPPER_JAR_PATH = path.join(REAL_WRAPPER_DIR, 'gradle-wrapper.jar');
const GOOD_WRAPPER_JAR_BYTES = fs.readFileSync(REAL_WRAPPER_JAR_PATH);

// The "good" fixture borrows the repository's committed wrapper JAR, so its
// declared release and checksum must be the committed ones too; otherwise every
// wrapper upgrade in bbj-intellij would red the fixture with a JAR/release mismatch.
const REAL_PROPERTIES_LINES = fs
    .readFileSync(path.join(REAL_WRAPPER_DIR, 'gradle-wrapper.properties'), 'utf8')
    .split(/\r?\n/);
function realPropertyLine(key: string): string {
    const line = REAL_PROPERTIES_LINES.find((candidate) => candidate.startsWith(`${key}=`));
    if (!line) {
        throw new Error(`bbj-intellij/gradle/wrapper/gradle-wrapper.properties has no ${key}= line`);
    }
    return line;
}
const REAL_DISTRIBUTION_URL_LINE = realPropertyLine('distributionUrl');
const REAL_GRADLE_VERSION = /gradle-([0-9.]+)-bin\.zip$/.exec(REAL_DISTRIBUTION_URL_LINE)?.[1];
if (!REAL_GRADLE_VERSION) {
    throw new Error(`unexpected distributionUrl shape: ${REAL_DISTRIBUTION_URL_LINE}`);
}

const GOOD_PROPERTIES_LINES = [
    'distributionBase=GRADLE_USER_HOME',
    'distributionPath=wrapper/dists',
    REAL_DISTRIBUTION_URL_LINE,
    realPropertyLine('distributionSha256Sum'),
    'networkTimeout=10000',
    'validateDistributionUrl=true',
    'zipStoreBase=GRADLE_USER_HOME',
    'zipStorePath=wrapper/dists',
];

const PRE_FIX_PROPERTIES_LINES = GOOD_PROPERTIES_LINES.filter(
    (line) => !line.startsWith('distributionSha256Sum='),
);

const NOOP_WORKFLOW_LINES = [
    'name: Fixture',
    'on: push',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Echo',
    '        run: echo hello',
];

const fixtureDirs: string[] = [];

function newFixtureDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    fixtureDirs.push(dir);
    return dir;
}

afterAll(() => {
    for (const dir of fixtureDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

interface CheckerResult {
    status: number;
    stdout: string;
}

function runChecker(args: string[]): CheckerResult {
    try {
        const stdout = execFileSync('node', [CHECKER_PATH, ...args], { encoding: 'utf8' });
        return { status: 0, stdout };
    } catch (err) {
        const spawnError = err as { status: number | null; stdout?: string };
        return { status: spawnError.status ?? -1, stdout: spawnError.stdout ?? '' };
    }
}

interface FixtureSpec {
    prefix: string;
    project?: string;
    propertiesLines?: string[];
    jarBytes?: Buffer;
    workflows?: Record<string, string[]>;
}

interface FixtureRepo {
    root: string;
    propertiesPath: string;
    wrapperJarPath?: string;
    workflowPaths: Record<string, string>;
}

// Builds one fixture repository root under os.tmpdir(): a gradle wrapper
// properties file (and optional sibling JAR) at
// <root>/<project>/gradle/wrapper/, and each named workflow file's lines
// under <root>/.github/workflows/. Every fixture in this suite goes through
// this one helper so the tests read as data, not repeated file plumbing.
function buildFixtureRepo(spec: FixtureSpec): FixtureRepo {
    const { prefix, project = 'project', propertiesLines, jarBytes, workflows = {} } = spec;
    const root = newFixtureDir(prefix);

    const wrapperDir = path.join(root, project, 'gradle', 'wrapper');
    fs.mkdirSync(wrapperDir, { recursive: true });
    const propertiesPath = path.join(wrapperDir, 'gradle-wrapper.properties');
    if (propertiesLines !== undefined) {
        fs.writeFileSync(propertiesPath, propertiesLines.join('\n') + '\n');
    }

    let wrapperJarPath: string | undefined;
    if (jarBytes !== undefined) {
        wrapperJarPath = path.join(wrapperDir, 'gradle-wrapper.jar');
        fs.writeFileSync(wrapperJarPath, jarBytes);
    }

    const workflowsDir = path.join(root, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    const workflowPaths: Record<string, string> = {};
    for (const [name, lines] of Object.entries(workflows)) {
        const filePath = path.join(workflowsDir, name);
        fs.writeFileSync(filePath, lines.join('\n') + '\n');
        workflowPaths[name] = filePath;
    }

    return { root, propertiesPath, wrapperJarPath, workflowPaths };
}

// Returns the 1-based line number of the first line containing `substring`.
function lineNumberOf(lines: string[], substring: string): number {
    const idx = lines.findIndex((line) => line.includes(substring));
    if (idx === -1) {
        throw new Error(`No line contains "${substring}"`);
    }
    return idx + 1;
}

// Shared assertion for the four invocation-shape fixtures below: a good
// wrapper plus one job whose given steps invoke Gradle with no earlier
// validation step must red with the standard missing-validation message.
function expectInvocationShapeReds(prefix: string, stepLines: string[]): void {
    const workflowLines = [
        'name: Fixture',
        'on: push',
        'jobs:',
        '  build:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        ...stepLines,
    ];
    const fixture = buildFixtureRepo({
        prefix,
        propertiesLines: GOOD_PROPERTIES_LINES,
        jarBytes: GOOD_WRAPPER_JAR_BYTES,
        workflows: { 'fixture.yml': workflowLines },
    });

    const result = runChecker(['--repo-root', fixture.root]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('no gradle/actions/wrapper-validation step');
}

describe('gradle-wrapper-hygiene checker contract', () => {
    test('the real repository tree scans clean', () => {
        const result = runChecker(['--repo-root', REPO_ROOT]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings\./);
    });

    test('a pre-fix fixture (no distributionSha256Sum, unvalidated ./gradlew) reds with two findings at named files and lines', () => {
        const workflowLines = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  build:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - uses: actions/checkout@v4',
            '      - name: Build',
            '        run: ./gradlew build',
        ];
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-prefix-',
            propertiesLines: PRE_FIX_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': workflowLines },
        });
        const expectedInvocationLine = lineNumberOf(workflowLines, './gradlew build');

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('2 finding(s).');

        const propertiesFinding = result.stdout
            .split('\n')
            .find((line) => line.startsWith(`${fixture.propertiesPath}:`));
        expect(propertiesFinding).toBeDefined();
        expect(propertiesFinding).toContain(`${fixture.propertiesPath}:1:`);
        expect(propertiesFinding).toContain('distributionSha256Sum is absent');

        const workflowFinding = result.stdout
            .split('\n')
            .find((line) => line.startsWith(`${fixture.workflowPaths['fixture.yml']}:`));
        expect(workflowFinding).toBeDefined();
        expect(workflowFinding).toContain(`${fixture.workflowPaths['fixture.yml']}:${expectedInvocationLine}:`);
        expect(workflowFinding).toContain('no gradle/actions/wrapper-validation step');
    });

    test('describeWrapperJar reports the committed hash belongs to the 8.10-8.12.1 line, not the declared 8.13', () => {
        const verdict = describeWrapperJar(
            '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
            '8.13',
        );
        expect(verdict.status).toBe('other-release');
        expect(verdict.otherVersions).toEqual(['8.10', '8.10.1', '8.10.2', '8.11', '8.11.1', '8.12', '8.12.1']);
        expect(verdict.message).toContain('8.10');
        expect(verdict.message).toContain('8.12.1');
    });

    test('describeWrapperJar reports the same hash matches when the declared release is 8.12.1', () => {
        const verdict = describeWrapperJar(
            '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
            '8.12.1',
        );
        expect(verdict.status).toBe('matches');
    });

    test('describeWrapperJar reports the published 8.13 wrapper hash matches the declared 8.13', () => {
        const verdict = describeWrapperJar(
            '81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f',
            '8.13',
        );
        expect(verdict.status).toBe('matches');
    });

    test('a distributionUrl naming the committed release with a distributionSha256Sum published for 8.12.1 reds naming both releases', () => {
        const mismatchedProperties = GOOD_PROPERTIES_LINES.map((line) =>
            line.startsWith('distributionSha256Sum=')
                ? 'distributionSha256Sum=8d97a97984f6cbd2b85fe4c60a743440a347544bf18818048e611f5288d46c94'
                : line,
        );
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-mismatch-',
            propertiesLines: mismatchedProperties,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': NOOP_WORKFLOW_LINES },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain(REAL_GRADLE_VERSION);
        expect(result.stdout).toContain('8.12.1');
    });

    test('a distributionUrl naming a release absent from GRADLE_CHECKSUMS reds closed', () => {
        expect(GRADLE_CHECKSUMS['9.99']).toBeUndefined();
        const untabulatedProperties = GOOD_PROPERTIES_LINES.map((line) =>
            line.startsWith('distributionUrl=')
                ? 'distributionUrl=https\\://services.gradle.org/distributions/gradle-9.99-bin.zip'
                : line,
        );
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-unknown-release-',
            propertiesLines: untabulatedProperties,
            workflows: { 'fixture.yml': NOOP_WORKFLOW_LINES },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('has no published checksums');
    });

    test('a distributionUrl ending -all.zip reds as an untabulated flavour', () => {
        const allFlavourProperties = GOOD_PROPERTIES_LINES.map((line) =>
            line.startsWith('distributionUrl=')
                ? `distributionUrl=https\\://services.gradle.org/distributions/gradle-${REAL_GRADLE_VERSION}-all.zip`
                : line,
        );
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-all-flavour-',
            propertiesLines: allFlavourProperties,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': NOOP_WORKFLOW_LINES },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain("flavour 'all' is not tabulated");
    });

    test('a path-prefixed gradlew invocation reds when its job has no validation step', () => {
        expectInvocationShapeReds('gradle-wrapper-hygiene-shape-prefixed-', [
            '      - name: Build',
            '        run: bbj-intellij/gradlew build',
        ]);
    });

    test('a gradlew.bat invocation reds when its job has no validation step', () => {
        expectInvocationShapeReds('gradle-wrapper-hygiene-shape-bat-', [
            '      - name: Build',
            '        run: gradlew.bat build',
        ]);
    });

    test('a bare gradle command word reds when its job has no validation step', () => {
        expectInvocationShapeReds('gradle-wrapper-hygiene-shape-bare-', [
            '      - name: Build',
            '        run: gradle build',
        ]);
    });

    test('a gradle/actions/setup-gradle uses step reds when its job has no validation step', () => {
        expectInvocationShapeReds('gradle-wrapper-hygiene-shape-setup-', [
            '      - name: Setup Gradle',
            '        uses: gradle/actions/setup-gradle@v6',
        ]);
    });

    test('a job carrying a strategy:/matrix: block is required exactly like a plain job', () => {
        const workflowLines = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  build:',
            '    strategy:',
            '      matrix:',
            '        os: [ubuntu-latest]',
            '    runs-on: ${{ matrix.os }}',
            '    steps:',
            '      - name: Build',
            '        run: ./gradlew build',
        ];
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-matrix-',
            propertiesLines: GOOD_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': workflowLines },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain("job 'build'");
    });

    test('a workflow triggered only by workflow_call is scanned and required exactly like a directly-triggered one', () => {
        const workflowLines = [
            'name: Fixture',
            'on:',
            '  workflow_call:',
            'jobs:',
            '  build:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Build',
            '        run: ./gradlew build',
        ];
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-workflow-call-',
            propertiesLines: GOOD_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': workflowLines },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('no gradle/actions/wrapper-validation step');
    });

    test('a validation step after the invocation in the same job still reds', () => {
        const workflowLines = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  build:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Build',
            '        run: ./gradlew build',
            '      - name: Validate Gradle wrapper',
            '        uses: gradle/actions/wrapper-validation@v6',
        ];
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-late-validation-',
            propertiesLines: GOOD_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': workflowLines },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('must come earlier in the same job');
    });

    test('a validation step in a different job of the same file does not satisfy the invoking job', () => {
        const workflowLines = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  validate:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Validate Gradle wrapper',
            '        uses: gradle/actions/wrapper-validation@v6',
            '  build:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Build',
            '        run: ./gradlew build',
        ];
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-other-job-',
            propertiesLines: GOOD_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': workflowLines },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(1);
        expect(result.stdout).toContain("job 'build' invokes Gradle with no gradle/actions/wrapper-validation step");
    });

    test('a validation step earlier in the same job with two intervening steps still satisfies the requirement', () => {
        const workflowLines = [
            'name: Fixture',
            'on: push',
            'jobs:',
            '  build:',
            '    runs-on: ubuntu-latest',
            '    steps:',
            '      - name: Validate Gradle wrapper',
            '        uses: gradle/actions/wrapper-validation@v6',
            '      - name: Intervening step one',
            '        run: echo one',
            '      - name: Intervening step two',
            '        run: echo two',
            '      - name: Build',
            '        run: ./gradlew build',
        ];
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-adjacency-',
            propertiesLines: GOOD_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
            workflows: { 'fixture.yml': workflowLines },
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/0 findings\./);
    });

    test('an empty --repo-root exits 2, never 0', () => {
        const emptyDir = newFixtureDir('gradle-wrapper-hygiene-empty-');
        const result = runChecker(['--repo-root', emptyDir]);
        expect(result.status).toBe(2);
        expect(result.status).not.toBe(0);
    });

    test('a fixture tree with a valid wrapper but zero workflow files exits 2', () => {
        const fixture = buildFixtureRepo({
            prefix: 'gradle-wrapper-hygiene-no-workflows-',
            propertiesLines: GOOD_PROPERTIES_LINES,
            jarBytes: GOOD_WRAPPER_JAR_BYTES,
        });

        const result = runChecker(['--repo-root', fixture.root]);
        expect(result.status).toBe(2);
    });
});
