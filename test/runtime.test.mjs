// 运行时行为校验：用最小 fake 环境执行 apply()，确认主题恢复、Host adopt
// 后的静默恢复、用户点内置外观的退出、以及卸载清理都按预期工作。
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

function createEnvironment() {
  const cleanups = []
  const handlers = new Set()
  const timers = new Map()
  let timerId = 0
  const storage = new Map()
  const domListeners = new Map()

  const snapshot = {
    preference: 'light',
    revision: 1,
    active: { id: 'light', colorScheme: 'light' }
  }

  const theme = {
    registered: new Map(),
    register(definition) {
      if (theme.registered.has(definition.id)) throw new Error(`duplicate theme ${definition.id}`)
      theme.registered.set(definition.id, definition)
      return () => { theme.registered.delete(definition.id) }
    },
    getTheme() {
      return { ...snapshot, active: { ...snapshot.active } }
    },
    setTheme(id) {
      if (id !== 'system' && !theme.registered.has(id)) throw new Error(`theme "${id}" is not registered`)
      if (snapshot.preference === id) return
      snapshot.preference = id
      snapshot.revision += 1
      snapshot.active = { id, colorScheme: theme.registered.get(id)?.colorScheme ?? 'light' }
      for (const handler of [...handlers]) handler(theme.getTheme())
    }
  }

  const body = {
    attrs: new Map(),
    setAttribute(name, value) { body.attrs.set(name, String(value)) },
    removeAttribute(name) { body.attrs.delete(name) },
    getAttribute(name) { return body.attrs.has(name) ? body.attrs.get(name) : null }
  }

  const style = {
    id: '', dataset: {}, textContent: '', isConnected: false,
    remove() { style.isConnected = false }
  }

  const document = {
    body,
    head: {
      append(node) { node.isConnected = true }
    },
    createElement: (tag) => (tag === 'style' ? style : { tag, isConnected: false }),
    addEventListener(type, listener) {
      domListeners.set(type, [...(domListeners.get(type) ?? []), listener])
    },
    removeEventListener(type, listener) {
      domListeners.set(type, (domListeners.get(type) ?? []).filter((item) => item !== listener))
    }
  }

  const window = {
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => { storage.set(key, String(value)) },
      removeItem: (key) => { storage.delete(key) }
    },
    setTimeout: (fn) => {
      timerId += 1
      timers.set(timerId, fn)
      return timerId
    },
    clearTimeout: (id) => { timers.delete(id) }
  }

  const React = {
    createElement: (type, props, ...children) => ({ type, props, children })
  }
  const runtime = {
    defineStore: (definition) => ({ definition, state: definition.init() })
  }

  const ctx = {
    theme,
    effect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
      return cleanup
    },
    on(_event, handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    locale: { register: () => () => {} },
    slots: {
      inject(_name, register) { register() },
      register: () => () => {}
    }
  }

  let definition
  const sandbox = {
    window: {
      ...window,
      __ModuleLoader__: { load: (value) => { definition = value } }
    },
    document,
    Promise,
    console
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })
  const module = definition.factory((id) => (id === 'react' ? React : runtime))

  return {
    module, ctx, snapshot, theme, body, style, storage, timers, cleanups, domListeners,
    runTimers() {
      const pending = [...timers.values()]
      timers.clear()
      for (const fn of pending) fn()
      return pending.length
    },
    async flush() {
      await Promise.resolve()
      await Promise.resolve()
    },
    /** 模拟 Host adopt durable 设置后的 publish（不经过 setTheme）。 */
    adopt(preference) {
      snapshot.preference = preference
      snapshot.revision += 1
      snapshot.active = {
        id: preference,
        colorScheme: preference === 'dark' ? 'dark' : preference === 'light' ? 'light' : (theme.registered.get(preference)?.colorScheme ?? 'light')
      }
      for (const handler of [...handlers]) handler(theme.getTheme())
    },
    dispose() {
      for (const cleanup of [...cleanups].reverse()) cleanup()
      cleanups.length = 0
    },
    click(target) {
      for (const listener of domListeners.get('click') ?? []) listener({ target })
    }
  }
}

const builtinButton = (label) => ({
  closest: () => ({
    textContent: label,
    hasAttribute: () => false
  })
})

test('saved plugin choice is applied immediately, before the restore timer', () => {
  const env = createEnvironment()
  env.storage.set('dsh-theme-stripe-style.preference', 'stripe-style-dark')

  env.module.apply(env.ctx)

  assert.equal(env.snapshot.preference, 'stripe-style-dark')
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), 'dark')
  assert.equal(env.theme.registered.size, 2)
  assert.equal(env.style.isConnected, true)
})

test('first run auto-applies the variant matching the current appearance and remembers it', () => {
  const env = createEnvironment()
  env.module.apply(env.ctx)

  assert.equal(env.snapshot.preference, 'light', 'must wait for the host snapshot before auto-applying')
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), null)

  env.runTimers()

  assert.equal(env.snapshot.preference, 'stripe-style-light')
  assert.equal(env.storage.get('dsh-theme-stripe-style.preference'), 'stripe-style-light')
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), 'light')
})

test('host adopt (e.g. font-size write) is silently recovered to the saved theme', async () => {
  const env = createEnvironment()
  env.storage.set('dsh-theme-stripe-style.preference', 'stripe-style-light')
  env.module.apply(env.ctx)
  assert.equal(env.snapshot.preference, 'stripe-style-light')

  // Host 写完字体大小后 adopt durable 的 builtin preference。
  env.adopt('dark')
  assert.equal(env.snapshot.preference, 'dark')
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), null)

  await env.flush()

  assert.equal(env.snapshot.preference, 'stripe-style-light', 'saved theme must be re-asserted')
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), 'light')
})

test('clicking a built-in appearance opts out instead of fighting the user', async () => {
  const env = createEnvironment()
  env.storage.set('dsh-theme-stripe-style.preference', 'stripe-style-light')
  env.module.apply(env.ctx)

  env.click(builtinButton('深色'))
  assert.equal(env.storage.get('dsh-theme-stripe-style.preference'), 'default')

  env.adopt('light')
  await env.flush()

  assert.equal(env.snapshot.preference, 'light', 'must not steal the built-in choice back')
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), null)
})

test('unload removes styles, body marker and theme registrations', () => {
  const env = createEnvironment()
  env.storage.set('dsh-theme-stripe-style.preference', 'stripe-style-light')
  env.module.apply(env.ctx)
  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), 'light')

  env.dispose()

  assert.equal(env.body.getAttribute('data-dsh-stripe-style'), null)
  assert.equal(env.style.isConnected, false)
  assert.equal(env.theme.registered.size, 0)
  assert.equal((env.domListeners.get('click') ?? []).length, 0)
})

test('reduced motion does not freeze infinite animations', () => {
  const env = createEnvironment()
  assert.doesNotMatch(env.module.CSS, /animation-duration/)
  assert.doesNotMatch(env.module.CSS, /animation:\s*none/)
})
