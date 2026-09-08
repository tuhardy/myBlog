import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const DEFAULT_BASE = 'http://127.0.0.1:4173/myBlog/'
const DEFAULT_SECTION = 'linux'
const WAIT_MS = 15000
const POLL_MS = 100
const ANIMATION_MS = 750
const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375
const VIEWPORT_HEIGHT = 900
const NARROW_WIDTH = 320
const MAX_CODE_LENGTH = 32 * 1024
const RUN_TIMEOUT_MS = 3000
const LARGE_OUTPUT_LENGTH = 40000
const CASE_IDS = ['ordinary', 'later', 'duplicate', 'negative', 'zero']
const SANDBOX = '[data-testid="sandbox"]'
const EDITOR = '[data-testid="sandbox-editor"] .cm-content[contenteditable="true"]'
const STATUS = '[data-testid="sandbox-status"]'
const CASES = '[data-testid="sandbox-case"]'
const RUN_STATUSES = ['idle', 'running', 'passed', 'wrong-answer', 'syntax-error', 'runtime-error', 'timeout', 'output-limit', 'stopped', 'invalid-input', 'runner-error']
const SOLVE_BODY = 'for (let i = 0; i < nums.length; i++) { for (let j = i + 1; j < nums.length; j++) { if (nums[i] + nums[j] === target) return [i, j] } } return []'
const SOLUTION = `function twoSum(nums, target) { ${SOLVE_BODY} }`
const WORKER_ASSET = /\/[^/]*algorithm-runner[^/]*\.js$/
const base = new URL(process.argv[2] || DEFAULT_BASE)
const section = process.argv[3] || DEFAULT_SECTION
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Only local previews are supported')
assert.match(section, /^[a-z0-9-]+$/)
assert.ok(base.pathname.endsWith('/'), 'Base URL must end with /')
const sectionUrl = new URL(`${section}/`, base)
const browserPath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const profile = await mkdtemp(join(tmpdir(), 'vitepress-learning-check-'))
const browser = spawn(browserPath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })
const exited = new Promise((resolve) => {
  browser.once('exit', resolve)
  browser.once('error', resolve)
})
let socket
const pending = new Map()
const errors = []
const responses = []
const requests = []
let serial = 0
let sessionId

function command(method, params = {}, session = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++serial
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`CDP timeout: ${method}`))
    }, WAIT_MS)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }))
  })
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression: `{ ${expression}\n}`, returnByValue: true, awaitPromise: true })
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
  return result.result.value
}

async function waitFor(expression) {
  const start = Date.now()
  while (Date.now() - start < WAIT_MS) {
    if (await evaluate(expression)) return
    await delay(POLL_MS)
  }
  throw new Error(`Page condition timed out: ${expression}; browser errors: ${JSON.stringify(errors)}`)
}

async function navigate(url, selector) {
  const response = await fetch(url)
  assert.equal(response.status, 200, `HTTP: ${url}`)
  const html = await response.text()
  assert.ok(html.includes('<h1'), `Missing prerendered heading: ${url}`)
  const result = await command('Page.navigate', { url: String(url) })
  assert.ok(!result.errorText, result.errorText)
  await waitFor(`location.pathname === ${JSON.stringify(new URL(url).pathname)} && document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(selector)})`)
}

async function checkOverflow(width) {
  await command('Emulation.setDeviceMetricsOverride', { width, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: false })
  await delay(POLL_MS)
  const sizes = await evaluate('({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })')
  assert.ok(sizes.scroll <= sizes.width + 1, `Horizontal overflow: ${JSON.stringify(sizes)}`)
}

