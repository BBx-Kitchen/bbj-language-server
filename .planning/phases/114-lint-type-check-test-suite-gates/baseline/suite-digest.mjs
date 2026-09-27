#!/usr/bin/env node
// Dependency-free digest of a vitest JSON report.
// Usage: node suite-digest.mjs <path-to-vitest-json-report>
//
// Prints, one per line and in this order:
//   interop5008=open|closed
//   numTotalTests=
//   numPassedTests=
//   numFailedTests=
//   numPendingTests=
//   failedSuites=
//   hookTimeoutSuites=
//   unexplainedFailedSuites=
//   durationSec=
// followed by sorted FAILED_TEST and FAILED_SUITE lines.
//
// Exits 0 when the report parses. Exits non-zero with a message when the
// file is missing or is not valid JSON.

import { readFileSync } from 'node:fs'
import { createConnection } from 'node:net'

function probeInterop5008() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port: 5008 })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve('closed')
    }, 1000)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve('open')
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve('closed')
    })
  })
}

function relativeToBbjVscode(absPath) {
  const marker = 'bbj-vscode/'
  const idx = absPath.indexOf(marker)
  if (idx === -1) return absPath
  return absPath.slice(idx + marker.length)
}

function codeUnitSort(a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

async function main() {
  const reportPath = process.argv[2]
  if (!reportPath) {
    console.error('usage: node suite-digest.mjs <path-to-vitest-json-report>')
    process.exit(1)
  }

  let raw
  try {
    raw = readFileSync(reportPath, 'utf-8')
  } catch (err) {
    console.error(`suite-digest: could not read ${reportPath}: ${err.message}`)
    process.exit(1)
  }

  let report
  try {
    report = JSON.parse(raw)
  } catch (err) {
    console.error(`suite-digest: ${reportPath} is not valid JSON: ${err.message}`)
    process.exit(1)
  }

  const interop5008 = await probeInterop5008()

  const numTotalTests = report.numTotalTests ?? 0
  const numPassedTests = report.numPassedTests ?? 0
  const numFailedTests = report.numFailedTests ?? 0
  const numPendingTests = report.numPendingTests ?? 0
  const testResults = Array.isArray(report.testResults) ? report.testResults : []

  const failedSuiteResults = testResults.filter((tr) => tr.status === 'failed')

  const failedTestLines = []
  for (const tr of testResults) {
    const file = relativeToBbjVscode(tr.name ?? '')
    const assertions = Array.isArray(tr.assertionResults) ? tr.assertionResults : []
    for (const ar of assertions) {
      if (ar.status === 'failed') {
        failedTestLines.push(`FAILED_TEST ${file} :: ${ar.fullName ?? ''}`)
      }
    }
  }

  let hookTimeoutSuites = 0
  let unexplainedFailedSuites = 0
  const failedSuiteLines = []
  for (const tr of failedSuiteResults) {
    const file = relativeToBbjVscode(tr.name ?? '')
    const assertions = Array.isArray(tr.assertionResults) ? tr.assertionResults : []
    const failedAssertionCount = assertions.filter((ar) => ar.status === 'failed').length
    const message = tr.message ?? ''
    const isHookTimeout = typeof message === 'string' && message.includes('Hook timed out')
    if (isHookTimeout) {
      hookTimeoutSuites += 1
      failedSuiteLines.push(`FAILED_SUITE ${file} hook-timeout`)
    } else {
      if (failedAssertionCount === 0) {
        unexplainedFailedSuites += 1
      }
      failedSuiteLines.push(`FAILED_SUITE ${file} other`)
    }
  }

  let earliestStart = Infinity
  let latestEnd = -Infinity
  for (const tr of testResults) {
    if (typeof tr.startTime === 'number' && tr.startTime < earliestStart) {
      earliestStart = tr.startTime
    }
    if (typeof tr.endTime === 'number' && tr.endTime > latestEnd) {
      latestEnd = tr.endTime
    }
  }
  const durationSec =
    earliestStart !== Infinity && latestEnd !== -Infinity
      ? Math.round((latestEnd - earliestStart) / 1000)
      : 0

  console.log(`interop5008=${interop5008}`)
  console.log(`numTotalTests=${numTotalTests}`)
  console.log(`numPassedTests=${numPassedTests}`)
  console.log(`numFailedTests=${numFailedTests}`)
  console.log(`numPendingTests=${numPendingTests}`)
  console.log(`failedSuites=${failedSuiteResults.length}`)
  console.log(`hookTimeoutSuites=${hookTimeoutSuites}`)
  console.log(`unexplainedFailedSuites=${unexplainedFailedSuites}`)
  console.log(`durationSec=${durationSec}`)

  for (const line of failedTestLines.sort(codeUnitSort)) {
    console.log(line)
  }
  for (const line of failedSuiteLines.sort(codeUnitSort)) {
    console.log(line)
  }

  process.exit(0)
}

main()
