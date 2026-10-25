// 主题定义的静态校验：不依赖浏览器，确保两套 token 完整、可解析、
// 对比度达标，并且结构样式确实按 body 标记门控。
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

function loadPlugin() {
  let definition
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: (value) => { definition = value }
      }
    }
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })
  assert.equal(definition.id, 'dsh-theme-stripe-style', 'loader id must stay stable')
  const module = definition.factory(() => ({}))
  return module
}

const plugin = loadPlugin()

function parseHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value)
  if (!match) return null
  let hex = match[1]
  if (hex.length === 3) hex = hex.split('').map((part) => part + part).join('')
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  return channels
}

function luminance(rgb) {
  const linear = rgb.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(foreground, background) {
  const a = luminance(parseHex(foreground))
  const b = luminance(parseHex(background))
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

test('two selectable themes, light and dark', () => {
  assert.equal(JSON.stringify(plugin.THEMES.map((theme) => theme.id)), JSON.stringify(['stripe-style-light', 'stripe-style-dark']))
  assert.equal(JSON.stringify(plugin.THEMES.map((theme) => theme.colorScheme)), JSON.stringify(['light', 'dark']))
  const ids = new Set(plugin.THEMES.map((theme) => theme.id))
  assert.equal(ids.size, plugin.THEMES.length, 'theme ids must be unique')
})

test('both themes share one complete token surface', () => {
  const paperKeys = Object.keys(plugin.PAPER).sort()
  const inkKeys = Object.keys(plugin.INK).sort()
  assert.equal(JSON.stringify(paperKeys), JSON.stringify(inkKeys), 'paper and ink must override the same tokens')
  assert.ok(paperKeys.length >= 80, `expected a broad alias surface, got ${paperKeys.length} tokens`)
  for (const key of paperKeys) {
    assert.match(key, /^--dsw-/, `${key} must be a dsh design token`)
    for (const theme of plugin.THEMES) {
      const value = theme.tokens[key]
      assert.equal(typeof value, 'string')
      assert.ok(value.length > 0, `${theme.id} ${key} must not be empty`)
      if (key === '--dsw-focus-ring-width') {
        assert.match(value, /^\d+(?:\.\d+)?px$/, `${theme.id} ${key} must be a pixel width`)
      } else if (value.startsWith('#')) {
        assert.ok(parseHex(value), `${theme.id} ${key} has an invalid hex color: ${value}`)
      } else {
        assert.match(value, /^rgba?\(/, `${theme.id} ${key} has an unexpected color: ${value}`)
      }
    }
  }
})

test('reading plane keeps WCAG AA text contrast', () => {
  for (const [name, tokens] of [['light', plugin.PAPER], ['dark', plugin.INK]]) {
    const base = tokens['--dsw-alias-bg-base']
    const layer1 = tokens['--dsw-alias-bg-layer-1']
    for (const surface of [base, layer1]) {
      const text = contrast(tokens['--dsw-alias-label-primary'], surface)
      assert.ok(text >= 7, `${name}: primary label contrast ${text.toFixed(1)} on ${surface} should be >= 7`)
      const secondary = contrast(tokens['--dsw-alias-label-secondary'], surface)
      assert.ok(secondary >= 4.5, `${name}: secondary label contrast ${secondary.toFixed(1)} should be >= 4.5`)
      const link = contrast(tokens['--dsw-alias-link'], surface)
      assert.ok(link >= 4.5, `${name}: link contrast ${link.toFixed(1)} should be >= 4.5`)
    }
    // 主按钮：酸绿底 + 黑色前景（label-primary-foreground）
    const primary = contrast(tokens['--dsw-alias-label-primary-foreground'], tokens['--dsw-alias-button-primary-fill'])
    assert.ok(primary >= 4.5, `${name}: primary button contrast ${primary.toFixed(1)} should be >= 4.5`)
  }
})

test('structural CSS is gated by the body marker and uses semantic hooks', () => {
  assert.match(plugin.CSS, /body\[data-dsh-stripe-style\] \[data-composer-card\]/)
  assert.match(plugin.CSS, /\[data-slot="sidebar"\]/)
  assert.match(plugin.CSS, /body\[data-dsh-stripe-style\] \[role="dialog"\]/)
  assert.match(plugin.CSS, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(plugin.CSS, /_[A-Za-z0-9]{5}_/, 'must not depend on hashed CSS-module class names')
  assert.doesNotMatch(plugin.CSS, /url\(/, 'must not load external assets')
})

test('host contract: injects slots, locale and theme only', () => {
  assert.equal(JSON.stringify(plugin.inject), JSON.stringify(['slots', 'locale', 'theme']))
  assert.equal(typeof plugin.apply, 'function')
})