async function checkEditorContrast(mode) {
  const minimumContrast = 4.5
  const rgbMaximum = 255
  const gammaThreshold = 0.04045
  const linearDivisor = 12.92
  const gammaOffset = 0.055
  const gammaDivisor = 1.055
  const gammaExponent = 2.4
  const luminanceOffset = 0.05
  const weights = [0.2126, 0.7152, 0.0722]
  const colors = await evaluate(`({ background: getComputedStyle(document.querySelector('[data-testid="sandbox-editor"] .cm-editor')).backgroundColor, tokens: Array.from(new Set(Array.from(document.querySelectorAll('[data-testid="sandbox-editor"] .cm-line span'), span => getComputedStyle(span).color))) })`)
  const luminance = color => color.match(/[\d.]+/g).slice(0, weights.length).reduce((sum, channel, index) => {
    const value = Number(channel) / rgbMaximum
    return sum + weights[index] * (value <= gammaThreshold ? value / linearDivisor : ((value + gammaOffset) / gammaDivisor) ** gammaExponent)
  }, 0)
  const background = luminance(colors.background)
  assert.ok(colors.tokens.length, 'No syntax tokens to check')
  for (const color of colors.tokens) {
    const text = luminance(color)
    const contrast = (Math.max(text, background) + luminanceOffset) / (Math.min(text, background) + luminanceOffset)
    assert.ok(contrast >= minimumContrast, `${mode} syntax token ${color} on ${colors.background}: contrast ${contrast.toFixed(2)} < ${minimumContrast}`)
  }
}

async function key(key, code, windowsVirtualKeyCode, modifiers = 0) {
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, modifiers, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) })
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, modifiers })
}

async function editSource(source) {
  await waitFor(`!!document.querySelector(${JSON.stringify(EDITOR)})`)
  await evaluate(`document.querySelector(${JSON.stringify(EDITOR)}).focus()`)
  assert.ok(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(EDITOR)})`), 'Editor did not receive focus')
  await key('a', 'KeyA', 65, 2)
  if (source.length) await command('Input.insertText', { text: source })
  else await key('Backspace', 'Backspace', 8)
  await delay(POLL_MS)
}

async function button(action) {
  const selector = `[data-testid="sandbox-${action}"]`
  await waitFor(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`)
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await key('Enter', 'Enter', 13)
}

async function sandboxState() {
  return evaluate(`({ status: document.querySelector('${STATUS}')?.dataset.status, cases: Array.from(document.querySelectorAll('${CASES}'), node => ({ id: node.dataset.caseId, status: node.dataset.status })), error: document.querySelector('[data-testid="sandbox-error"]')?.textContent.trim() || '', duration: document.querySelector('[data-testid="sandbox-total-duration"]')?.textContent.trim() || '' })`)
}

async function expectStatus(expected, label) {
  const accepted = Array.isArray(expected) ? expected : [expected]
  await waitFor(`${JSON.stringify(accepted)}.includes(document.querySelector('${STATUS}')?.dataset.status)`)
  const state = await sandboxState()
  assert.ok(RUN_STATUSES.includes(state.status), `${label}: unknown status ${state.status}`)
  assert.deepEqual(state.cases.map(item => item.id), CASE_IDS, `${label}: incorrect fixed cases`)
  assert.ok(state.cases.every(item => ['pending', 'running', ...RUN_STATUSES.filter(status => !['idle', 'invalid-input', 'runner-error'].includes(status))].includes(item.status)), `${label}: invalid case status`)
  if (state.status === 'idle') {
    assert.ok(state.cases.every(item => item.status === 'pending'), `${label}: idle cases must be pending`)
    assert.equal(state.error, '', `${label}: stale error after reset or navigation`)
  }
  if (state.status === 'passed') {
    assert.ok(state.cases.every(item => item.status === 'passed'), `${label}: not all five cases passed`)
    assert.match(state.duration, /\d/, `${label}: missing total duration`)
  }
  if (['syntax-error', 'runtime-error', 'timeout', 'output-limit', 'invalid-input', 'runner-error'].includes(state.status)) {
    assert.ok(state.error, `${label}: missing readable error`)
  }
  if (!['idle', 'running'].includes(state.status)) {
    assert.ok(state.cases.every(item => item.status !== 'running'), `${label}: stale running case`)
    assert.ok(await evaluate("!document.querySelector('[data-testid=\"sandbox-run\"]').disabled"), `${label}: run remains disabled`)
  }
  return state
}

