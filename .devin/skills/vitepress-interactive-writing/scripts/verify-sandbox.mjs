import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { Worker } from 'node:worker_threads'

const MAX_WAIT_MS = 10000
const sandboxRoot = new URL('../../../../config/.vitepress/theme/components/sandbox/', import.meta.url)

function resolveTypes(specifier, context, next) {
  const relative = specifier.startsWith('./') || specifier.startsWith('../')
  return next(relative && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context)
}

registerHooks({ resolve: resolveTypes })
const { PUZZLES, definePuzzle, isPuzzleId } = await import(new URL('algorithm-puzzles.ts', sandboxRoot))
const { JUDGES, jsonEqual } = await import(new URL('algorithm-judges.ts', sandboxRoot))
const { OutputBudget, OUTPUT_LIMIT_MESSAGE } = await import(new URL('sandbox-output.ts', sandboxRoot))
const { MAX_OUTPUT_BYTES, MAX_ERROR_BYTES, MAX_LOG_ENTRIES, MAX_VALUE_DEPTH } = await import(new URL('sandbox-types.ts', sandboxRoot))

for (const value of [0, -1, false, null, '', '字', [0, false, null], { nested: [1, { ok: true }] }]) {
  const snapshot = new OutputBudget().capture(value)
  assert.ok(jsonEqual(snapshot.json, value), `JSON snapshot changed ${JSON.stringify(value)}`)
  assert.notEqual(snapshot.text, '')
}
assert.ok(jsonEqual({ a: 1, b: [true] }, { b: [true], a: 1 }))
for (const [left, right] of [[1, '1'], [false, 0], [null, false], [[1, 2], [2, 1]], [{ a: 1 }, { a: 1, b: 2 }], [[], {}]]) {
  assert.equal(jsonEqual(left, right), false)
}
for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol('local'), () => 1, new Date(0), new Map(), new Set(), new Uint8Array(1)]) {
  assert.equal(new OutputBudget().capture(value).json, undefined, 'Non-JSON value accepted')
}
const cyclic = []
cyclic.push(cyclic)
assert.equal(new OutputBudget().capture(cyclic).json, undefined)
const sparse = Array(1)
assert.equal(new OutputBudget().capture(sparse).json, undefined)
let getterCalls = 0
assert.equal(new OutputBudget().capture({ get value() { getterCalls++; return 1 } }).json, undefined)
assert.equal(new OutputBudget().capture({ toJSON() { getterCalls++; return null } }).json, undefined)
assert.equal(getterCalls, 0, 'Output handling invoked getter or toJSON')
const specialKeys = JSON.parse('{"__proto__":{"polluted":true},"constructor":false}')
const specialSnapshot = new OutputBudget().capture(specialKeys)
assert.ok(jsonEqual(specialSnapshot.json, specialKeys))
assert.equal(Object.getPrototypeOf(specialSnapshot.json), null)
assert.equal({}.polluted, undefined)
const changing = new Proxy([0, 1], {
  getOwnPropertyDescriptor(target, key) {
    return Reflect.getOwnPropertyDescriptor(target, key)
  },
})
assert.ok(jsonEqual(new OutputBudget().capture(changing).json, [0, 1]))
const budget = new OutputBudget()
assert.throws(() => budget.capture('字'.repeat(MAX_OUTPUT_BYTES)))
assert.equal(budget.exceeded, true)
assert.throws(() => budget.consume('x', false))
const logging = new OutputBudget()
for (let index = 0; index < MAX_LOG_ENTRIES; index++) logging.log('log', [])
assert.throws(() => logging.log('log', []))
assert.equal(logging.exceeded, true)
let deep = null
for (let depth = 0; depth <= MAX_VALUE_DEPTH; depth++) deep = [deep]
assert.throws(() => new OutputBudget().capture(deep))
const boundary = new OutputBudget()
const messageBytes = new TextEncoder().encode(OUTPUT_LIMIT_MESSAGE).byteLength
boundary.consume('x'.repeat(MAX_OUTPUT_BYTES - messageBytes), false)
assert.throws(() => boundary.consume('x', false))
console.log('PASS bounded JSON snapshots, exact comparison, accessors, special keys and output limits')

