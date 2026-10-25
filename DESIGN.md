# Stripe Style 设计系统

参考 [StyleKit — Stripe Style](https://www.stylekit.top/styles/stripe-style/showcase)。核心原则：**网格建立秩序，阴影建立层次，紫色只做强调**。本主题把它翻译成 DSH 的设计 token 与稳定 DOM hook，不改对话正文的排版。

## 方向

> Grid first, glow second, content always. 网格铺底、光晕点睛、内容优先。

- **背景**：全窗 40px 紫色细网格 + 顶部径向紫色光晕，把空状态和长对话都放进同一张「画布」。
- **表面**：侧栏、输入区、弹层、工具卡、代码块用不透明表面浮在网格上，靠 1px 描边 + 两层级联阴影分层，不用粗边、不用玻璃拟态。
- **强调**：`#635bff` 只出现在主按钮、选中态、焦点环、Goal 条、渐变顶线；其余全部是中性色。
- **阅读区**：Markdown 正文、字号、行宽保持 DSH 原样；浅色版代码块维持浅底，深色版维持深底。

## 配色

| 角色 | 浅色（白昼紫） | 深色（午夜蓝） | 用途 |
| --- | --- | --- | --- |
| Canvas | `#f6f9fc` | `#0a2540` | 页面底色 / 网格底 |
| Surface | `#ffffff` | `#0d2b47` | 卡片、弹层、输入区 |
| Surface soft | `#f6f9fc` | `#081e33` | 次级面板 |
| Border | `#e3e8ee` | `rgba(246,249,252,.14)` | 1px 描边、分隔线 |
| Primary | `#635bff` | `#7a73ff` | 主按钮、选中、焦点 |
| Primary hover | `#524ae0` | `#7a73ff` | hover |
| Cyan accent | `#00d4ff` | `#80e9ff` | 渐变线尾端、运行中/信息 |
| Text primary | `#0a2540` | `#f6f9fc` | 标题、正文强调 |
| Text secondary | `#3f566e` | `#b9c9da` | 说明、次要信息 |
| Link | `#4f46e5` | `#80e9ff` | 链接（对比度 ≥ 4.5:1） |
| Focus ring | `#635bff` | `#9f9aff` | 3px 焦点环 |

阴影（浅色）：

- 卡片：`0 2px 4px rgba(0,0,0,.04), 0 8px 16px rgba(0,0,0,.08)`
- hover：`0 4px 8px rgba(0,0,0,.06), 0 16px 32px rgba(0,0,0,.10)`
- 弹层：`0 24px 60px rgba(10,37,64,.18), 0 0 0 1px rgba(10,37,64,.06)`
- 按钮：`0 2px 4px rgba(99,91,255,.2), 0 4px 8px rgba(99,91,255,.2)` + `inset 0 1px 0 rgba(255,255,255,.2)`
- 焦点环：`0 0 0 3px rgba(99,91,255,.32)`

深色版阴影压到黑色 20%–48%，用透明度而不是更亮的描边来保持「午夜」的安静。

所有颜色只通过 DSH 真实存在的 `--dsw-alias-*` / `--dsw-specific-*` / `--dsw-focus-ring-*` token 覆盖，经 `ctx.theme.register()` 注册，由官方 presenter 写到 `body` 上。

## 字体与排版

- 不替换 DSH 的字体栈（避免中文回退和阅读习惯变化）。
- 标题沿用 DSH 的 semibold；不引入 Inter/Roboto/Geist 等外部字体。
- 网格与光晕只出现在背景层，不进入正文容器。

## 结构

| 尺寸 | 值 |
| --- | --- |
| 网格 | 40px；浅色 `rgba(99,91,255,.09)`，深色 `rgba(122,115,255,.13)` |
| 顶部光晕 | `radial-gradient(1200px 460px at 50% -12%, ...)`，浅 .06 / 深 .09 |
| 圆角 | 卡片 / 输入区 12px；按钮 / 输入 / 菜单 8px；弹层 14px；代码块 10px |
| 描边 | 1px；输入区顶部 2px 紫→青渐变线 |
| 过渡 | 200–300ms `ease-out`；hover 上浮 2px；active `scale(.98)`；`prefers-reduced-motion` 下 0.001ms |

### 稳定选择器

只使用 DSH 的语义 hook：

- `[data-composer-card]`、`[data-composer-input]`
- `[data-conversation-region="chat"|"composer"]`、`[data-slot="conversation.chat.flow"]`
- `[data-slot="sidebar"] > div`（`data-slot` 是 `display:contents` 槽位，真正的侧栏盒子是子元素）
- `[data-phase]`、`[data-rightbar-collapsed]`、`[data-shell-bottom]`（外壳容器；网格只在外壳画一层，其余容器透明化，避免叠层变重）
- `[data-tool][data-state]`、`[data-goal-bar]`、`[data-queue-dock]`、`[data-testid="todo-panel"]`、`[data-code-wrap]`
- `[role="dialog"|"menu"|"listbox"]`
- `button[aria-label="发送消息"]`

刻意不使用的：`PIRFFq_*`、`kB3qhq_*`、`kiGsTW_*` 等 CSS-module 哈希类名。

## 签名元素

1. **紫色网格画布**：全窗 40px 网格 + 顶部径向光晕；侧栏与外壳分别只画一层，避免同一张网格叠 3–4 层后变重。
2. **浮卡**：输入区是 12px 圆角白卡，顶部 2px 紫→青渐变线，常驻双层阴影；聚焦时换 3px 紫环 + 更深阴影。
3. **微动效**：卡片 hover 上浮 2px、阴影加深；按钮 hover 上浮 1px；按下 `scale(.98)` + 内阴影，模拟「按下去一点」。
4. **设置行主题卡**：三张预览卡（出厂 / 白昼紫 / 午夜蓝），选中时 3px 紫环 + 上浮 2px。

## 动效

- 只做交互反馈，不做入场动画/粒子/流光。
- 200–300ms `ease-out` 完成阴影、位移、颜色切换；禁止 `ease-in-out` 与 `hover:scale`。
- 遵循 `prefers-reduced-motion: reduce`：只把本主题的 transition 压到瞬时，不覆盖 animation，避免把加载/输入中的无限动画一起冻住。

## 可访问性

- 正文/次要文字/链接/主按钮的 WCAG 对比度在 `test/theme.test.mjs` 中自动校验。
- 键盘焦点统一 3px 紫色描边，深色版用 `#9f9aff`。
- 不改变点击区域尺寸；`box-shadow` / `translateY` 不参与布局，不会造成内容位移。

## 边界

- 不覆盖聊天气泡、Markdown 根节点、工具卡内部等哈希类名结构。
- 不把 `#635bff` 用作正文/长文本颜色，只用于强调与状态。
- 不写死颜色到组件内联样式（设置行预览除外，预览需要在不启用的状态下也能显示两种配色）。
