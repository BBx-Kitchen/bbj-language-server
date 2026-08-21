#!/usr/bin/env node
// Asserts that every Gradle wrapper in this repository pins the checksum of
// the distribution it downloads, that the committed wrapper JAR belongs to
// the same release the wrapper properties declare, and that every workflow
// job invoking Gradle validates the wrapper before its first invocation.
// A Gradle release bump needs its published checksums added to
// GRADLE_CHECKSUMS below before the check will accept it.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectRunBodies } from './check-workflow-secrets.mjs';

// Published checksums, keyed by Gradle version string. Sourced from
// https://services.gradle.org/distributions/gradle-<version>-<flavour>.zip.sha256
// and the -wrapper.jar.sha256 sibling. Only the `bin` distribution flavour is
// tabulated; an `-all.zip` URL resolves to no tabulated flavour, which is a
// finding by design.
export const GRADLE_CHECKSUMS = {
  '8.10': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: '5b9c5eb3f9fc2c94abaea57d90bd78747ca117ddbbf96c859d3741181a12bf2a',
  },
  '8.10.1': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: '1541fa36599e12857140465f3c91a97409b4512501c26f9631fb113e392c5bd1',
  },
  '8.10.2': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: '31c55713e40233a8303827ceb42ca48a47267a0ad4bab9177123121e71524c26',
  },
  '8.11': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: '57dafb5c2622c6cc08b993c85b7c06956a2f53536432a30ead46166dbca0f1e9',
  },
  '8.11.1': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: 'f397b287023acdba1e9f6fc5ea72d22dd63669d59ed4a289a29b1a76eee151c6',
  },
  '8.12': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: '7a00d51fb93147819aab76024feece20b6b84e420694101f276be952e08bef03',
  },
  '8.12.1': {
    wrapper: '2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046',
    bin: '8d97a97984f6cbd2b85fe4c60a743440a347544bf18818048e611f5288d46c94',
  },
  '8.13': {
    wrapper: '81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f',
    bin: '20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78',
  },
  '8.14': {
    wrapper: '7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172',
    bin: '61ad310d3c7d3e5da131b76bbf22b5a4c0786e9d892dae8c1658d4b484de3caa',
  },
  '8.14.1': {
    wrapper: '7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172',
    bin: '845952a9d6afa783db70bb3b0effaae45ae5542ca2bb7929619e8af49cb634cf',
  },
  '8.14.5': {
    wrapper: '7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172',
    bin: '6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854',
  },
};

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'build',
  '.gradle',
  '.intellijPlatform',
  'out',
  'dist',
  '.git',
]);

const DISTRIBUTION_URL_LINE = /^distributionUrl=(.*)$/m;
const DISTRIBUTION_SHA_LINE = /^distributionSha256Sum=(.*)$/m;
const DISTRIBUTION_FILENAME = /gradle-([0-9][0-9A-Za-z.\-]*)-([A-Za-z]+)\.zip$/;

