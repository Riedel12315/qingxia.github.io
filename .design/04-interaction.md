# 交互与动效规范 · Interaction & Motion

> 目标：让页面「有回应」但不「有表演感」。所有动效只服务于两件事——确认交互、引导阅读。

## 1. 设计原则

| 原则 | 具体约束 |
|---|---|
| 只做两种动效 | ① 交互确认（hover / press / focus）；② 一次性阅读引导（进入视口时轻微浮现）。**不做循环装饰**：无背景粒子、无持续脉冲、无自动轮播 |
| 只动「不触发重排」的属性 | `opacity`、`translateY(≤10px)`、`color`、`background-color`、`border-color`。绝不改宽高、margin、position |
| 位移上限 10px、缩放为 0 | 卡片 hover **不放大、不上浮、不加阴影**——这是「塑料感」的主要来源 |
| 时长三档、统一缓动 | `140ms`（颜色）/ `200ms`（下划线展开）/ `280ms`（浮现）；缓动 `cubic-bezier(.22,.61,.36,1)`，自然减速、无回弹 |
| 只跑一次 | 滚动浮现用 `IntersectionObserver`，进入后 `unobserve`，不重复播放 |
| 全量降级 | `prefers-reduced-motion: reduce` 下所有过渡归零、浮现不初始化；无 JS / 无 IO 时页面完全可见 |

## 2. 每处改动与设计考量

### 2.1 顶部导航：当前态下划线「从中心生长」
- **文件**：`_sass/_navigation.scss`、`_sass/_motion.scss`
- **改动**：原本只有当前页有静态 2px 下划线。现在把下划线改为 `::after` 伪元素，默认 `scaleX(0)`，hover / 键盘聚焦 / 当前页时 `scaleX(1)`，`transform-origin:center`，200ms。
- **考量**：下划线是纸面风格里最自然的「位置指示器」，从中间展开比从左滑入更安静；`::after` 不占布局，导航高度完全不变。站点名（第一项）不加，避免标题被误认为可点条目。

### 2.2 按钮：1px 按压位移
- **文件**：`_sass/_motion.scss`（`.btn:active`）
- **改动**：按下时 `translateY(1px)`，140ms；hover 的底色/描边变化沿用主题既有规则。
- **考量**：1px 是「按下去」的最小可感知量，配合颜色加深形成触感；不加阴影、不加缩放。仅 `:active`，hover 不位移，避免鼠标划过时元素抖动。

### 2.3 正文链接：下划线「变实」
- **文件**：`_sass/_motion.scss`
- **改动**：`text-decoration-color` 从 60% 青蓝过渡到 100%（hover/focus），140ms，同时保留颜色变化。
- **考量**：学术页面里链接靠下划线识别（WCAG 1.4.1），让下划线「变实」比让文字变色更符合阅读直觉，也不会造成整段文字闪动。

### 2.4 条目行：1px 分隔线「变青蓝」
- **文件**：`_sass/_motion.scss`
- **改动**：论文条目 `.archive__item`、`.archive` / `.page__content` 的顶级列表项，hover 时 `border-bottom-color` 从 `#E3E6E2` 过渡到 `#14566B`，140ms；论文条目同时保留极淡底色 `#F3F4F1`。
- **考量**：纸面风格没有卡片阴影，分隔线就是「行」的边界。让边界变强调色是最克制的可交互信号——不位移、不放大、不加光晕，阅读时不会被打断。

### 2.5 表格与折叠标题：同色系过渡
- **文件**：`_sass/_motion.scss`
- **改动**：`tbody td` 的背景、`<summary>` 的文字与下划线加 140ms 颜色过渡。
- **考量**：这两处原本是「瞬间跳变」，在浅色底上会显得生硬；统一到同一时长后，整页的反馈节奏一致。

### 2.6 滚动浮现（唯一的「入场动效」）
- **文件**：`assets/js/motion.js`、`_sass/_motion.scss`、`_includes/scripts.html`
- **改动**：`IntersectionObserver` 观察 `.page__content > h2`、`.archive__subtitle`、`.archive__item`、`.sim-item`。元素进入视口时从 `opacity:0 + translateY(10px)` 过渡到 `opacity:1 + translateY(0)`，280ms；同组兄弟最多错峰 5×30ms。
- **关键实现细节（防闪烁）**：JS 先给元素打 `data-reveal`，把**已经在视口内**的元素直接标为可见，**最后**才给 `<html>` 加 `motion-ready`。这样首屏元素从不被隐藏，只有视口下方的元素在用户看不到时进入待浮现状态，不会出现「先显示再消失」的闪烁。
- **考量**：滚动浮现只用于「章节标题」和「结果条目」，让长页面在滚动时有轻微的层次感；位移 10px、时长 280ms，不足以让人注意到「动画」，只会觉得页面「跟手」。`<details>` 折叠区内的元素被显式排除，避免展开时内容再次闪动。