async function runSource(label, source, expected) {
  await editSource(source)
  await button('run')
  const state = await expectStatus(expected, label)
  console.log(`PASS sandbox ${label}: ${state.status}`)
  return state
}

async function waitForNoWorkers() {
  const start = Date.now()
  while (Date.now() - start < WAIT_MS) {
    const { targetInfos } = await command('Target.getTargets', {}, null)
    if (!targetInfos.some(target => target.type === 'worker')) return
    await delay(POLL_MS)
  }
  assert.fail('Sandbox Worker remains alive after completion or route leave')
}

async function startInfiniteRun() {
  await editSource('function twoSum() { while (true) {} }')
  await button('run')
  await waitFor(`document.querySelector('${STATUS}')?.dataset.status === 'running' && document.querySelector('${CASES}[data-case-id="ordinary"]')?.dataset.status === 'running'`)
  const state = await sandboxState()
  assert.ok(state.cases.slice(1).every(item => item.status === 'pending'), 'Future cases must remain pending during execution')
  const start = Date.now()
  assert.equal(await evaluate('new Promise(resolve => requestAnimationFrame(() => resolve(document.readyState)))'), 'complete', 'Main thread did not respond during Worker loop')
  assert.ok(Date.now() - start < RUN_TIMEOUT_MS, 'Main thread only responded after run timeout')
}

async function assertNoSandboxWorker(label, responseStart = 0) {
  assert.ok(!responses.slice(responseStart).some(response => WORKER_ASSET.test(new URL(response.url).pathname)), `${label}: unexpectedly loaded sandbox Worker`)
  assert.ok(await evaluate(`!document.querySelector('${SANDBOX}') && !document.querySelector('.cm-editor')`), `${label}: unexpectedly mounted sandbox/editor`)
  await waitForNoWorkers()
}