const GRADLE_INVOCATION = /(^|[\s"'/])gradlew(\.bat)?(\s|$)|(^|[\s"'])gradle(\s+\S)/;
const GRADLE_SETUP_USES = /^\s*(-\s+)?uses:\s*(gradle\/actions\/setup-gradle|gradle\/gradle-build-action)(@|\s|$)/;
const WRAPPER_VALIDATION_USES = /^\s*(-\s+)?uses:\s*gradle\/actions\/wrapper-validation(@|\s|$)/;
const JOB_ID_LINE = /^(\s+)([A-Za-z0-9_-]+):\s*$/;
const JOBS_KEY_LINE = /^jobs:\s*$/;

function splitLines(content) {
  return content.split(/\r\n|\n/);
}

// Given an observed wrapper-JAR sha256 and the Gradle version parsed from
// distributionUrl, returns a verdict distinguishing three cases: the hash is
// the published wrapper checksum for declaredVersion; the hash is a
// checksum published for one or more OTHER releases (message names them);
// or the hash matches nothing tabulated. Pure and table-driven.
export function describeWrapperJar(sha256, declaredVersion) {
  const declaredEntry = GRADLE_CHECKSUMS[declaredVersion];
  if (declaredEntry && declaredEntry.wrapper === sha256) {
    return { status: 'matches', declaredVersion, message: `matches the published wrapper JAR for ${declaredVersion}` };
  }

  const otherVersions = Object.entries(GRADLE_CHECKSUMS)
    .filter(([version, entry]) => version !== declaredVersion && entry.wrapper === sha256)
    .map(([version]) => version);

  if (otherVersions.length > 0) {
    return {
      status: 'other-release',
      declaredVersion,
      otherVersions,
      message: `belongs to Gradle ${otherVersions.join(', ')}, not the declared ${declaredVersion}`,
    };
  }

  return {
    status: 'unknown',
    declaredVersion,
    message: `sha256 ${sha256} matches no tabulated Gradle wrapper JAR`,
  };
}

function unescapeDistributionUrl(rawValue) {
  return rawValue.replace(/\\:/g, ':');
}

function parseDistributionUrl(rawValue) {
  const url = unescapeDistributionUrl(rawValue.trim());
  const match = url.match(DISTRIBUTION_FILENAME);
  if (!match) {
    return { url, version: null, flavour: null };
  }
  return { url, version: match[1], flavour: match[2] };
}

function findWrapperProperties(repoRoot) {
  const found = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (
        entry.isFile() &&
        entry.name === 'gradle-wrapper.properties' &&
        path.basename(dir) === 'wrapper' &&
        path.basename(path.dirname(dir)) === 'gradle'
      ) {
        found.push(path.join(dir, entry.name));
      }
    }
  }

  walk(repoRoot);
  return found.sort();
}

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Inspects one gradle-wrapper.properties file (and its sibling JAR) and
// returns { propertiesPath, wrapperJarPath, version, flavour, sum, jarSha256, findings }.
function inspectWrapper(propertiesPath) {
  const findings = [];
  const content = fs.readFileSync(propertiesPath, 'utf8');

  const urlMatch = content.match(DISTRIBUTION_URL_LINE);
  if (!urlMatch) {
    findings.push({ file: propertiesPath, line: 1, message: 'distributionUrl is absent or unparseable' });
    return { propertiesPath, version: null, findings };
  }

  const { version, flavour } = parseDistributionUrl(urlMatch[1]);
  if (!version || !flavour) {
    findings.push({ file: propertiesPath, line: 1, message: 'distributionUrl is absent or unparseable' });
    return { propertiesPath, version: null, findings };
  }

  const tabulated = GRADLE_CHECKSUMS[version];
  if (!tabulated) {
    findings.push({
      file: propertiesPath,
      line: 1,
      message: `declared release ${version} has no published checksums in GRADLE_CHECKSUMS; add them before this wrapper can be validated`,
    });
  } else if (flavour !== 'bin') {
    findings.push({
      file: propertiesPath,
      line: 1,
      message: `declared distribution flavour '${flavour}' is not tabulated (only 'bin' is); add it to GRADLE_CHECKSUMS or use the bin distribution`,
    });
  }

  const shaMatch = content.match(DISTRIBUTION_SHA_LINE);
  if (!shaMatch) {
    findings.push({ file: propertiesPath, line: 1, message: 'distributionSha256Sum is absent' });
  } else if (tabulated && flavour === 'bin' && shaMatch[1].trim() !== tabulated.bin) {
    const declaredSum = shaMatch[1].trim();
    const otherRelease = Object.entries(GRADLE_CHECKSUMS).find(([, entry]) => entry.bin === declaredSum);
    const otherNote = otherRelease ? `, which is the published sum for ${otherRelease[0]}` : '';
    findings.push({
      file: propertiesPath,
      line: 1,
      message: `distributionSha256Sum does not match the published sum for the declared release ${version}${otherNote}`,
    });
  }

  const wrapperJarPath = path.join(path.dirname(propertiesPath), 'gradle-wrapper.jar');
  if (!fs.existsSync(wrapperJarPath)) {
    findings.push({ file: propertiesPath, line: 1, message: 'sibling gradle-wrapper.jar is missing' });
    return { propertiesPath, version, findings };
  }

  const jarSha256 = sha256File(wrapperJarPath);
  if (version) {
    const verdict = describeWrapperJar(jarSha256, version);
    if (verdict.status !== 'matches') {
      findings.push({
        file: wrapperJarPath,
        line: 1,
        message: `committed wrapper JAR ${verdict.message}`,
      });
    }
  }

  return { propertiesPath, wrapperJarPath, version, findings };
}

