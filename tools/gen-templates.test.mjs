// Run: node --test tools/gen-templates.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { toVelocity, segment } from './gen-templates.mjs'

/**
 * Minimal stand-in for Velocity's handling of the constructs we emit:
 * raw blocks are passed through literally, ${Var} is substituted.
 * Anything else containing `$` would be a reference Velocity swallows.
 */
function renderVelocity(ft, vars) {
    const out = []
    let i = 0
    while (i < ft.length) {
        const raw = ft.indexOf('#[[', i)
        if (raw === -1) {
            out.push({ interpolated: ft.slice(i) })
            break
        }
        if (raw > i) out.push({ interpolated: ft.slice(i, raw) })
        const end = ft.indexOf(']]#', raw)
        assert.notEqual(end, -1, 'unterminated raw block')
        out.push({ raw: ft.slice(raw + 3, end) })
        i = end + 3
    }
    return out
        .map((part) => {
            if (part.raw !== undefined) return part.raw
            // Outside a raw block a bare `$` would be a Velocity reference.
            const bare = part.interpolated.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/g, '')
            assert.ok(!bare.includes('$'), `unescaped "$" outside raw block: ${JSON.stringify(part.interpolated)}`)
            return part.interpolated.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, n) => {
                assert.ok(n in vars, `undeclared variable ${n}`)
                return vars[n]
            })
        })
        .join('')
}

const VARS = ['ProgramName', 'WindowTitle']
const VALUES = { ProgramName: 'HelloDWC', WindowTitle: 'Hello DWC' }

test('BBj string variables survive the Velocity round-trip', () => {
    const body = 'title$ = "${WindowTitle}"\nmsg$ = "Hi " + title$\n'
    const rendered = renderVelocity(toVelocity(body, VARS), VALUES)
    assert.equal(rendered, 'title$ = "Hello DWC"\nmsg$ = "Hi " + title$\n')
})

test('a BBj variable named like a declared placeholder is not substituted', () => {
    // `$WindowTitle` is a Velocity reference but NOT our `${WindowTitle}` syntax.
    const body = 'WindowTitle$ = "literal"\n'
    const rendered = renderVelocity(toVelocity(body, VARS), VALUES)
    assert.equal(rendered, 'WindowTitle$ = "literal"\n')
})

test('Velocity directives in BBj source are escaped', () => {
    const body = 'REM #set is not a directive here\nx$ = 1\n'
    const rendered = renderVelocity(toVelocity(body, VARS), VALUES)
    assert.equal(rendered, body)
})

test('placeholders are emitted as substitutable references', () => {
    assert.match(toVelocity('REM ${ProgramName}\n', VARS), /\$\{ProgramName\}/)
    assert.equal(renderVelocity(toVelocity('REM ${ProgramName}\n', VARS), VALUES), 'REM HelloDWC\n')
})

test('literal runs without $ or # are left unwrapped', () => {
    assert.equal(toVelocity('process_events\n', VARS), 'process_events\n')
})

test('a raw-block terminator in the source is rejected rather than mis-escaped', () => {
    assert.throws(() => toVelocity('x$ = "]]#"\n', VARS), /raw-block terminator/)
})

test('segment() treats undeclared ${...} as literal', () => {
    assert.deepEqual(segment('a ${Nope} b', VARS), [{ literal: 'a ${Nope} b' }])
})

test('the shipped DWC starter round-trips', async () => {
    const { readFileSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const body = readFileSync(join(root, 'templates', 'dwc-browser-program', 'program.bbj.tmpl'), 'utf8')

    const rendered = renderVelocity(toVelocity(body, VARS), VALUES)
    assert.equal(rendered, body.replaceAll('${ProgramName}', 'HelloDWC').replaceAll('${WindowTitle}', 'Hello DWC'))
    assert.ok(rendered.includes('title$ = "Hello DWC"'))
    assert.ok(rendered.includes('msg$ = "Hello from " + title$ + "!"'))
})