## 3. 明确「不做」的清单（防廉价感）

- 不做鼠标跟随光斑、卡片 3D 倾斜、图片 hover 放大、阴影加深。
- 不做数字滚动、打字机、粒子、视差。
- 不做循环动画（`animation-iteration-count: infinite` 仍为 0）。
- 不做页面切换过渡、加载骨架屏。
- 不给头像、Logo 加动效。

## 4. 性能与可访问性

| 项 | 结果 |
|---|---|
| 新增 JS | `assets/js/motion.js` ≈ 2.1 KB（未压缩），`defer`，仅一次 IO，无 rAF 循环 |
| 新增 CSS | `_sass/_motion.scss` 并入 `main.css`，约 +1.9 KB（gzip 前） |
| 重排 / 重绘 | 动效仅涉及 `opacity / transform / color / background-color / border-color`，不触发布局 |
| 减少动效 | `@media (prefers-reduced-motion: no-preference)` 包裹浮现规则；`_animations.scss` 的 reduce 兜底将全部过渡归零 |
| 无 JS | 不添加 `data-reveal`，页面 100% 可见 |
| 键盘 | 导航下划线响应 `:focus-visible`；焦点环契约不变 |

## 5. 可调参数

| 想要 | 改哪里 |
|---|---|
| 浮现更慢/更快 | `_motion.scss` 的 `--dur-reveal`（默认 280ms） |
| 位移更小/更大 | `[data-reveal]` 的 `translateY(10px)` |
| 错峰更长 | `motion.js` 里 `step * 30` |
| 下划线展开更快 | `--dur-base`（默认 200ms） |
| 完全关闭浮现 | 删除 `_includes/scripts.html` 的 `motion.js` 引用即可，其余 hover 反馈不受影响 |

## 6. 导航放大镜（2026-11-13 追加）

**需求**：参考 DeepSeek 官网，鼠标在顶部导航项上移动时出现跟随光标的圆形放大镜。

**实现**：`assets/js/nav-lens.js` + `_motion.scss` §6。

| 项 | 取值 | 考量 |
|---|---|---|
| 触发条件 | `(hover: hover) and (pointer: fine)` 且非 reduced-motion | 触屏没有「悬停」语义，启用只会变成误触；减少动效下这是纯装饰，直接不初始化 |
| 镜片半径 | 23px（直径 46px） | 约等于一行导航文字的高度，能容纳 2–3 个放大字符，不会盖住相邻菜单项 |
| 放大倍率 | 1.7× | DeepSeek 量级；导航字号 14px → 视觉约 24px，可读但不夸张 |
| 镜片底色 | `--c-surface`（#FFFFFF，与 masthead 同色） | 只让「字变大」，不出现色块；避免在纸白底上多一个圆盘 |
| 镜片边界 | 1px `rgba(20,86,107,.3)` | 给透镜一个可感知的光学边缘，但不用阴影/发光 |
| 对齐方式 | 复制导航文字，以光标为 `transform-origin` 做 `scale()` | 缩放中心落在光标处，光标下的字符不动、周围文字放大，才是「透镜」而不是「局部换字号」 |
| 性能 | `pointermove` 经 `requestAnimationFrame` 合并，只写两个 CSS 变量 + `transform-origin` | 高频移动时每帧最多一次写操作；无 canvas、无重排 |
| 可访问性 | 镜片 `aria-hidden="true"`，不复制链接语义 | 屏幕阅读器只读一次菜单文字；纯视觉装饰 |
| 字体就绪 | `document.fonts.ready` 后丢弃缓存的镜片 | Web 字体替换会改变文字宽度，重测一次保证放大文字与底层严格对齐 |

**不做**：镜片内不做反色/高光、不做圆形阴影、不做跟随缓动（延迟会让透镜「飘」）、不做缩放动画（直接 1.7×，避免鼠标移动时字符持续变形）。

**关闭方式**：删除 `_includes/scripts.html` 里的 `nav-lens.js` 引用，导航恢复为普通 hover；CSS 规则留着也不会生效（没有 `.nav-lens` 元素）。