function expandWorkflowFiles(workflowsDir) {
  let entries;
  try {
    entries = fs.readdirSync(workflowsDir);
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
    .sort()
    .map((entry) => path.join(workflowsDir, entry));
}

// Attributes lines to jobs: after the `jobs:` mapping key, every subsequent
// line matching a job-id mapping key at the first job-id indentation level
// starts a job that runs until the next such line or end of file. Blind to
// strategy:/matrix: blocks and to the file's trigger type.
function attributeJobs(lines) {
  const jobsKeyIndex = lines.findIndex((line) => JOBS_KEY_LINE.test(line));
  if (jobsKeyIndex === -1) {
    return [];
  }

  // Determine the job-id indentation from the first mapping key after `jobs:`.
  let jobIndent = null;
  for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const match = line.match(JOB_ID_LINE);
    if (match) {
      jobIndent = match[1].length;
      break;
    }
    // A non-blank, non-matching line before any job id means we cannot
    // attribute jobs from here (unexpected shape).
    break;
  }
  if (jobIndent === null) {
    return [];
  }

  const jobs = [];
  let current = null;

  for (let i = jobsKeyIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(JOB_ID_LINE);
    if (match && match[1].length === jobIndent) {
      if (current) {
        current.endLine = i; // exclusive, 0-based
      }
      current = { id: match[2], startLine: i + 1, endLine: lines.length, lines: [] };
      jobs.push(current);
      continue;
    }
    if (current) {
      current.lines.push({ line: i + 1, text: line });
    }
  }

  return jobs;
}

// Inspects one workflow file for Gradle-invoking jobs and validation steps.
// Returns { findings, gradleJobsFound } for this file.
function inspectWorkflow(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = splitLines(content);
  const jobs = attributeJobs(lines);
  const findings = [];
  let gradleJobsFound = 0;

  if (jobs.length === 0) {
    // No jobs could be attributed. If the file contains a Gradle invocation
    // anywhere, that is the zero-attribution failure mode the empty-scan
    // guard exists to catch; report it via the caller's aggregate exit code.
    const hasInvocation = lines.some((line) => GRADLE_INVOCATION.test(line) || GRADLE_SETUP_USES.test(line));
    return { findings, gradleJobsFound: 0, unattributedInvocation: hasInvocation };
  }

  const runBodiesByLine = new Map();
  for (const body of collectRunBodies(filePath)) {
    for (const bodyLine of body.lines) {
      runBodiesByLine.set(bodyLine.line, bodyLine.text);
    }
  }

  for (const job of jobs) {
    let firstInvocationLine = null;
    let firstValidationLine = null;

    for (const entry of job.lines) {
      const runText = runBodiesByLine.get(entry.line);
      const isRunInvocation = runText !== undefined && GRADLE_INVOCATION.test(runText);
      const isUsesInvocation = GRADLE_SETUP_USES.test(entry.text);
      if (firstInvocationLine === null && (isRunInvocation || isUsesInvocation)) {
        firstInvocationLine = entry.line;
      }
      if (firstValidationLine === null && WRAPPER_VALIDATION_USES.test(entry.text)) {
        firstValidationLine = entry.line;
      }
    }

    if (firstInvocationLine === null) {
      continue;
    }

    gradleJobsFound += 1;

    if (firstValidationLine === null) {
      findings.push({
        file: filePath,
        line: firstInvocationLine,
        message: `job '${job.id}' invokes Gradle with no gradle/actions/wrapper-validation step earlier in the job`,
      });
    } else if (firstValidationLine > firstInvocationLine) {
      findings.push({
        file: filePath,
        line: firstValidationLine,
        message: `job '${job.id}' has a wrapper-validation step (line ${firstValidationLine}) after its first Gradle invocation (line ${firstInvocationLine}); it must come earlier in the same job`,
      });
    }
  }

  return { findings, gradleJobsFound, unattributedInvocation: false };
}

function defaultRepoRoot() {
  return fileURLToPath(new URL('../../', import.meta.url));
}

// Scans repoRoot for Gradle wrappers and workflow files. Returns
// { wrappersScanned, workflowFilesScanned, gradleJobsFound, findings },
// findings sorted by file then ascending line.
export function scanRepo({ repoRoot }) {
  const findings = [];

  const wrapperPropertiesFiles = findWrapperProperties(repoRoot);
  for (const propertiesPath of wrapperPropertiesFiles) {
    const result = inspectWrapper(propertiesPath);
    findings.push(...result.findings);
  }

  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  const workflowFiles = expandWorkflowFiles(workflowsDir);
  let gradleJobsFound = 0;
  let unattributedInvocationSeen = false;

  for (const workflowFile of workflowFiles) {
    const result = inspectWorkflow(workflowFile);
    findings.push(...result.findings);
    gradleJobsFound += result.gradleJobsFound;
    if (result.unattributedInvocation) {
      unattributedInvocationSeen = true;
    }
  }

  findings.sort((a, b) => {
    if (a.file === b.file) {
      return a.line - b.line;
    }
    return a.file < b.file ? -1 : 1;
  });

  return {
    wrappersScanned: wrapperPropertiesFiles.length,
    workflowFilesScanned: workflowFiles.length,
    gradleJobsFound,
    findings,
    unattributedInvocationSeen,
  };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let repoRoot = defaultRepoRoot();
  let printMode = false;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--repo-root') {
      repoRoot = path.resolve(args[i + 1]);
      i += 1;
    } else if (args[i] === '--print') {
      printMode = true;
    }
  }

  return { repoRoot, printMode };
}