assert.equal(isPuzzleId('__proto__'), false)
assert.equal(isPuzzleId('constructor'), false)
assert.equal(isPuzzleId('unknown'), false)
for (const puzzle of Object.values(PUZZLES)) {
  assert.equal(isPuzzleId(puzzle.id), true)
  assert.ok(Object.hasOwn(JUDGES, puzzle.judge))
  assert.ok(Object.isFrozen(puzzle) && Object.isFrozen(puzzle.tests))
  for (const test of puzzle.tests) assert.ok(Object.isFrozen(test) && Object.isFrozen(test.args))
}
const template = PUZZLES['binary-search']
assert.throws(() => definePuzzle({ ...template, entryPoint: 'solve;invalid' }))
assert.throws(() => definePuzzle({ ...template, failureMessage: '' }))
assert.throws(() => definePuzzle({ ...template, failureMessage: '字'.repeat(MAX_ERROR_BYTES) }))
assert.throws(() => definePuzzle({ ...template, tests: [template.tests[0], template.tests[0]] }))
for (const expected of [undefined, NaN, Infinity, cyclic, sparse, { get value() { return 1 } }]) {
  assert.throws(() => definePuzzle({ ...template, tests: [{ id: 'invalid', label: 'invalid', args: [[], 0], expected }] }))
}
const disguisedHole = Array(1)
disguisedHole.extra = 1
assert.throws(() => definePuzzle({ ...template, tests: [{ id: 'invalid', label: 'invalid', args: [disguisedHole, 0], expected: -1 }] }))
assert.throws(() => { PUZZLES['two-sum'].tests[0].args[0][0] = 999 })
console.log('PASS puzzle registry validation, JSON schema limits and frozen inputs')

const bootstrap = `
import { parentPort, workerData } from 'node:worker_threads'
import { registerHooks } from 'node:module'
registerHooks({ resolve: ${resolveTypes.toString()} })
globalThis.postMessage = value => parentPort.postMessage(value)
parentPort.on('message', data => globalThis.onmessage({ data }))
await import(workerData)
`
const workerUrl = new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`)

async function runSource(puzzle, source, expected) {
  const worker = new Worker(workerUrl, {
    workerData: new URL('algorithm-runner.worker.ts', sandboxRoot).href,
    execArgv: ['--experimental-strip-types', '--disable-warning=ExperimentalWarning'],
  })
  const results = []
  let timer
  try {
    const final = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Worker adapter timed out: ${puzzle.id}`)), MAX_WAIT_MS)
      worker.on('error', reject)
      worker.on('message', message => {
        if (message.type === 'ready') worker.postMessage({ type: 'run', requestId: 1, puzzleId: puzzle.id, source })
        if (message.type === 'case-result') results.push(message.result)
        if (message.type === 'done' || message.type === 'runner-error') resolve(message)
      })
    })
    assert.equal(final.status, expected, JSON.stringify({ puzzle: puzzle.id, final, results }))
    if (expected === 'passed') {
      assert.deepEqual(results.map(result => result.caseId), puzzle.tests.map(test => test.id))
      assert.ok(results.every(result => result.status === 'passed'))
    }
    const bytes = results.reduce((sum, result) => sum + new TextEncoder().encode(result.actual + result.error + result.logs.join('')).byteLength, 0)
    assert.ok(bytes <= MAX_OUTPUT_BYTES)
    return results
  } finally {
    clearTimeout(timer)
    await worker.terminate()
  }
}

for (const puzzle of Object.values(PUZZLES)) {
  await runSource(puzzle, puzzle.initialCode, 'passed')
  await runSource(puzzle, `function ${puzzle.entryPoint}(`, 'syntax-error')
  await runSource(puzzle, `throw new SyntaxError('local probe'); ${puzzle.initialCode}`, 'runtime-error')
  await runSource(puzzle, `function ${puzzle.entryPoint}() { return Promise.resolve(0) }`, 'runtime-error')
  await runSource(puzzle, `function ${puzzle.entryPoint}() { return undefined }`, 'wrong-answer')
  await runSource(puzzle, 'function wrongEntry() { return 0 }', 'runtime-error')
  console.log(`PASS actual Worker module (Node adapter): ${puzzle.id}, ${puzzle.tests.length} cases and shared error handling`)
}
const binary = PUZZLES['binary-search']
for (const expression of ['NaN', 'Infinity', 'null', 'false', 'String(nums.indexOf(target))', '[nums.indexOf(target)]']) {
  await runSource(binary, `function binarySearch(nums, target) { return ${expression} }`, 'wrong-answer')
}
await runSource(binary, 'function binarySearch(nums, target) { const index = nums.indexOf(target); nums.fill(999); return index }', 'passed')
await runSource(binary, 'function binarySearch(nums, target) { globalThis.count = (globalThis.count || 0) + 1; if (globalThis.count !== 1) throw new Error(); return nums.indexOf(target) }', 'passed')
console.log('PASS registry-driven execution, strict scalar results, cloned inputs and per-case isolation; browser checks remain required')