async function verifyAlgorithm() {
  const puzzle = new URL('algorithm/two-sum.html', base)
  await waitFor(`location.pathname === ${JSON.stringify(sectionUrl.pathname)} && !!document.querySelector('.vp-doc h1')`)
  await navigate(sectionUrl, '.vp-doc h1')
  assert.ok(await evaluate("!document.querySelector('.learning-slider')"), 'Algorithm index must not require a slider')
  await waitFor(`Array.from(document.querySelectorAll('.vp-doc a[href]')).some(a => a.href === ${JSON.stringify(puzzle.href)}) && !!document.querySelector('.VPSidebar a[href="${puzzle.pathname}"]')`)
  await assertNoSandboxWorker('Algorithm index')
  await checkOverflow(DESKTOP_WIDTH)
  await checkOverflow(MOBILE_WIDTH)
  await checkOverflow(NARROW_WIDTH)
  const articleResponseStart = responses.length
  await navigate(puzzle, EDITOR)
  await expectStatus('idle', 'initial state')
  assert.ok((await sandboxState()).cases.every(item => item.status === 'pending'), 'Cases ran without user action')
  assert.ok(!responses.slice(articleResponseStart).some(response => WORKER_ASSET.test(new URL(response.url).pathname)), 'Worker loaded before first run')
  const initialCode = await evaluate(`document.querySelector(${JSON.stringify(EDITOR)}).textContent`)
  assert.ok(initialCode.includes('twoSum'), 'Missing initial solution')
  assert.ok(await evaluate(`!!document.querySelector('${STATUS}').closest('[aria-live], [role="status"]')`), 'Missing accessible live status')
  await evaluate(`document.querySelector(${JSON.stringify(EDITOR)}).focus()`)
  await key('Tab', 'Tab', 9)
  assert.ok(await evaluate("!document.querySelector('[data-testid=\"sandbox-editor\"]').contains(document.activeElement)"), 'Tab traps focus inside editor')
  assert.ok(await evaluate("document.activeElement.matches(':focus-visible') && (getComputedStyle(document.activeElement).outlineStyle !== 'none' || getComputedStyle(document.activeElement).boxShadow !== 'none')"), 'Missing keyboard focus-visible indicator')
  await button('run')
  await expectStatus('passed', 'initial five cases')
  await waitForNoWorkers()
  assert.ok(responses.some(response => WORKER_ASSET.test(new URL(response.url).pathname)), 'No Worker response observed through CDP Network')
  for (const response of responses.filter(response => WORKER_ASSET.test(new URL(response.url).pathname))) {
    const url = new URL(response.url)
    assert.equal(url.origin, base.origin, 'Worker loaded outside local preview')
    assert.ok(url.pathname.startsWith(`${base.pathname}assets/`), `Worker ignores site base: ${url.pathname}`)
    assert.equal(response.status, 200, `Worker resource failed: ${url.pathname}`)
  }
  const fixtures = [
    ['reversed indices', `function twoSum(nums, target) { const result = (function () { ${SOLVE_BODY} })(); return result.reverse() }`, 'passed'],
    ['wrong answer', 'function twoSum() { return [] }', 'wrong-answer'],
    ['numeric string indices', `function twoSum(nums, target) { return (function () { ${SOLVE_BODY} })().map(String) }`, 'wrong-answer'],
    ['duplicate indices', 'function twoSum() { return [0, 0] }', 'wrong-answer'],
    ['out-of-range indices', 'function twoSum(nums) { return [-1, nums.length] }', 'wrong-answer'],
    ['fractional indices', 'function twoSum() { return [0.5, 1] }', 'wrong-answer'],
    ['non-array answer', 'function twoSum() { return 42 }', 'wrong-answer'],
    ['syntax error', 'function twoSum( {', 'syntax-error'],
    ['runtime error', 'function twoSum() { throw new Error("local runtime probe") }', 'runtime-error'],
    ['explicit SyntaxError in function', 'function twoSum() { throw new SyntaxError("local function probe") }', 'runtime-error'],
    ['top-level SyntaxError', 'throw new SyntaxError("local top-level probe"); function twoSum() {}', 'runtime-error'],
    ['top-level error', 'throw new Error("local top-level probe"); function twoSum() {}', 'runtime-error'],
    ['missing function', 'const other = 1', 'runtime-error'],
    ['non-function entry', 'const twoSum = 42', 'runtime-error'],
    ['Promise result', 'function twoSum() { return Promise.resolve([0, 1]) }', 'runtime-error'],
    ['thenable result', 'function twoSum() { return { then() {} } }', 'runtime-error'],
    ['bounded console stays inside sandbox', `function twoSum(nums, target) { console.log('local-log-probe'); console.warn('local-warning-probe'); console.error('local-error-probe'); ${SOLVE_BODY} }`, 'passed'],
    ['empty source', '', 'invalid-input'],
    ['whitespace source', ' \n\t ', 'invalid-input'],
    ['32769 code units', ' '.repeat(MAX_CODE_LENGTH) + 'x', 'invalid-input'],
    ['bounded large return', `function twoSum() { return '字'.repeat(${LARGE_OUTPUT_LENGTH}) }`, 'output-limit'],
    ['console flood', 'function twoSum() { for (let i = 0; i < 1000; i++) console.log("local bounded log", i); return [0, 1] }', 'output-limit'],
    ['caught console limit remains sticky', `function twoSum(nums, target) { try { for (let i = 0; i < 1000; i++) console.log('字'.repeat(100)) } catch {} ${SOLVE_BODY} }`, 'output-limit'],
    ['cyclic output', 'function twoSum() { const value = []; value.push(value); return value }', 'wrong-answer'],
    ['Proxy getter error', 'function twoSum() { return new Proxy([], { get() { throw new Error("local getter probe") } }) }', 'runtime-error'],
    ['host capabilities unavailable', `function twoSum(nums, target) { if ([typeof fetch, typeof self, typeof indexedDB, typeof caches, typeof Worker, typeof WebSocket, typeof XMLHttpRequest, typeof postMessage, typeof require, typeof process, typeof BroadcastChannel].some(value => value !== 'undefined')) throw new Error('Host capability exposed'); ${SOLVE_BODY} }`, 'passed'],
    ['constructor reflection rejected', `function twoSum(nums, target) { for (const getConstructor of [() => (function () {}).constructor, () => [].constructor.constructor, () => (async function () {}).constructor, () => (function* () {}).constructor]) { let denied = false; try { getConstructor()('return globalThis')() } catch { denied = true } if (!denied) throw new Error('Constructor reflection allowed') } ${SOLVE_BODY} }`, 'passed'],
    ['console prototype cannot expose host', `function twoSum(nums, target) { for (const method of [console.log, console.warn, console.error]) { let denied = false; try { Object.getPrototypeOf(method).constructor('return globalThis')() } catch { denied = true } if (!denied) throw new Error('Console host reflection allowed') } const prototype = Object.getPrototypeOf(console); if (prototype && ['fetch', 'self', 'postMessage', 'process'].some(name => name in prototype)) throw new Error('Console host prototype exposed'); ${SOLVE_BODY} }`, 'passed'],
    ['dynamic local import rejected', `function twoSum(nums, target) { import('data:text/javascript,export default 1'); ${SOLVE_BODY} }`, ['syntax-error', 'runtime-error']],
    ['static local import rejected', `import value from 'data:text/javascript,export default 1'; ${SOLUTION}`, 'syntax-error'],
    ['parameter mutation cannot forge answer', 'function twoSum(nums, target) { nums[0] = target; nums[1] = 0; return [0, 1] }', 'wrong-answer'],
    ['parameter mutation preserves valid answer', `function twoSum(nums, target) { const result = (function () { ${SOLVE_BODY} })(); nums.fill(123456); return result }`, 'passed'],
    ['fresh compartment for every case', `function twoSum(nums, target) { globalThis.localCaseProbe = (globalThis.localCaseProbe || 0) + 1; if (globalThis.localCaseProbe !== 1) throw new Error('State leaked between cases'); ${SOLVE_BODY} }`, 'passed'],
    ['clean run after mutation', SOLUTION, 'passed'],
  ]
  for (const [label, source, expected] of fixtures) {
    const before = responses.length
    await runSource(label, source, expected)
    if (label === 'wrong answer') {
      const outputLimit = 64 * 1024
      const boundaryMargin = 10
      const jsonQuotes = 2
      const error = await evaluate(`document.querySelector('${CASES} .sandbox__error pre').textContent`)
      const length = outputLimit - new TextEncoder().encode(error).byteLength - boundaryMargin - jsonQuotes
      await runSource('output limit message stays within budget', `function twoSum(nums) { return nums[0] === 2 ? '1'.repeat(${length}) : [] }`, 'output-limit')
    }
    if (label === 'bounded console stays inside sandbox') {
      assert.ok(await evaluate(`['local-log-probe', 'local-warning-probe', 'local-error-probe'].every(text => document.querySelector('${SANDBOX}').textContent.includes(text))`), 'Sandbox did not display captured console output')
    }
    if (expected === 'invalid-input') assert.ok(!responses.slice(before).some(response => WORKER_ASSET.test(new URL(response.url).pathname)), `${label}: invalid input created Worker`)
    await waitForNoWorkers()
    assert.equal(errors.length, 0, `${label}: unexpected browser errors/warnings: ${JSON.stringify(errors)}`)
  }
  assert.ok(!requests.some(request => request.url.startsWith('data:text/javascript,')), 'Sandbox import unexpectedly requested a local data module')
  await startInfiniteRun()
  const timedOut = await expectStatus('timeout', 'infinite loop')
  assert.equal(timedOut.cases[0].status, 'timeout')
  assert.ok(timedOut.cases.slice(1).every(item => item.status === 'pending'), 'Timeout marked unexecuted cases as completed')
  await waitForNoWorkers()
  await startInfiniteRun()
  await button('stop')
  const stopped = await expectStatus('stopped', 'manual stop')
  assert.equal(stopped.cases[0].status, 'stopped')
  assert.ok(stopped.cases.slice(1).every(item => item.status === 'pending'), 'Stop marked unexecuted cases as completed')
  await waitForNoWorkers()
  await runSource('run after stop', SOLUTION, 'passed')
  await delay(RUN_TIMEOUT_MS + POLL_MS)
  await expectStatus('passed', 'old stop timer cannot overwrite new run')
  await startInfiniteRun()
  await button('reset')
  await expectStatus('idle', 'reset during run')
  await waitForNoWorkers()
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(EDITOR)}).textContent`), initialCode, 'Reset did not restore initial solution')
  assert.ok((await sandboxState()).cases.every(item => item.status === 'pending'), 'Reset did not clear cases')
  await button('run')
  await expectStatus('passed', 'run after reset')
  await delay(RUN_TIMEOUT_MS + POLL_MS)
  await expectStatus('passed', 'old reset timer cannot overwrite new run')
  await startInfiniteRun()
  await evaluate(`document.querySelector('.VPSidebar a[href="${sectionUrl.pathname}"]').click()`)
  await waitFor(`location.pathname === ${JSON.stringify(sectionUrl.pathname)} && !document.querySelector('${SANDBOX}')`)
  await waitForNoWorkers()
  await evaluate(`Array.from(document.querySelectorAll('.vp-doc a[href]')).find(a => a.href === ${JSON.stringify(puzzle.href)}).click()`)
  await waitFor(`location.pathname === ${JSON.stringify(puzzle.pathname)} && !!document.querySelector(${JSON.stringify(EDITOR)})`)
  await expectStatus('idle', 'return after route leave')
  await button('run')
  await expectStatus('passed', 'run after route return')
  await delay(RUN_TIMEOUT_MS + POLL_MS)
  await expectStatus('passed', 'old route timer cannot overwrite new run')
  await runSource('Proxy getter loop stays in Worker', 'function twoSum() { return new Proxy([], { get() { while (true) {} } }) }', 'timeout')
  await waitForNoWorkers()
  await runSource('long readable output', `function twoSum() { return 'local-output-'.repeat(100) }`, 'wrong-answer')
  for (const width of [DESKTOP_WIDTH, MOBILE_WIDTH, NARROW_WIDTH]) await checkOverflow(width)
  await evaluate("document.documentElement.classList.add('dark')")
  for (const width of [MOBILE_WIDTH, NARROW_WIDTH]) await checkOverflow(width)
  const dark = await evaluate(`({ background: getComputedStyle(document.querySelector('[data-testid="sandbox-editor"] .cm-editor')).backgroundColor, text: getComputedStyle(document.querySelector(${JSON.stringify(EDITOR)})).color })`)
  assert.notEqual(dark.background, dark.text, 'Identical editor foreground/background in dark mode')
  await checkEditorContrast('dark')
  await runSource('dark narrow editor keyboard input', SOLUTION, 'passed')
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await button('reset')
  await expectStatus('idle', 'reduced-motion reset')
  await button('run')
  await expectStatus('passed', 'reduced-motion run')
  await command('Emulation.setEmulatedMedia', { features: [] })
  await evaluate("document.documentElement.classList.remove('dark')")
  await delay(POLL_MS)
  await checkEditorContrast('light')
  await waitForNoWorkers()
  console.log('PASS algorithm: five-case judging, isolation, bounded output, lifecycle, keyboard, 375/320px, dark, reduced motion')
  console.log(`Worker response paths: ${JSON.stringify([...new Set(responses.filter(response => WORKER_ASSET.test(new URL(response.url).pathname)).map(response => new URL(response.url).pathname))])}`)
  return [sectionUrl.href, puzzle.href]
}

try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('Browser startup timed out')), WAIT_MS)
    browser.once('error', (error) => { clearTimeout(timeout); reject(error) })
    browser.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Browser exited: ${code}`)) })
    browser.stderr.on('data', (chunk) => {
      output += chunk.toString()
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) { clearTimeout(timeout); resolve(match[1]) }
    })
  })
  socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    const request = pending.get(message.id)
    if (request) {
      clearTimeout(request.timeout)
      pending.delete(message.id)
      if (message.error) request.reject(new Error(JSON.stringify(message.error)))
      else request.resolve(message.result)
    }
    if (message.method === 'Network.responseReceived') {
      const { url, status } = message.params.response
      responses.push({ url, status, sessionId: message.sessionId })
    }
    if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, sessionId: message.sessionId })
    if (message.method === 'Target.attachedToTarget' && message.params.targetInfo.type === 'worker') {
      const workerSession = message.params.sessionId
      Promise.all([command('Runtime.enable', {}, workerSession), command('Network.enable', {}, workerSession)])
        .then(() => command('Runtime.runIfWaitingForDebugger', {}, workerSession))
        .catch(error => errors.push(`Worker CDP initialization: ${error.message}`))
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      errors.push(message.params.args.map((arg) => arg.value || arg.description).join(' '))
    }
  })
  const target = await command('Target.createTarget', { url: 'about:blank' })
  const attached = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  sessionId = attached.sessionId
  await command('Page.enable')
  await command('Runtime.enable')
  await command('Network.enable')
  await command('Network.setCacheDisabled', { cacheDisabled: true })
  if (section === 'algorithm') {
    await command('Target.setDiscoverTargets', { discover: true }, null)
    await command('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true })
  }
  await navigate(base, '.feature-gallery')
  const homeLink = await evaluate(`document.querySelector('.feature-gallery a[href="${sectionUrl.pathname}"]')?.href`)
  assert.equal(homeLink, sectionUrl.href, 'Missing homepage topic card')
  assert.ok(await evaluate(`!!document.querySelector('.VPNav a[href="${sectionUrl.pathname}"]')`), 'Missing topic navigation')
  await checkOverflow(DESKTOP_WIDTH)
  await evaluate(`document.querySelector('.feature-gallery a[href="${sectionUrl.pathname}"]').focus()`)
  assert.notEqual(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), 'none', 'Missing homepage focus indicator')
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const cardCenter = await evaluate(`const rect = document.querySelector('.feature-gallery a[href="${sectionUrl.pathname}"]').getBoundingClientRect(); ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })`)
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...cardCenter })
  await delay(POLL_MS)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.feature-gallery a[href="${sectionUrl.pathname}"]')).animationName`), 'none', 'Homepage hover ignores reduced motion')
  await command('Emulation.setEmulatedMedia', { features: [] })
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 })
  await checkOverflow(MOBILE_WIDTH)
  if (section === 'algorithm') await assertNoSandboxWorker('Homepage')
  await evaluate(`document.querySelector('.feature-gallery a[href="${sectionUrl.pathname}"]').click()`)
  let pages
  if (section === 'algorithm') {
    pages = await verifyAlgorithm()
  } else {
    await waitFor(`location.pathname === ${JSON.stringify(sectionUrl.pathname)} && !!document.querySelector('.learning-slider input')`)
    pages = await evaluate(`Array.from(new Set([location.href, ...Array.from(document.querySelectorAll('.VPSidebar a[href]'), a => a.href).filter(href => new URL(href).pathname.startsWith(${JSON.stringify(sectionUrl.pathname)}))]))`)
    assert.ok(pages.length >= 2, 'No chapter links found in sidebar')
    for (const page of pages) {
      await navigate(page, '.learning-slider input')
      await delay(ANIMATION_MS)
      assert.ok(await evaluate("['.learning-tabs', '.learning-slider', '.learning-counter', '.learning-flip'].every(selector => document.querySelector(selector))"), `Missing interaction type: ${page}`)
      await evaluate("const input = document.querySelector('.learning-slider input'); input.value = input.min; input.dispatchEvent(new Event('input', { bubbles: true }))")
      await delay(ANIMATION_MS)
      const before = await evaluate("document.querySelector('.learning-counter').getAttribute('aria-label')")
      await evaluate("const input = document.querySelector('.learning-slider input'); input.value = input.max; input.dispatchEvent(new Event('input', { bubbles: true }))")
      await delay(ANIMATION_MS)
      const after = await evaluate("document.querySelector('.learning-counter').getAttribute('aria-label')")
      assert.notEqual(before, after, `Slider/counter not linked: ${page}`)
      assert.ok(await evaluate("document.querySelector('.learning-counter').getAttribute('aria-label').endsWith(document.querySelector('.learning-counter__number').textContent)"), 'Counter did not settle on target')
      await evaluate("document.querySelectorAll('[role=tab]')[1].click()")
      await waitFor("document.querySelectorAll('[role=tab]')[1].getAttribute('aria-selected') === 'true'")
      await evaluate("document.querySelectorAll('[role=tab]')[1].focus()")
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 })
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 })
      await waitFor("document.querySelector('[role=tab]').getAttribute('aria-selected') === 'true' && document.activeElement === document.querySelector('[role=tab]')")
      assert.ok(await evaluate("Array.from(document.querySelectorAll('[role=tab]')).every(tab => { const panel = document.getElementById(tab.getAttribute('aria-controls')); return !!panel && (getComputedStyle(panel).display !== 'none') === (tab.getAttribute('aria-selected') === 'true') })"), 'Tab panel visibility mismatch')
      await evaluate("document.querySelector('.learning-flip__toggle').focus()")
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' })
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
      await waitFor("document.querySelector('.learning-flip__toggle').getAttribute('aria-pressed') === 'true'")
      assert.equal(await evaluate("document.querySelector('.learning-flip__back').getAttribute('aria-hidden')"), 'false')
      await evaluate("document.querySelector('.learning-flip__toggle').click()")
      await waitFor("document.querySelector('.learning-flip__toggle').getAttribute('aria-pressed') === 'false'")
      await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
      await delay(POLL_MS)
      await evaluate("const input = document.querySelector('.learning-slider input'); input.value = input.min; input.dispatchEvent(new Event('input', { bubbles: true }))")
      await delay(POLL_MS)
      assert.ok(await evaluate("document.querySelector('.learning-counter').getAttribute('aria-label').endsWith(document.querySelector('.learning-counter__number').textContent)"), 'Reduced-motion counter did not settle immediately')
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.learning-flip__inner')).transitionDuration"), '0s')
      await command('Emulation.setEmulatedMedia', { features: [] })
      await checkOverflow(DESKTOP_WIDTH)
      await checkOverflow(MOBILE_WIDTH)
      await evaluate("document.documentElement.classList.add('dark')")
      await checkOverflow(MOBILE_WIDTH)
      const dark = await evaluate("({ background: getComputedStyle(document.querySelector('.learning-flip__front')).backgroundColor, text: getComputedStyle(document.querySelector('.learning-flip__front')).color })")
      assert.notEqual(dark.background, dark.text, 'Identical foreground/background in dark mode')
      await evaluate("document.documentElement.classList.remove('dark')")
      console.log(`PASS ${new URL(page).pathname}: interactions, keyboard, responsive, dark, reduced motion`)
    }
  }
  const regression = new URL('frontend/vue-basics.html', base)
  const regressionResponseStart = responses.length
  await navigate(regression, '.vp-doc h1')
  if (section === 'algorithm') await assertNoSandboxWorker('Existing Vue article', regressionResponseStart)
  assert.equal(errors.length, 0, `Browser errors/warnings: ${JSON.stringify(errors)}`)
  console.log(`PASS homepage card, ${pages.length} topic pages, existing article, zero browser errors/warnings`)
} finally {
  for (const request of pending.values()) clearTimeout(request.timeout)
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ id: ++serial, method: 'Browser.close' }))
    socket.close()
  }
  await Promise.race([exited, delay(2000)])
  if (browser.exitCode === null) browser.kill()
  await Promise.race([exited, delay(2000)])
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