function printReport(repoRoot) {
  const { wrappersScanned, workflowFilesScanned, gradleJobsFound, findings, unattributedInvocationSeen } =
    scanRepo({ repoRoot });

  if (wrappersScanned === 0 || workflowFilesScanned === 0 || unattributedInvocationSeen) {
    console.log(
      'Refusing to report success on an empty or unattributable scan: ' +
        `${wrappersScanned} wrapper(s), ${workflowFilesScanned} workflow file(s).`,
    );
    process.exit(2);
  }

  const wrapperPropertiesFiles = findWrapperProperties(repoRoot);
  for (const propertiesPath of wrapperPropertiesFiles) {
    const content = fs.readFileSync(propertiesPath, 'utf8');
    const urlMatch = content.match(DISTRIBUTION_URL_LINE);
    const shaMatch = content.match(DISTRIBUTION_SHA_LINE);
    const { version } = urlMatch ? parseDistributionUrl(urlMatch[1]) : { version: null };
    const wrapperJarPath = path.join(path.dirname(propertiesPath), 'gradle-wrapper.jar');
    let jarVerdict = 'sibling JAR missing';
    if (fs.existsSync(wrapperJarPath) && version) {
      jarVerdict = describeWrapperJar(sha256File(wrapperJarPath), version).message;
    }
    console.log(
      `${propertiesPath}: declared release ${version ?? 'unknown'}, ` +
        `declared sum ${shaMatch ? shaMatch[1].trim() : '(absent)'}, JAR ${jarVerdict}`,
    );
  }

  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  for (const workflowFile of expandWorkflowFiles(workflowsDir)) {
    const content = fs.readFileSync(workflowFile, 'utf8');
    const lines = splitLines(content);
    const jobs = attributeJobs(lines);
    const runBodiesByLine = new Map();
    for (const body of collectRunBodies(workflowFile)) {
      for (const bodyLine of body.lines) {
        runBodiesByLine.set(bodyLine.line, bodyLine.text);
      }
    }
    for (const job of jobs) {
      let firstInvocationLine = null;
      let firstValidationLine = null;
      for (const entry of job.lines) {
        const runText = runBodiesByLine.get(entry.line);
        const isRunInvocation = runText !== undefined && GRADLE_INVOCATION.test(runText);
        const isUsesInvocation = GRADLE_SETUP_USES.test(entry.text);
        if (firstInvocationLine === null && (isRunInvocation || isUsesInvocation)) {
          firstInvocationLine = entry.line;
        }
        if (firstValidationLine === null && WRAPPER_VALIDATION_USES.test(entry.text)) {
          firstValidationLine = entry.line;
        }
      }
      if (firstInvocationLine !== null) {
        console.log(
          `${workflowFile}: job '${job.id}' invocation at line ${firstInvocationLine}, ` +
            `wrapper-validation at line ${firstValidationLine ?? '(none)'}`,
        );
      }
    }
  }

  console.log(
    `${wrappersScanned} wrapper(s), ${workflowFilesScanned} workflow file(s), ${gradleJobsFound} Gradle job(s).`,
  );
  process.exit(0);
}

function main() {
  const { repoRoot, printMode } = parseArgs(process.argv);

  if (printMode) {
    printReport(repoRoot);
    return;
  }

  const { wrappersScanned, workflowFilesScanned, gradleJobsFound, findings, unattributedInvocationSeen } =
    scanRepo({ repoRoot });

  if (wrappersScanned === 0 || workflowFilesScanned === 0 || unattributedInvocationSeen) {
    console.log(
      'Refusing to report success on an empty or unattributable scan: ' +
        `${wrappersScanned} wrapper(s), ${workflowFilesScanned} workflow file(s).`,
    );
    process.exit(2);
  }

  if (findings.length === 0) {
    console.log(
      `${wrappersScanned} wrapper(s), ${workflowFilesScanned} workflow file(s), ${gradleJobsFound} Gradle job(s), 0 findings.`,
    );
    process.exit(0);
  }

  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line}: ${finding.message}`);
  }
  console.log(`${findings.length} finding(s).`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
