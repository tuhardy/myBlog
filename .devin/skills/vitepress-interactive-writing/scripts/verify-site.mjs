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
  await evaluate(`document.querySelector('.feature-gallery a[href="${sectionUrl.pathname}"]').click()`)
  await waitFor(`location.pathname === ${JSON.stringify(sectionUrl.pathname)} && !!document.querySelector('.learning-slider input')`)
  const pages = await evaluate(`Array.from(new Set([location.href, ...Array.from(document.querySelectorAll('.VPSidebar a[href]'), a => a.href).filter(href => new URL(href).pathname.startsWith(${JSON.stringify(sectionUrl.pathname)}))]))`)
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
  const regression = new URL('frontend/vue-basics.html', base)
  await navigate(regression, '.vp-doc h1')
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
