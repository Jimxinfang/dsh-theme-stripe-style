// dsh-theme-stripe-style — browser half.
//
// 两套可切换的 Stripe 风格主题（白昼紫 / 午夜蓝），全部效果通过 DSH 官方主题服务注册：
//   - 颜色：ctx.theme.register({ id, colorScheme, tokens })，只覆盖真实存在的
//     --dsw-alias-* 语义 token，由 ui-layout 的 presenter 写到 body 上。
//   - 结构：插件自己持有一张以 body[data-dsh-stripe-style] 门控的样式表，
//     全界面铺 40px 紫色网格（低透明度），侧栏/卡片用不透明表面浮在网格上。
//   - 层次：卡片 12px 圆角 + 双层柔和阴影；按钮 8px 圆角 + 紫色内嵌高光 + 悬浮上浮；
//     active 下压（scale .98 + inset 阴影），focus 3px 紫色环，动效 200–300ms ease-out。
//   - 设置：向 settings.general.item 槽注册一行三选一卡片。
//   - 生命周期：卸载 / 热禁用时移除样式、标记、监听和主题注册，界面恢复原样。
//
// 无外部字体、图片、网络请求；不依赖 CSS-module 哈希类名。
window.__ModuleLoader__.load({
  id: 'dsh-theme-stripe-style',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const runtime = require('@deepseek-ai/dsh-client-store')

    const PACKAGE = 'dsh-theme-stripe-style'
    const SETTINGS_NS = 'settings.stripe-style'
    const STORAGE_KEY = 'dsh-theme-stripe-style.preference'
    const STYLE_ID = 'dsh-theme-stripe-style/styles'
    const BODY_ATTR = 'data-dsh-stripe-style'
    const DEFAULT_CHOICE = 'default'

    const PAPER_ID = 'stripe-style-light'
    const INK_ID = 'stripe-style-dark'

    // ---------------------------------------------------------------------
    // 设计 token。参考 StyleKit 的 Stripe Style 规范：
    // #635bff 亮紫做主色，#0a2540 藏蓝做正文与深色底，#f6f9fc 做浅色底，
    // 青色 #00d4ff / 亮紫 #7a73ff 做信号色；层次靠多级柔和阴影而不是硬边。
    // 深色版是官方「午夜蓝」：藏蓝底 + 亮紫主色 + 青色链接。
    // 链接色与正文色都经过 WCAG 对比度校验（见 test/theme.test.mjs）。
    // ---------------------------------------------------------------------
    const TOKEN_TABLE = {
      '--dsw-alias-bg-base': ['#f6f9fc', '#0a2540'],
      '--dsw-alias-bg-layer-1': ['#ffffff', '#0d2b47'],
      '--dsw-alias-bg-layer-2': ['#f1f5f9', '#123350'],
      '--dsw-alias-bg-layer-3': ['#e6edf6', '#173c5d'],
      '--dsw-alias-bg-overlay': ['#ffffff', '#0d2b47'],
      '--dsw-alias-bg-module-platform': ['#f6f9fc', '#081e33'],
      '--dsw-alias-bg-multi-select': ['rgba(99,91,255,.14)', 'rgba(122,115,255,.24)'],
      '--dsw-alias-bg-skeleton': ['rgba(10,37,64,.08)', 'rgba(246,249,252,.12)'],
      '--dsw-alias-bg-document-preview': ['#ffffff', '#0d2b47'],
      '--dsw-alias-label-document-preview': ['#0a2540', '#dbe7f3'],
      '--dsw-alias-border-l1': ['#e3e8ee', 'rgba(246,249,252,.12)'],
      '--dsw-alias-border-l2-darkmode-thin': ['#d9e2ec', 'rgba(246,249,252,.16)'],
      '--dsw-alias-border-l2': ['#d9e2ec', 'rgba(246,249,252,.20)'],
      '--dsw-alias-border-l3': ['#c8d5e2', 'rgba(246,249,252,.26)'],
      '--dsw-alias-border-l4': ['#a9bccf', 'rgba(246,249,252,.34)'],
      '--dsw-alias-border-inverted': ['#0a2540', 'rgba(246,249,252,.20)'],
      '--dsw-alias-border-inverted2': ['#0a2540', 'rgba(246,249,252,.20)'],
      '--dsw-alias-brand-primary': ['#635bff', '#7a73ff'],
      '--dsw-alias-brand-primary-invert': ['#ffffff', '#0a2540'],
      '--dsw-alias-brand-text': ['#524ae0', '#9f9aff'],
      '--dsw-alias-button-primary-fill': ['#635bff', '#635bff'],
      '--dsw-alias-button-primary-hover': ['#524ae0', '#7a73ff'],
      '--dsw-alias-button-primary-dimmed': ['#b9b5ff', '#31406a'],
      '--dsw-alias-button-info-fill': ['#00a3c2', '#80e9ff'],
      '--dsw-alias-button-info-hover': ['#008fb0', '#9ff0ff'],
      '--dsw-alias-button-elevated-fill': ['#ffffff', '#123350'],
      '--dsw-alias-button-floating-fill': ['#ffffff', '#16385a'],
      '--dsw-alias-button-floating-hover': ['#f6f9fc', '#1c456b'],
      '--dsw-alias-button-ghost-active-border': ['#635bff', '#9f9aff'],
      '--dsw-alias-button-ghost-active-fill': ['rgba(99,91,255,.10)', 'rgba(122,115,255,.18)'],
      '--dsw-alias-button-ghost-active-hover': ['rgba(99,91,255,.16)', 'rgba(122,115,255,.26)'],
      '--dsw-alias-button-contrast-fill': ['#0a2540', '#f6f9fc'],
      '--dsw-alias-interactive-bg-active': ['rgba(99,91,255,.14)', 'rgba(122,115,255,.24)'],
      '--dsw-alias-interactive-bg-hover-accent': ['rgba(0,212,255,.12)', 'rgba(128,233,255,.18)'],
      '--dsw-alias-interactive-bg-hover-danger': ['rgba(217,45,32,.08)', 'rgba(248,113,113,.16)'],
      '--dsw-alias-interactive-bg-hover-solid': ['#eef2f7', '#1c456b'],
      '--dsw-alias-interactive-bg-hover': ['#f1f5f9', '#123350'],
      '--dsw-alias-label-primary': ['#0a2540', '#f6f9fc'],
      '--dsw-alias-label-primary-bluish': ['#0a2540', '#dbe7f3'],
      '--dsw-alias-label-primary-dimmed': ['#1f3b58', '#e2ecf5'],
      '--dsw-alias-label-primary-foreground': ['#ffffff', '#ffffff'],
      '--dsw-alias-label-primary-inverted': ['#ffffff', '#0a2540'],
      '--dsw-alias-label-secondary': ['#3f566e', '#b9c9da'],
      '--dsw-alias-label-tertiary': ['#52667d', '#93a9bf'],
      '--dsw-alias-label-caption': ['#52667d', '#93a9bf'],
      '--dsw-alias-label-dimmed': ['#64748b', '#8299b0'],
      '--dsw-alias-label-shimmer': ['rgba(10,37,64,.35)', 'rgba(246,249,252,.40)'],
      '--dsw-alias-link': ['#4f46e5', '#80e9ff'],
      '--dsw-alias-menu-icon': ['#0a2540', '#e2ecf5'],
      '--dsw-alias-markdown-code-block': ['#f8fafc', '#061a2e'],
      '--dsw-alias-markdown-code-block-banner': ['#eef3f9', '#0b2440'],
      '--dsw-alias-markdown-inline-code': ['#eef2ff', '#152f4d'],
      '--dsw-alias-markdown-placeholder': ['#f1f5f9', '#123350'],
      '--dsw-alias-markdown-tag': ['#eef2ff', '#1b3a5c'],
      '--dsw-alias-markdown-citation': ['#f1f5f9', '#123350'],
      '--dsw-alias-markdown-code-segment-selected': ['#ffffff', '#123350'],
      '--dsw-alias-markdown-code-segment-unselected': ['#f8fafc', '#0d2b47'],
      '--dsw-alias-scrollbar-bg-l1': ['#d9e2ec', '#1b3a5c'],
      '--dsw-alias-scrollbar-bg-l2': ['#c8d5e2', '#16385a'],
      '--dsw-alias-scrollbar-hover-l1': ['#b3c4d6', '#2a5075'],
      '--dsw-alias-scrollbar-hover-l2': ['#9fb3c8', '#255073'],
      '--dsw-alias-state-business-primary': ['#0a2540', '#80e9ff'],
      '--dsw-alias-state-business-tertiary': ['#eef2ff', '#123350'],
      '--dsw-alias-state-idle-primary': ['#c8d5e2', '#3b5b7a'],
      '--dsw-alias-state-success-primary': ['#0b7a43', '#4ade80'],
      '--dsw-alias-state-success-secondary': ['#16a34a', '#86efac'],
      '--dsw-alias-state-success-tertiary': ['#e7f8ed', '#0f3a28'],
      '--dsw-alias-state-warn-label': ['#9a5b00', '#fbbf24'],
      '--dsw-alias-state-warn-primary': ['#d97706', '#f59e0b'],
      '--dsw-alias-state-warn-secondary': ['#f59e0b', '#fbbf24'],
      '--dsw-alias-state-warn-tertiary': ['#fef3e2', '#3a2a10'],
      '--dsw-alias-state-error-primary': ['#d92d20', '#f87171'],
      '--dsw-alias-state-error-secondary': ['#ef4444', '#fca5a5'],
      '--dsw-alias-code-diff-added': ['rgba(22,163,74,.10)', 'rgba(74,222,128,.14)'],
      '--dsw-alias-code-diff-deleted': ['rgba(217,45,32,.10)', 'rgba(248,113,113,.14)'],
      '--dsw-alias-toast-bg': ['#0a2540', '#f6f9fc'],
      '--dsw-alias-toast-label': ['#f6f9fc', '#0a2540'],
      '--dsw-alias-tooltip-bg': ['#0a2540', '#123350'],
      '--dsw-alias-tooltip-key-bg': ['#1c3a5c', '#24486c'],
      '--dsw-alias-switch-thumb': ['#ffffff', '#7a73ff'],
      '--dsw-alias-turn-trigger-bg': ['#f1f5f9', '#123350'],
      '--dsw-alias-turn-trigger-bg-hover': ['#e6edf6', '#173c5d'],
      '--dsw-focus-ring-color': ['#635bff', '#9f9aff'],
      '--dsw-specific-bubble': ['#eef2ff', '#16385a'],
      '--dsw-specific-bubble-highlight': ['#e3e8ff', '#1c456b'],
      '--dsw-specific-input-major': ['#ffffff', '#0d2b47'],
      '--dsw-specific-login-input': ['#ffffff', '#0d2b47'],
      '--dsw-specific-menu': ['#ffffff', '#0d2b47'],
      '--dsw-specific-selector': ['#ffffff', '#0d2b47'],
      '--dsw-specific-sidebar-fill': ['#fbfcfe', '#081e33'],
      '--dsw-specific-sidebar-nav-item-active-accent': ['rgba(99,91,255,.12)', 'rgba(122,115,255,.22)'],
      '--dsw-specific-sidebar-nav-item-active': ['rgba(99,91,255,.10)', 'rgba(122,115,255,.18)'],
      '--dsw-specific-sidebar-nav-item-hover': ['#f1f5f9', '#123350'],
      '--dsw-specific-tip': ['#eef2ff', '#123350'],
      '--dsw-elevation-stroke-color': ['#d9e2ec', 'rgba(246,249,252,.18)']
    }

    const buildTokens = (index) => {
      const tokens = {}
      for (const [key, values] of Object.entries(TOKEN_TABLE)) tokens[key] = values[index]
      tokens['--dsw-focus-ring-width'] = '3px'
      return tokens
    }

    const PAPER = buildTokens(0)
    const INK = buildTokens(1)

    const THEMES = [
      { id: PAPER_ID, colorScheme: 'light', tokens: PAPER },
      { id: INK_ID, colorScheme: 'dark', tokens: INK }
    ]
    const THEME_IDS = new Set(THEMES.map((theme) => theme.id))
    const SCHEME_OF = new Map(THEMES.map((theme) => [theme.id, theme.colorScheme]))

    // ---------------------------------------------------------------------
    // 文案
    // ---------------------------------------------------------------------
    const zh = {
      title: 'Stripe 紫光主题',
      caption: '40px 紫色网格 + 多级柔和阴影 + 亮紫强调：Stripe 式的克制、层次与专业感。',
      default: '出厂外观',
      'default-hint': '恢复 DSH 内置主题',
      'stripe-style-light': '白昼紫',
      'stripe-style-light-hint': '浅灰网格 · 白卡片 · Stripe 紫',
      'stripe-style-dark': '午夜蓝',
      'stripe-style-dark-hint': '藏蓝底 · 亮紫 · 青色信号',
      auto: '选择即时生效；可随时切回出厂外观。'
    }
    const en = {
      title: 'Stripe Glow theme',
      caption: 'A 40px purple grid, layered soft shadows and Stripe purple accents: the calm, precise feel of a fintech product.',
      default: 'Factory appearance',
      'default-hint': 'Restore the built-in DSH theme',
      'stripe-style-light': 'Daylight Violet',
      'stripe-style-light-hint': 'Light grid · white cards · Stripe purple',
      'stripe-style-dark': 'Midnight Navy',
      'stripe-style-dark-hint': 'Navy canvas · luminous purple · cyan',
      auto: 'Changes apply instantly. Switch back to the factory appearance any time.'
    }

    // ---------------------------------------------------------------------
    // 偏好存储。第三方主题 id 不进 DSH 内置设置 schema，所以额外记一份
    // localStorage：重载后 Host 会先回落内置偏好，这里再把它恢复回来。
    // 'default' 表示用户明确选择过出厂外观，下次加载不再自动套用主题。
    // ---------------------------------------------------------------------
    const readChoice = () => {
      try {
        const value = window.localStorage.getItem(STORAGE_KEY)
        return value === null ? null : value
      } catch (_) {
        return null
      }
    }
    const writeChoice = (value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value)
      } catch (_) {}
    }

    // 用户点内置「浅色 / 深色 / 跟随系统」时，放弃本主题的恢复记录，
    // 避免刷新后插件又把用户手动选的内置外观抢回去。
    const isBuiltinAppearanceChoice = (target) => {
      const button = target && target.closest ? target.closest('button') : null
      if (!button) return false
      if (button.hasAttribute('data-ss-choice')) return false
      const label = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      return ['浅色', '深色', '跟随系统', 'light', 'dark', 'system', 'follow system'].includes(label)
    }

    // ---------------------------------------------------------------------
    // 结构样式。所有规则都以 body[data-dsh-stripe-style] 门控，未启用主题时
    // 这段 CSS 不产生任何效果。选择器只使用 DSH 稳定的语义 hook（data-* / role），
    // 不使用 CSS-module 哈希类名。
    // ---------------------------------------------------------------------
    const CSS = [
      'body[data-dsh-stripe-style] {',
      '  --ss-purple: #635bff;',
      '  --ss-purple-soft: #7a73ff;',
      '  --ss-cyan: #00d4ff;',
      '  --ss-navy: #0a2540;',
      '  --ss-surface: #ffffff;',
      '  --ss-surface-soft: #f6f9fc;',
      '  --ss-line: #e3e8ee;',
      '  --ss-grid: rgba(99,91,255,.09);',
      '  --ss-glow: rgba(99,91,255,.06);',
      '  --ss-shadow-1: 0 2px 4px rgba(0,0,0,.04), 0 8px 16px rgba(0,0,0,.08);',
      '  --ss-shadow-2: 0 4px 8px rgba(0,0,0,.06), 0 16px 32px rgba(0,0,0,.10);',
      '  --ss-shadow-3: 0 24px 60px rgba(10,37,64,.18), 0 0 0 1px rgba(10,37,64,.06);',
      '  --ss-focus: 0 0 0 3px rgba(99,91,255,.32);',
      '  --ss-hero: radial-gradient(1200px 460px at 50% -12%, var(--ss-glow), transparent 72%);',
      '  background-color: var(--dsw-alias-bg-base);',
      '  background-image:',
      '    var(--ss-hero),',
      '    linear-gradient(to right, var(--ss-grid) 1px, transparent 1px),',
      '    linear-gradient(to bottom, var(--ss-grid) 1px, transparent 1px);',
      '  background-size: auto, 40px 40px, 40px 40px;',
      '  background-attachment: fixed, fixed, fixed;',
      '  transition: background-color 240ms ease-out;',
      '}',
      '',
      '/* 网格背景铺满整窗：DSH 的外壳列自带不透明底色，会盖住 body 的网格。',
      '   只在最外层外壳画一层（body 上保留兜底），其余容器只做透明化，',
      '   避免同一张网格叠 3-4 层后变重、以及顶部光晕叠加过饱和。 */',
      'body[data-dsh-stripe-style] [data-rightbar-collapsed] {',
      '  background-color: transparent !important;',
      '  background-image:',
      '    var(--ss-hero),',
      '    linear-gradient(to right, var(--ss-grid) 1px, transparent 1px),',
      '    linear-gradient(to bottom, var(--ss-grid) 1px, transparent 1px) !important;',
      '  background-size: auto, 40px 40px, 40px 40px !important;',
      '  background-attachment: fixed, fixed, fixed !important;',
      '}',
      'body[data-dsh-stripe-style] [data-phase],',
      'body[data-dsh-stripe-style] [data-shell-bottom],',
      'body[data-dsh-stripe-style] [data-conversation-region],',
      'body[data-dsh-stripe-style] div:has(> [data-slot="sidebar"]) {',
      '  background-color: transparent !important;',
      '  background-image: none !important;',
      '}',
      'body[data-dsh-stripe-style="dark"] {',
      '  --ss-purple: #7a73ff;',
      '  --ss-purple-soft: #9f9aff;',
      '  --ss-cyan: #80e9ff;',
      '  --ss-navy: #f6f9fc;',
      '  --ss-surface: #0d2b47;',
      '  --ss-surface-soft: #081e33;',
      '  --ss-line: rgba(246,249,252,.14);',
      '  --ss-grid: rgba(122,115,255,.13);',
      '  --ss-glow: rgba(122,115,255,.09);',
      '  --ss-shadow-1: 0 2px 4px rgba(0,0,0,.20), 0 10px 24px rgba(0,0,0,.28);',
      '  --ss-shadow-2: 0 6px 12px rgba(0,0,0,.26), 0 20px 40px rgba(0,0,0,.36);',
      '  --ss-shadow-3: 0 28px 64px rgba(0,0,0,.48), 0 0 0 1px rgba(246,249,252,.08);',
      '  --ss-focus: 0 0 0 3px rgba(159,154,255,.36);',
      '}',
      '',
      '/* 签名元素 1：侧栏用半透明表面让网格透出来，右侧只留 1px 细线。',
      '   [data-slot="sidebar"] 是 display:contents 的槽位，真正的侧栏盒子是它的子元素。 */',
      'body[data-dsh-stripe-style] [data-slot="sidebar"] > div {',
      '  background-color: var(--ss-surface);',
      '  background-image:',
      '    linear-gradient(to right, var(--ss-grid) 1px, transparent 1px),',
      '    linear-gradient(to bottom, var(--ss-grid) 1px, transparent 1px);',
      '  background-size: 40px 40px, 40px 40px;',
      '  background-attachment: fixed, fixed;',
      '  border-inline-end: 1px solid var(--ss-line);',
      '}',
      'body[data-dsh-stripe-style] [data-slot="sidebar"] nav button {',
      '  border-radius: 8px;',
      '  transition: background-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out;',
      '}',
      '@media (hover: hover) {',
      '  body[data-dsh-stripe-style] [data-slot="sidebar"] nav button:hover:not(:disabled) {',
      '    background-color: var(--dsw-specific-sidebar-nav-item-hover) !important;',
      '  }',
      '  body[data-dsh-stripe-style] [data-slot="sidebar"] [aria-current="page"]:hover,',
      '  body[data-dsh-stripe-style] [data-slot="sidebar"] [data-active="true"]:hover {',
      '    background-color: var(--dsw-specific-sidebar-nav-item-active) !important;',
      '    color: var(--ss-purple) !important;',
      '  }',
      '}',
      'body[data-dsh-stripe-style] [data-slot="sidebar"] [aria-current="page"],',
      'body[data-dsh-stripe-style] [data-slot="sidebar"] [data-active="true"] {',
      '  background-color: var(--dsw-specific-sidebar-nav-item-active);',
      '  color: var(--ss-purple);',
      '  box-shadow: inset 0 0 0 1px rgba(99,91,255,.18);',
      '}',
      '',
      '/* 签名元素 2：输入区是一张 12px 圆角的白色浮卡，顶部 2px 紫→青渐变高光；',
      '   聚焦时紫色扩散环 + 更强的双层阴影。 */',
      'body[data-dsh-stripe-style] [data-composer-card] {',
      '  position: relative;',
      '  border: 1px solid var(--ss-line) !important;',
      '  border-radius: 12px !important;',
      '  background-color: var(--ss-surface) !important;',
      '  box-shadow: var(--ss-shadow-1) !important;',
      '  transition: box-shadow 260ms ease-out, border-color 200ms ease-out, transform 200ms ease-out;',
      '}',
      'body[data-dsh-stripe-style] [data-composer-card]::before {',
      '  content: "";',
      '  position: absolute;',
      '  inset: 0 14px auto 14px;',
      '  height: 2px;',
      '  border-radius: 2px;',
      '  background: linear-gradient(90deg, var(--ss-purple), var(--ss-cyan));',
      '  opacity: .9;',
      '  pointer-events: none;',
      '}',
      'body[data-dsh-stripe-style] [data-composer-card]:focus-within {',
      '  border-color: rgba(99,91,255,.45) !important;',
      '  box-shadow: var(--ss-focus), 0 12px 28px rgba(10,37,64,.10) !important;',
      '}',
      '@media (hover: hover) {',
      '  body[data-dsh-stripe-style] [data-composer-card]:hover { box-shadow: var(--ss-shadow-2) !important; }',
      '  body[data-dsh-stripe-style] [data-composer-card]:focus-within:hover {',
      '    box-shadow: var(--ss-focus), 0 16px 34px rgba(10,37,64,.12) !important;',
      '  }',
      '}',
      '',
      '/* 中圆角：按钮 / 输入 / 弹层这类交互表面 */',
      'body[data-dsh-stripe-style] button,',
      'body[data-dsh-stripe-style] [role="button"],',
      'body[data-dsh-stripe-style] input,',
      'body[data-dsh-stripe-style] textarea,',
      'body[data-dsh-stripe-style] select,',
      'body[data-dsh-stripe-style] [role="dialog"],',
      'body[data-dsh-stripe-style] [role="menu"],',
      'body[data-dsh-stripe-style] [role="listbox"] { border-radius: 8px !important; }',
      '',
      '/* 弹层：12–14px 圆角 + 悬浮大阴影 */',
      'body[data-dsh-stripe-style] [role="dialog"] {',
      '  border-radius: 14px !important;',
      '  border: 1px solid var(--ss-line) !important;',
      '  background-color: var(--ss-surface) !important;',
      '  box-shadow: var(--ss-shadow-3) !important;',
      '}',
      'body[data-dsh-stripe-style] [role="menu"],',
      'body[data-dsh-stripe-style] [role="listbox"] {',
      '  border-radius: 10px !important;',
      '  border: 1px solid var(--ss-line) !important;',
      '  background-color: var(--ss-surface) !important;',
      '  box-shadow: var(--ss-shadow-2) !important;',
      '}',
      '',
      '/* 卡片层级：工具卡 / 排队条 / Todo / Goal 条统一 12px 圆角 + 双层阴影 */',
      'body[data-dsh-stripe-style] [data-tool],',
      'body[data-dsh-stripe-style] [data-variant="think"] {',
      '  border: 1px solid var(--ss-line) !important;',
      '  border-radius: 12px !important;',
      '  background-color: var(--ss-surface) !important;',
      '  box-shadow: var(--ss-shadow-1) !important;',
      '  transition: box-shadow 300ms ease-out, transform 300ms ease-out, border-color 200ms ease-out;',
      '}',
      '@media (hover: hover) {',
      '  body[data-dsh-stripe-style] [data-tool]:hover {',
      '    transform: translateY(-2px);',
      '    box-shadow: var(--ss-shadow-2) !important;',
      '    border-color: rgba(99,91,255,.30) !important;',
      '  }',
      '}',
      'body[data-dsh-stripe-style] [data-tool][data-state="running"],',
      'body[data-dsh-stripe-style] [data-tool][data-state="ongoing"] { border-color: rgba(0,212,255,.45) !important; }',
      'body[data-dsh-stripe-style] [data-tool][data-state="ok"] { border-color: rgba(22,163,74,.35) !important; }',
      'body[data-dsh-stripe-style] [data-tool][data-state="error"] { border-color: rgba(217,45,32,.40) !important; }',
      'body[data-dsh-stripe-style] [data-queue-dock] > * {',
      '  border: 1px solid var(--ss-line) !important;',
      '  border-radius: 12px !important;',
      '  background-color: var(--ss-surface) !important;',
      '  box-shadow: var(--ss-shadow-1) !important;',
      '}',
      'body[data-dsh-stripe-style] [data-goal-bar] > * {',
      '  border: 0 !important;',
      '  border-radius: 12px !important;',
      '  background: linear-gradient(96deg, #635bff, #524ae0) !important;',
      '  color: #ffffff !important;',
      '  box-shadow: 0 6px 16px rgba(99,91,255,.28), inset 0 1px 0 rgba(255,255,255,.20) !important;',
      '}',
      'body[data-dsh-stripe-style] [data-goal-bar] > * * { color: #ffffff !important; }',
      'body[data-dsh-stripe-style] [data-testid="todo-panel"] {',
      '  border: 1px solid var(--ss-line) !important;',
      '  border-radius: 12px !important;',
      '  background-color: var(--ss-surface) !important;',
      '  box-shadow: var(--ss-shadow-1) !important;',
      '}',
      '',
      '/* 会话正文：保持安静。代码块用 10px 圆角浅色卡（浅色主题）或深蓝卡（深色主题），',
      '   不叠加第二道边框；表格保持原生分隔线。 */',
      'body[data-dsh-stripe-style] [data-code-wrap] {',
      '  border: 1px solid var(--ss-line) !important;',
      '  border-radius: 10px !important;',
      '  box-shadow: none !important;',
      '  overflow: hidden;',
      '}',
      'body[data-dsh-stripe-style] [data-code-wrap] pre {',
      '  border: 0 !important;',
      '  border-radius: 0 !important;',
      '  box-shadow: none !important;',
      '}',
      'body[data-dsh-stripe-style] [data-conversation-region="chat"] h1,',
      'body[data-dsh-stripe-style] [data-conversation-region="chat"] h2,',
      'body[data-dsh-stripe-style] [data-conversation-region="chat"] h3,',
      'body[data-dsh-stripe-style] [data-conversation-region="chat"] h4 {',
      '  font-weight: 600 !important;',
      '  letter-spacing: -0.015em;',
      '  color: var(--dsw-alias-label-primary);',
      '}',
      '',
      '/* 签名元素 3：发送按钮——紫色填充 + 内嵌高光 + 紫色投影；',
      '   hover 上浮 1px，按下时物理下压（scale .98 + inset 阴形）。 */',
      'body[data-dsh-stripe-style] button[aria-label="发送消息"],',
      'body[data-dsh-stripe-style] button[aria-label="Send message"] {',
      '  border-radius: 8px !important;',
      '  background: var(--ss-purple) !important;',
      '  color: #ffffff !important;',
      '  border: 0 !important;',
      '  box-shadow: 0 2px 4px rgba(99,91,255,.24), 0 4px 8px rgba(99,91,255,.20), inset 0 1px 0 rgba(255,255,255,.20) !important;',
      '  transition: transform 200ms ease-out, box-shadow 200ms ease-out, background-color 200ms ease-out;',
      '}',
      '@media (hover: hover) {',
      '  body[data-dsh-stripe-style] button[aria-label="发送消息"]:hover:not(:disabled),',
      '  body[data-dsh-stripe-style] button[aria-label="Send message"]:hover:not(:disabled) {',
      '    transform: translateY(-1px);',
      '    box-shadow: 0 4px 8px rgba(99,91,255,.30), 0 8px 16px rgba(99,91,255,.20), inset 0 1px 0 rgba(255,255,255,.24) !important;',
      '  }',
      '}',
      'body[data-dsh-stripe-style] button[aria-label="发送消息"]:active:not(:disabled),',
      'body[data-dsh-stripe-style] button[aria-label="Send message"]:active:not(:disabled) {',
      '  transform: scale(.98) !important;',
      '  box-shadow: inset 0 2px 4px rgba(0,0,0,.24) !important;',
      '}',
      '',
      '/* 键盘焦点：3px 紫色环 */',
      'body[data-dsh-stripe-style] :focus-visible {',
      '  outline: 3px solid rgba(99,91,255,.45) !important;',
      '  outline-offset: 2px !important;',
      '}',
      '',
      '/* reduced motion：只压缩本主题的过渡，不覆盖 animation，',
      '   否则会把加载/输入中的无限动画一起冻住。 */',
      '@media (prefers-reduced-motion: reduce) {',
      '  body[data-dsh-stripe-style] *,',
      '  body[data-dsh-stripe-style] *::before,',
      '  body[data-dsh-stripe-style] *::after {',
      '    transition-duration: 0.001ms !important;',
      '    scroll-behavior: auto !important;',
      '  }',
      '}',
      '',
      '/* 小屏：收窄阴影与圆角，避免弹层阴影被视口裁切 */',
      '@media (max-width: 760px) {',
      '  body[data-dsh-stripe-style] [role="dialog"] {',
      '    border-radius: 12px !important;',
      '    box-shadow: 0 14px 36px rgba(10,37,64,.22), 0 0 0 1px rgba(10,37,64,.06) !important;',
      '  }',
      '  body[data-dsh-stripe-style] [data-composer-card] { box-shadow: var(--ss-shadow-1) !important; }',
      '}'
    ].join('\n')

    // ---------------------------------------------------------------------
    // 设置行
    // ---------------------------------------------------------------------
    const createStore = () => runtime.defineStore({
      init: () => ({ choice: DEFAULT_CHOICE, revision: -1 }),
      actions: {
        sync: (draft, choice, revision) => {
          if (revision > draft.revision) {
            draft.choice = choice
            draft.revision = revision
          }
        }
      }
    })

    const rowStyle = {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '16px 0',
        borderBottom: '1px solid var(--dsw-alias-border-l2)'
      },
      title: { color: 'var(--dsw-alias-label-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' },
      caption: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, lineHeight: '18px' },
      choices: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 2 },
      button: {
        width: 164,
        padding: 8,
        border: '1px solid var(--dsw-alias-border-l3)',
        borderRadius: 12,
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'left',
        boxShadow: '0 2px 4px rgba(0,0,0,.04), 0 8px 16px rgba(0,0,0,.06)',
        transition: 'box-shadow 240ms ease-out, transform 240ms ease-out, border-color 200ms ease-out'
      },
      selected: {
        borderColor: 'var(--dsw-alias-brand-primary)',
        transform: 'translateY(-2px)',
        boxShadow: '0 0 0 3px rgba(99,91,255,.18), 0 12px 24px rgba(10,37,64,.12)'
      },
      swatch: {
        height: 30,
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        overflow: 'hidden',
        marginBottom: 8,
        borderRadius: 8,
        background: 'var(--dsw-alias-bg-layer-1)'
      },
      label: { fontSize: 12, fontWeight: 600, display: 'block' },
      hint: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', display: 'block', marginTop: 2, lineHeight: '15px' },
      auto: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 2 }
    }

    function Choice({ id, active, label, hint, colors, onPick }) {
      return React.createElement('button', {
        type: 'button',
        'data-ss-choice': id,
        'aria-pressed': active,
        onClick: () => onPick(id),
        style: active ? { ...rowStyle.button, ...rowStyle.selected } : rowStyle.button
      },
        React.createElement('span', { style: rowStyle.swatch },
          ...colors.map((color, index) => React.createElement('i', { key: index, style: { background: color } }))),
        React.createElement('span', { style: rowStyle.label }, label),
        React.createElement('span', { style: rowStyle.hint }, hint))
    }

    function ThemeRow({ t, onPick, useStore }) {
      const choice = useStore((state) => state.choice)
      const current = choice === DEFAULT_CHOICE || THEME_IDS.has(choice) ? choice : DEFAULT_CHOICE
      return React.createElement('div', { style: rowStyle.root },
        React.createElement('div', { style: rowStyle.title }, t('title')),
        React.createElement('div', { style: rowStyle.caption }, t('caption')),
        React.createElement('div', { style: rowStyle.choices },
          React.createElement(Choice, {
            id: DEFAULT_CHOICE,
            active: current === DEFAULT_CHOICE,
            label: t('default'),
            hint: t('default-hint'),
            colors: ['#ffffff', '#e3e8ee', '#0a2540'],
            onPick
          }),
          React.createElement(Choice, {
            id: PAPER_ID,
            active: current === PAPER_ID,
            label: t('stripe-style-light'),
            hint: t('stripe-style-light-hint'),
            colors: ['#f6f9fc', '#635bff', '#00d4ff'],
            onPick
          }),
          React.createElement(Choice, {
            id: INK_ID,
            active: current === INK_ID,
            label: t('stripe-style-dark'),
            hint: t('stripe-style-dark-hint'),
            colors: ['#0a2540', '#7a73ff', '#80e9ff'],
            onPick
          })),
        React.createElement('div', { style: rowStyle.auto }, t('auto')))
    }

    const inject = ['slots', 'locale', 'theme']

    function apply(ctx) {
      // 1. 注册两套主题；立刻挂 disposer，后续任何步骤抛错也不会泄漏。
      const themeDisposers = THEMES.map((definition) => ctx.theme.register(definition))
      ctx.effect(() => () => {
        for (const dispose of themeDisposers) {
          try { dispose() } catch (_) {}
        }
      }, 'stripe-style: theme registrations')

      // 2. 插件自有样式表，卸载即移除。
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.plugin = PACKAGE
      style.textContent = CSS
      document.head.append(style)
      ctx.effect(() => () => {
        if (style.isConnected) style.remove()
      }, 'stripe-style: stylesheet')

      // 3. 把当前主题映射到 body 标记；只有标记存在时结构样式才生效。
      //    第三方主题 id 不进 Host 的 durable schema（setTheme 只改内存），所以
      //    Host 每次 adopt 设置区间都会回落内置 appearance；这里做一次静默恢复。
      let lastPreference = ctx.theme.getTheme().preference
      let silentPreference = null
      let recoveryGeneration = 0
      const sync = (snapshot) => {
        const preference = snapshot.preference
        if (THEME_IDS.has(preference)) {
          lastPreference = preference
          document.body.setAttribute(BODY_ATTR, preference === INK_ID ? 'dark' : 'light')
          if (preference === silentPreference) silentPreference = null
          return
        }
        document.body.removeAttribute(BODY_ATTR)
        const previous = lastPreference
        lastPreference = preference
        const saved = readChoice()
        // 只恢复「用户自己选的插件主题」：点内置外观会先把 choice 写成 default，
        // 因此不会在这里抢回控制权。
        if (THEME_IDS.has(previous) && saved === previous) {
          const ticket = ++recoveryGeneration
          Promise.resolve().then(() => {
            if (ticket !== recoveryGeneration) return
            if (readChoice() !== previous) return
            if (THEME_IDS.has(ctx.theme.getTheme().preference)) return
            silentPreference = previous
            ctx.theme.setTheme(previous)
          })
        }
      }
      ctx.effect(() => () => {
        recoveryGeneration += 1
        silentPreference = null
        document.body.removeAttribute(BODY_ATTR)
      }, 'stripe-style: body marker')

      // 4. 用户点内置外观时清掉恢复记录。
      const onDocumentClick = (event) => {
        if (isBuiltinAppearanceChoice(event.target)) {
          writeChoice(DEFAULT_CHOICE)
        }
      }
      document.addEventListener('click', onDocumentClick, true)

      ctx.effect(() => () => {
        document.removeEventListener('click', onDocumentClick, true)
      }, 'stripe-style: built-in appearance intent')

      // 5. 跟随主题变化维护 body 标记与恢复。
      ctx.effect(() => ctx.on('theme/change', sync), 'stripe-style: body marker')

      // 6. 重载 / 首次安装后的恢复。
      //    老用户的选择已经在 localStorage 里，先同步应用一次，避免每次刷新
      //    都先看到 400ms 的出厂配色；Host 设置异步落地后由第 5 步兜底。
      const savedAtBoot = readChoice()
      if (savedAtBoot !== null && savedAtBoot !== DEFAULT_CHOICE && THEME_IDS.has(savedAtBoot)
        && ctx.theme.getTheme().preference !== savedAtBoot) {
        ctx.theme.setTheme(savedAtBoot)
      }
      const restore = () => {
        const snapshot = ctx.theme.getTheme()
        const choice = readChoice() // 重新读：等待期间用户可能已经点过
        if (choice === null) {
          // 首次安装自动套用：跟随用户当前系统/内置外观的明暗选版本。
          if (THEME_IDS.has(snapshot.preference)) return
          const target = snapshot.active && snapshot.active.colorScheme === 'dark' ? INK_ID : PAPER_ID
          writeChoice(target)
          ctx.theme.setTheme(target)
          return
        }
        if (choice !== DEFAULT_CHOICE && THEME_IDS.has(choice) && snapshot.preference !== choice) {
          ctx.theme.setTheme(choice)
        }
      }
      const restoreTimer = window.setTimeout(restore, 400)
      ctx.effect(() => () => {
        window.clearTimeout(restoreTimer)
      }, 'stripe-style: preference restore timer')

      // 7. 设置行：每次打开 Settings 都能看到当前选择。
      const store = createStore()
      let bound
      ctx.effect(() => ctx.on('theme/change', (snapshot) => {
        if (bound) bound.sync(snapshot.preference, snapshot.revision)
      }), 'stripe-style: settings store sync')

      const pick = (id) => {
        if (id === DEFAULT_CHOICE) {
          writeChoice(DEFAULT_CHOICE)
          ctx.theme.setTheme('system')
          return
        }
        if (!THEME_IDS.has(id)) return
        writeChoice(id)
        ctx.theme.setTheme(id)
      }

      sync(ctx.theme.getTheme())
      ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'stripe-style: locale')
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'dsh-theme-stripe-style',
        order: 20,
        store,
        locale: SETTINGS_NS,
        inject: (actions) => {
          bound = actions
          const snapshot = ctx.theme.getTheme()
          actions.sync(snapshot.preference, snapshot.revision)
          return { onPick: pick }
        }
      }, ThemeRow))
    }

    module.exports = {
      PAPER_ID,
      INK_ID,
      THEMES,
      PAPER,
      INK,
      CSS,
      inject,
      apply
    }
    return module.exports
  }
})
