# 视觉方向规范 v1 · Qing Xia / 夏青 学术个人主页

> **变更提示（2026-11-08）**：用户后续决定恢复「鼠标搅动的粘稠流体背景」，采用浅色极淡基调、全站统一。该决策**覆盖**本文件 §1 原则 3 与 §7.1 #1 中「首屏零持续动画 / 删除 `assets/js/liquid-bg.js` / WebGL 上下文数 0」的条款；具体约束与真实浏览器验证见 [03-liquid-backdrop.md](03-liquid-backdrop.md)。其余视觉规范不变。

> 交付阶段：Phase 1（视觉方向）
> 适用仓库：`Riedel12315/qingxia.github.io` · 线上域名 `https://qingxiaxjtu.com`
> 本地副本：`C:/Users/Qing Xia/WorkBuddy/Homepage`
> 依据：已逐文件核对 `_includes/head/custom.html`、`_sass/_variables.scss`、`_sass/_base.scss`、`_sass/_page.scss`、`_sass/_archive.scss`、`_sass/_masthead.scss`、`_sass/_navigation.scss`、`_sass/_sidebar.scss`、`_sass/_buttons.scss`、`_sass/_footer.scss`、`_sass/_animations.scss`、`assets/css/light-mode.css`、`assets/css/simulation-spiral.css`、`assets/js/simulation-spiral.js`、`_pages/simulating_fig.md`、`_pages/publications.md`、`_pages/cv.md`、`_config.yml`、`_data/navigation.yml`。
> 本文件只定义视觉方向与数值，**不含组件代码，不改动任何业务文件**。

---

## 0. 硬约束与判定边界

| 项 | 约束 | 对视觉的直接影响 |
|---|---|---|
| 架构 | 保留 Jekyll 骨架，`_pages/` `_publications/` 等内容与 GitHub Pages 部署方式不变 | 视觉改造必须走 `_sass/` + `assets/css/main.scss` 与少量 include，不引入前端框架 |
| 基调 | **浅色明亮现代学术风，唯一皮肤** | 删除日夜切换、`light-mode` class 依赖与全部深色皮肤样式 |
| 用户诉求 | 「元素很多，有点 low」「Simulation 旋转效果不好看」 | 减法优先于加法；Simulation 取消 3D 自转，改静态网格 |
| 不做 | 不重写内容、不改导航结构、不改 permalink、不改 `CNAME` | 视觉规范的落地边界止于样式与模板标记 |

---

## 1. 设计主张

**一句话定位：把主页当成一份可以长期阅读的「学术活页（working paper）」——暖纸白底、墨黑正文、单一深青蓝标记，让论文、结果图与经历成为唯一的主角。**

不落俗套的点：不用「纯白 + 通用蓝 `#2563EB`」的 SaaS 模板配色，改用微暖纸白 `#FAF9F6` 与低饱和深青蓝 `#14566B`；不用阴影堆叠和玻璃拟态制造"高级感"，靠留白、1px 分隔线与字重分级建立秩序；全站只有一套字族。

### 三条设计原则（即"如何做到不 low"）

| # | 原则 | 具体做法（数值） | 明确避免 |
|---|---|---|---|
| 1 | **纸面优先，而非玻璃面** | 页面底 `#FAF9F6`，内容面 `#FFFFFF`，两者差值仅约 1.05:1；分区只用 1px `#E3E6E2` 分隔线与 ≥3rem 留白；卡片最多 1 层 `0 1px 2px rgba(27,36,41,.04)` 阴影，圆角统一 6px | 禁止 `backdrop-filter`、`saturate()`、半透明玻璃卡片、双层光晕 `::before/::after`、彩色投影、`border-radius ≥ 12px` 的大圆角 |
| 2 | **一个强调色，只干一件事** | 全站唯一强调色 `#14566B`，仅用于：链接、当前导航态、主按钮、focus ring、选中态文字；其余一律中性灰阶（`#1B2429 / #49565C / #626F75`） | 禁止 `#FF6363` / `#A855F7` 等霓虹、`success/info/warning/danger` 多彩按钮族、`<font color="#660000">` 硬编码期刊名、发光轴、渐变文字 |
| 3 | **动效默认关闭，由用户触发** | 首屏零持续动画；仅保留用户触发的状态过渡，`120–160ms ease-out`，只允许 `color / border-color / background-color / opacity`；`prefers-reduced-motion: reduce` 下全部归零 | 禁止 `requestAnimationFrame` 自转、极光呼吸、`perspective / rotate3d`、入场位移、弹跳 `cubic-bezier(.34,1.56,.64,1)`、hover 放大超过 1.02、GIF 自动播放网格 |

> 三条原则共同回应「元素很多」：视觉元素数量从「背景层 + 动效层 + 玻璃层 + 光晕层 + 内容层」收敛为「纸面 + 内容」两层。

---

## 2. 现状 → 目标对比表

| 维度 | 现状（代码事实） | 目标（本规范） | 改动性质 |
|---|---|---|---|
| **背景 / 动效** | `body::before` 8 个 + `body::after` 6 个 `radial-gradient` 极光，`blur(28px/22px)`，`auroraMorph1 16s` / `auroraMorph2 12s` 无限循环；`liquid-bg.js` 约 20KB WebGL 全屏 canvas；`shooting-stars.js` 约 6.6KB 流星；`#main` / `.masthead` / `.page__footer` 各带 `intro` 入场位移动画 | 纯色 `#FAF9F6`，无 canvas、无渐变、无 rAF；仅保留 120ms 颜色过渡 | **删除** |
| **配色** | 深色 `#0C0C0F` / `#0F0F11`，霓虹 `#FF6363` `#A855F7`，成功色 `#4DF0B5`，信息色 `#C4A6FF`，警告色 `#F5C842`；`light-mode.css` 用 19 处 `!important` 覆盖出第二套皮肤 | 单一浅色皮肤：纸白 `#FAF9F6` + 墨黑 `#1B2429` + 唯一强调色 `#14566B` | **重写** |
| **字体** | Google Fonts 3 套：`Inter`（可变）、`Inter Tight`、`JetBrains Mono`；`body` 15px / 1.75；标题 `h1 2em` `h2 1.35em`；`$type-size-*` 八级阶梯 | 仅 1 套 `Inter` 可变字体（400–700）；中文走系统栈；正文 17px / 1.8；六级字号阶梯 | **收敛** |
| **层级** | 标题纯白 `#FFFFFF`、正文 `#E4E4E7`、次要 `#9CA0A8` 同处深色底；`h2::after` 2px 红紫下划线；玻璃 hover 让列表项"浮起"掩盖层级 | 三级墨色明度阶梯 `#1B2429 / #49565C / #626F75` + 字号/字重分级；`h2` 用 1px `#E3E6E2` 底分隔线，无彩色装饰 | **重写** |
| **卡片与边框** | `.archive__item` 半透明白 + `backdrop-filter: blur(4px)` + `::before` 2px 光环 + `::after` 渐变高光；hover `translateY(-2px) scale(1.01)` + `0 12px 40px` 阴影；边框 `rgba(255,255,255,.04)` 几乎不可见 | 白底 `#FFFFFF` + 1px `#E3E6E2`，圆角 6px，内边距 1.25rem；hover 仅边框转 `#82908E` + 底色 `#F3F4F1`；无位移、无光环 | **删除覆盖** |
| **图片展示** | Simulation 16 组结果图沿 2.8 圈 3D 螺旋 `perspective:1000px` 持续自转，卡片 240×170（移动 110×75），互相遮挡，标签 `white-space:nowrap` 被截断；GIF 全部同时解码（目录约 26MB） | 静态 2 列网格（<900px 单列），白底 1px 边框 + 16px 内边距，图片 `object-fit:contain`，GIF 首帧静帧 + 点击才播放 | **替换** |
| **装饰元素** | 发光轴 `.helix-axis`、章节浮标 `.spiral-section-label`、呼吸提示 `.spiral-hint`、avatar `0 8px 32px` 重阴影、导航 `blur(24px) saturate(180%)`、右下/左下浮动主题切换按钮（inline 样式）、`Follow` 按钮（无行为） | 全部移除；仅保留 1px 分隔线、学术图标（academicons）与必要的 PDF 链接箭头 | **删除** |
| **导航与侧栏** | `.masthead` 半透明玻璃 + 内阴影；`.greedy-nav` 红色 2px 下划线滑动；侧栏 `.author__urls` 玻璃悬浮 + `translateX(4px)`；`theme-toggle` 固定悬浮圆钮 | 纯色白 + 1px 底线；当前态用 `#14566B` 文字 + 2px 底条（无滑动）；侧栏为无边框纯文本列表 | **重写** |
| **状态反馈** | hover 靠发光、放大、位移、阴影四重叠加；focus 样式由主题 `%tab-focus` 隐式定义，浅色下不可控 | 统一 `outline: 2px solid #14566B; outline-offset: 2px` + `box-shadow: 0 0 0 4px rgba(20,86,107,.15)`；hover 只改颜色/边框 | **统一** |

---

## 3. 色彩系统

### 3.1 色板（HEX + HSL + 用途）

色相推导：纸白走 H≈45° 微暖，中性色统一带 H≈196° 冷灰（与强调色同色相族但饱和度 ≤20%），强调色 `#14566B` 为 H≈194° / S 67% / L 25% 的深青蓝，呼应流体与相场模拟的研究主题，且与暖纸底形成冷暖对比而不刺眼。

| Token | HEX | HSL | 用途 |
|---|---|---|---|
| `--c-bg` | `#FAF9F6` | 45°, 33%, 97% | 页面底（唯一） |
| `--c-surface` | `#FFFFFF` | 0°, 0%, 100% | 内容面：卡片、侧栏容器、导航、灯箱面板 |
| `--c-surface-2` | `#F3F4F1` | 75°, 8%, 95% | 次级面：代码块、chip 底、图片衬底、hover 底 |
| `--c-ink` | `#1B2429` | 198°, 19%, 13% | 主文字、标题、强调数字 |
| `--c-ink-2` | `#49565C` | 198°, 12%, 32% | 次文字、图注、摘要、列表说明 |
| `--c-ink-3` | `#626F75` | 196°, 9%, 42% | 元数据、日期、页脚、占位符（AA 临界值，已校验） |
| `--c-line` | `#E3E6E2` | 90°, 8%, 89% | **仅装饰性** 1px 分隔线、卡片静态边框 |
| `--c-line-strong` | `#82908E` | 176°, 6%, 53% | 可交互控件边界（输入框、按钮描边、hover 边框），≥3:1 |
| `--c-accent` | `#14566B` | 194°, 67%, 25% | 链接、当前态、主按钮底、focus ring、选中文字 |
| `--c-accent-hover` | `#0E4152` | 197°, 71%, 19% | 链接/按钮 hover |
| `--c-accent-soft` | `#E9F2F4` | 192°, 33%, 93% | 强调色浅底：选中 chip、提示条、标签底 |
| `--c-focus` | `#14566B` | 同 accent | focus outline 2px |
| `--c-focus-halo` | `rgba(20,86,107,.15)` | — | focus 外扩 4px 光环（唯一允许的"光"） |
| `--c-code-bg` | `#F2F4F1` | 75°, 9%, 95% | 行内代码 / 代码块底 |
| `--c-code-ink` | `#9A3B4C` | 348°, 44%, 42% | 行内代码文字、期刊名（替代 `#660000`） |
| `--c-overlay` | `rgba(20,32,36,.68)` | — | 灯箱遮罩（不叠加 blur） |
| `--c-selection` | `#D7E8ED` | 192°, 36%, 89% | `::selection` 底 |
| `--c-success` | `#2E6B4F` | 152°, 39%, 30% | 仅状态提示文字，不做彩色按钮 |
| `--c-warning` | `#8A6212` | 40°, 76%, 31% | 同上 |
| `--c-danger` | `#A33A3A` | 0°, 47%, 43% | 错误文字 / 错误态边框 |
| `--c-shadow` | `rgba(27,36,41,.04)` | — | 唯一阴影，仅 `0 1px 2px`，用于浮层（下拉、灯箱） |

### 3.2 CSS 变量（供 Phase 3 落地，与 `_sass/_variables.scss` 双向对应）

```css
:root {
  --c-bg:#FAF9F6; --c-surface:#FFFFFF; --c-surface-2:#F3F4F1;
  --c-ink:#1B2429; --c-ink-2:#49565C; --c-ink-3:#626F75;
  --c-line:#E3E6E2; --c-line-strong:#82908E;
  --c-accent:#14566B; --c-accent-hover:#0E4152; --c-accent-soft:#E9F2F4;
  --c-focus:#14566B; --c-focus-halo:rgba(20,86,107,.15);
  --c-code-bg:#F2F4F1; --c-code-ink:#9A3B4C;
  --c-overlay:rgba(20,32,36,.68); --c-selection:#D7E8ED;
  --c-success:#2E6B4F; --c-warning:#8A6212; --c-danger:#A33A3A;
  --c-shadow:rgba(27,36,41,.04);

  --r-sm:4px; --r-md:6px; --r-lg:8px;   /* 圆角标尺，最大 8px */
  --t-fast:120ms ease-out; --t-base:160ms ease-out;
  --focus-ring:0 0 0 4px var(--c-focus-halo);
}
```

> Phase 3 需同时把上述值写入 `_sass/_variables.scss`（编译期 Sass 变量）与 `:root`（运行时 CSS 变量），**禁止再出现第二套颜色真源**。现有 `$primary-color:#FF6363`、`$link-color:#FF8585`、`$body-color:#0C0C0F` 等全部替换。

### 3.3 对比度校验（WCAG 2.1 AA 依据）

依据 WCAG 2.1 相对亮度公式 `(L1+0.05)/(L2+0.05)`：正文文本需 ≥4.5:1（SC 1.4.3），≥24px 或 ≥18.66px 粗体大字号需 ≥3:1，UI 组件边界与状态指示需 ≥3:1（SC 1.4.11）。以下为实算值：

| 组合 | 对比度 | 判定 |
|---|---|---|
| `#1B2429` on `#FAF9F6`（正文） | 14.99:1 | AAA |
| `#1B2429` on `#FFFFFF`（卡片正文） | 15.78:1 | AAA |
| `#49565C` on `#FAF9F6`（次文字/图注） | 7.20:1 | AAA |
| `#626F75` on `#FAF9F6`（元数据） | 4.92:1 | AA |
| `#626F75` on `#F3F4F1`（浅底上的元数据） | 4.70:1 | AA |
| `#14566B` on `#FAF9F6`（链接） | 7.75:1 | AAA |
| `#14566B` on `#FFFFFF`（链接/卡片内） | 8.16:1 | AAA |
| `#0E4152` on `#FAF9F6`（hover） | 10.52:1 | AAA |
| `#FFFFFF` on `#14566B`（主按钮） | 8.16:1 | AAA |
| `#14566B` on `#E9F2F4`（浅底 chip 文字） | 7.18:1 | AAA |
| `#9A3B4C` on `#F2F4F1`（行内代码） | 6.12:1 | AAA |
| `#82908E` on `#FFFFFF`（控件边框） | 3.32:1 | 1.4.11 通过 |
| `#E3E6E2` on `#FAF9F6`（装饰分隔线） | 1.20:1 | **仅装饰，不可作为控件边界** |
| `#E9F2F4` on `#FFFFFF`（选中浅底） | ≈1.10:1 | **不可单靠底色表达状态** |

**由末两行推出的硬性规则（避免返工）**：
1. `--c-line` 只能画分隔线；任何输入框、按钮、可点击卡片的边界必须用 `--c-line-strong`（≥3:1）。
2. 选中/当前态**不得只用浅底色**，必须同时具备「`--c-accent` 文字 + 2px `--c-accent` 边条或 `--c-line-strong` 边框」中的至少一项，以满足 1.4.11。
3. 链接不得只靠颜色区分（1.4.1）：正文内链接保持 1px `currentColor` 下划线（透明度 40%），hover 时变为 100%。
4. 禁用态用 `opacity:.45` + `cursor:not-allowed`，但禁用文字仍需 ≥4.5:1 的**原始**色值（因此禁用只降透明度到 .55 为止，且仅用于非关键信息）。

### 3.4 明确避免

- 避免纯白 `#FFFFFF` 作页面底（与卡片无区分，必须靠阴影"救场"，与原则 1 冲突）→ 用 `#FAF9F6`。
- 避免任何霓虹发光、彩色 `box-shadow`、`text-shadow`、渐变文字、渐变分隔线（现有 `hr` 是渐变，改为 1px 实线）。
- 避免深色图片区域直接贴白底导致边界消失：图片统一加 `--c-surface-2` 衬底（见 §8）。
- 避免 `<font color="#660000">`（`_pages/publications.md` 中 44+ 处）与 `font[color="#660000"]` 深色覆盖规则 → 统一由 `.journal` 类着 `--c-code-ink`。

---

## 4. 字体系统

### 4.1 字体栈

| 用途 | 栈 | 说明 |
|---|---|---|
| 正文 / UI / 标题（唯一字族） | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif` | Inter 覆盖拉丁；中文由系统字体接续，不下载中文字体 |
| 代码 / 数字 | `"SF Mono", "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace` | 系统等宽栈，**不再从 Google Fonts 加载 JetBrains Mono** |
| 中文标题回退 | 同上；`:lang(zh)` 下 `letter-spacing: 0`（拉丁标题的负字距不适用于汉字） | 避免中文标题字距被压 |
| 数字 | `font-variant-numeric: tabular-nums` 用于年份、编号、统计数字 | 论文编号对齐 |

**取舍说明**：现状 3 套 Google 字体（Inter / Inter Tight / JetBrains Mono）实际只产生「标题略窄 + 代码等宽」两点微弱差异，却带来 3 个跨域请求 + 3 组字体文件。收敛为 1 套后，层级完全由字号/字重/颜色承担（§4.2）。不引入任何中文 Web Font（Noto Sans SC 完整子集数 MB，得不偿失）；`PingFang SC`（macOS/iOS）与 `Microsoft YaHei`（Windows）覆盖绝大多数访问者。

**加载策略**：
- `<link rel="preconnect" href="https://fonts.googleapis.com">` + `fonts.gstatic.com` 保留 2 个；
- 只请求 `Inter:wght@400;500;600;700&display=swap` 一个可变字体 URL（不再用 `opsz` 轴与 Inter Tight）；
- `font-display: swap`；为防 FOIT，字体栈首位的系统回退必须完整；
- `font-weight` 只用 400 / 500 / 600 / 700 四档，避免浏览器合成字重（现状出现 `650`、`font-weight:650` 等非标值，需清理）。

### 4.2 字号阶梯（根字号 16px，全部用 rem）

| 层级 | 选择器 | 字号 | 字重 | 行高 | 字间距 | 颜色 |
|---|---|---|---|---|---|---|
| 页面标题 | `.page__title` / `h1` | 2.25rem / 36px（移动 1.875rem / 30px） | 700 | 1.2 | `-0.02em`（中文 0） | `--c-ink` |
| 一级章节 | `.page__content h2` / `.archive__subtitle` | 1.5rem / 24px | 600 | 1.35 | `-0.01em`（中文 0） | `--c-ink` |
| 二级章节 | `h3` | 1.1875rem / 19px | 600 | 1.45 | 0 | `--c-ink` |
| 三级 / 条目标题 | `h4` `.archive__item-title` | 1.0625rem / 17px | 600 | 1.5 | 0 | `--c-ink` |
| 正文 | `p` `li` `dd` | 1.0625rem / 17px | 400 | **1.8**（中英混排） | 0 | `--c-ink` |
| 引言 | `.page__lead` | 1.1875rem / 19px | 400 | 1.7 | 0 | `--c-ink-2` |
| 元数据 / 图注 / chip | `.page__meta` `figcaption` `.page__taxonomy-item` | 0.875rem / 14px | 400（chip 500） | 1.6 | `0.01em` | `--c-ink-3`（图注用 `--c-ink-2`） |
| 代码 | `code` `pre` | 0.875rem / 14px | 400 | 1.65 | 0 | `--c-code-ink` / `--c-ink` |
| 极小标签 | 仅大写分类标签 | 0.75rem / 12px | 600 | 1.4 | `0.08em` | `--c-ink-3` |

- **下限 12px**：现状 Simulation 移动端标签 `0.45em`（约 6.8px）与 `.spiral-item__label` `0.65em`，均不可读，明确禁止低于 12px。
- 正文测量宽度上限 **68ch**（约 680–720px），长论文列表可放宽到 76ch，避免长行扫视疲劳。
- 中文标点与拉丁混排：不启用 `text-align: justify`；`text-wrap: pretty` 保留；`line-height` 中文段落额外不低于 1.8。
- 标题字重不再用 `700` 配 `letter-spacing:-0.03em` 的"广告感"组合，最大负字距收敛到 `-0.02em`。

---

## 5. 版式与网格

### 5.1 宽度与断点

现状 `$large:925px` / `$x-large:1280px`，`#main` 用 Susy float 12 栅格，`.page` 占 10/12 且左右各留 `0.5/2 of 12`，实际内容宽度偏窄且不对称。

| 项 | 数值 | 说明 |
|---|---|---|
| 最大内容宽度 | `1200px`（`#main` `max-width`; 内容实测约 1120px） | 替换 `$x-large:1280px` 的容器上限 |
| 桌面栅格 | `display:grid; grid-template-columns: 240px minmax(0,1fr); gap: 4rem (64px)` | ≥1024px 生效；覆盖 Susy float 布局，不删除主题文件 |
| 侧栏宽度 | `240px`（含头像 96px 圆角 6px） | 现状 `span(2 of 12)` 在 1280px 下约 213px 且随容器浮动 |
| 主内容列 | `minmax(0,1fr)`，内部文本 `max-width:68ch` | 防止长 URL / 公式撑破栅格 |
| 断点 A | `≥1024px`：双列（侧栏 + 正文） | 对应现有 `$large:925px`，统一上调到 1024px |
| 断点 B | `720–1023px`：单列，侧栏变为顶部横向档案条（头像 48px + 姓名 + 链接横排），`gap:1.5rem` | 现状移动端 `author__urls` 用 flex 横排，可沿用结构 |
| 断点 C | `<720px`：全单列，左右安全边距 `1.25rem (20px)` | 导航收缩为站点名 + 汉堡菜单 |
| 页面安全边距 | 桌面 `2.5rem (40px)`；平板 `1.5rem (24px)`；移动 `1.25rem (20px)` | `#main` padding |
| 导航高度 | `64px`（`padding: 0 2.5rem`），sticky `top:0` | 现状 `0.65em 1.2em` 偏矮且不对称 |

> 落地提示：Susy 的 `.page` / `.sidebar` float 规则可在 `assets/css/main.scss` 末尾用一层 `@media (min-width:1024px){ #main{display:grid;...} }` 覆盖，无需重写 `_sass/_page.scss` 的栅格调用。

### 5.2 间距标尺（4px 基准，只许用这些值）

| Token | rem | px | 用途 |
|---|---|---|---|
| `--s-1` | 0.25rem | 4 | 图标与文字间隙 |
| `--s-2` | 0.5rem | 8 | chip 内边距、按钮图标间隙 |
| `--s-3` | 0.75rem | 12 | 图与图注、列表项内间距 |
| `--s-4` | 1rem | 16 | 卡片内边距（小）、段落间距下限 |
| `--s-5` | 1.25rem | 20 | 卡片内边距（标准） |
| `--s-6` | 1.5rem | 24 | 网格 gap、卡片间距 |
| `--s-8` | 2rem | 32 | 标题→正文、图组上下 |
| `--s-12` | 3rem | 48 | 章节 h2 上边距、`#main` 上边距 |
| `--s-16` | 4rem | 64 | 大区块分隔、桌面栅格 gap |
| `--s-24` | 6rem | 96 | 页面级区块之间（移动减半到 3rem） |

### 5.3 区块节奏（自上而下）

| 位置 | 间距 |
|---|---|
| 导航底 → `#main` 顶 | 3rem |
| 页面标题 → 首段 | 2rem |
| 段落 ↔ 段落 | 1.25rem |
| 章节 `h2` 上 / 下 | 上 4rem（紧接标题后 3rem） / 下 1.5rem |
| 章节 `h2` → 其下 `h3` | 1.5rem |
| 论文条目 ↔ 条目 | 0（改用 1px `--c-line` 分隔线 + 各 1.25rem 上下内边距） |
| 图片 ↔ 图注 | 0.75rem |
| 图组 ↔ 下一章节 | 4rem |
| 大区块（如 Biography 教育与研究兴趣）之间 | 6rem（移动 3rem） |
| 内容底 → 页脚 | 4rem |

### 5.4 留白策略

1. **留白代替容器**：论文列表、教育经历、研究兴趣一律不加背景卡片，靠 1px 分隔线与 1.25rem 内边距分组；只有"图片卡片""提示条""灯箱"允许有面。
2. **侧栏不设边界**：侧栏与正文之间只有 4rem 空隙，无竖线、无背景、无阴影。
3. **首屏不放装饰**：`#main` 顶部直接是页面标题，无 hero 图、无渐变、无欢迎语动效。
4. **页脚轻量**：页脚只有 1px 上分隔线 + 14px `--c-ink-3` 版权行，上下内边距 2rem，不铺满屏底色。
5. **避免**：整屏彩色/渐变区块、卡片套卡片、每个列表项一个白盒子、为"填满"而增加的占位图。

---

## 6. 组件视觉规范

> 通用 focus 契约（适用于下表所有可交互元素，表中不再重复）：`outline: 2px solid var(--c-focus); outline-offset: 2px; box-shadow: var(--focus-ring)`；键盘可见，`:focus-visible` 生效，鼠标 `:focus` 不显示 outline。
> 通用过渡：`color / background-color / border-color` `120ms ease-out`；**禁止 transform 与 box-shadow 参与 hover 过渡**。
> 通用 hover 契约：只改颜色或边框；**禁止位移、缩放、发光、阴影加深**。

| # | 组件 | 尺寸 / 排版 | default | hover | focus | 其他状态 |
|---|---|---|---|---|---|---|
| 1 | **顶部导航** `.masthead` `.greedy-nav` | 高 64px；站点名 17px/700；菜单项 15px/500，项间距 1.5rem；下边框 1px | 背景 `#FFFFFF`（不透明），底边框 `--c-line`；菜单文字 `--c-ink-2`；站点名 `--c-ink`；无 blur、无内阴影 | 文字转 `--c-accent`；不加下划线滑动 | 通用 focus ring | `.active`：`--c-accent` 文字 + 底部 2px `--c-accent` 实线（静态，不动画）；`.hidden-links` 下拉：白底 + 1px `--c-line-strong` + `0 1px 2px --c-shadow`，圆角 6px，无三角箭头 |
| 2 | **侧栏作者档案** `.sidebar` `.author__avatar` `.author__urls` | 宽 240px；头像 96×96，圆角 6px；姓名 19px/600；bio 14px/400 `--c-ink-2`；链接 14px/1.6，行距 0.5rem | 透明背景（继承 `--c-bg`）；头像 1px `--c-line` 边框、零阴影；链接 `--c-ink-2`；无卡片、无 Follow 按钮 | 链接文字转 `--c-accent`，无背景块、无 `translateX` | 链接通用 focus ring | 移动端（<1024px）转为横向档案条：头像 48px，链接 flex wrap，间距 `0.75rem 1rem` |
| 3 | **页面标题** `.page__title` | 36px/700/lh1.2；下留 2rem | `--c-ink`；左侧无装饰条；不套 hero 背景 | 无状态（纯文本） | 无 | 下方若有 `.page__meta`，14px `--c-ink-3`，间距 0.5rem |
| 4 | **章节标题** `.page__content h2` / `h3` | h2 24px/600，上 4rem 下 1.5rem；h3 19px/600 | `--c-ink`；h2 底部 1px `--c-line` 实线（`padding-bottom:.75rem`）；**删除 `h2::after` 彩色短下划线** | 无状态 | 无 | 标题锚点 `#` 图标默认 `opacity:0`，`:focus-within` 或 hover 时 `opacity:.5`，色 `--c-ink-3` |
| 5 | **论文 / 成果条目** `.archive__item` / `publications.md` 有序列表 | 无卡片；条目上下内边距 1.25rem；条目间 1px `--c-line`；标题 17px/600，作者/期刊 15px `--c-ink-2`，年份 14px `--c-ink-3` + tabular-nums | 背景透明；期刊名用 `--c-code-ink`（替换 `<font color="#660000">`）；本人姓名 600 不加底色；无 `::before/::after` 光环 | 整行底色 `--c-surface-2`（仅颜色，无位移/阴影）；标题转 `--c-accent` | 条目内链接通用 focus ring | 外链 PDF 用 §7 按钮样式；"Highly Cited" 等标记用 chip（§8），不用彩色文字堆叠 |
| 6 | **图片卡片与图注** `figure` / `figcaption` | 卡片：白底 + 1px `--c-line` + 圆角 6px + 内边距 1rem；图片衬底 `--c-surface-2`，`object-fit:contain`，`max-height:320px`；图注 14px/1.6 `--c-ink-2`，距图 0.75rem | 阴影 `0 1px 2px var(--c-shadow)`；图注左对齐，最多 2 行，不截断 | 卡片边框转 `--c-line-strong`；图片**不放大、不变亮** | 图片可点击时通用 focus ring（加在 `<a>` 上） | 双图并排用 `grid-template-columns:1fr 1fr; gap:1rem`，<720px 单列；详见 §8 |
| 7 | **PDF / 外链按钮** `.btn` | 高 36px；内边距 `0.5rem 1rem`；14px/600；圆角 6px；两种变体，只保留 `.btn`（实心）与 `.btn--inverse`（描边） | 实心：`--c-accent` 底 + `#FFFFFF` 字 + 1px 同色边；描边：`#FFFFFF` 底 + `--c-ink-2` 字 + 1px `--c-line-strong` 边；末尾 ↗ 图标 12px | 实心 → `--c-accent-hover`；描边 → 文字 `--c-accent` + 边框 `--c-accent`；**无 `translateY`、无发光** | 通用 focus ring（描边按钮 focus 时边框也转 `--c-accent`） | `:disabled` `opacity:.5` + `cursor:not-allowed`；**删除** `--info/--warning/--success/--danger` 彩色按钮族 |
| 8 | **标签 chip** `.page__taxonomy-item` | 高 26px；内边距 `0.25rem 0.625rem`；12–14px/500；圆角 4px | `--c-surface-2` 底 + `--c-ink-2` 字 + 1px `--c-line` 边 | 边框 `--c-line-strong`，文字 `--c-accent` | 通用 focus ring | `.active/selected`：`--c-accent-soft` 底 + `--c-accent` 字 + 1px `--c-accent` 边（满足 1.4.11，不靠底色单独表达）；无阴影、无药丸大圆角 |
| 9 | **页脚** `.page__footer` | 上下内边距 2rem；14px `--c-ink-3` | 背景 `--c-bg`；顶部 1px `--c-line`；无 blur、无入场动画 | 链接 `--c-accent` | 链接通用 focus ring | 版权 12px `--c-ink-3`；社交图标 16px `--c-ink-3`，hover `--c-accent`；删除浮动 `theme-toggle` 圆钮 |
| 10 | **灯箱 / 大图查看** `.abstract-modal` / 图片 lightbox | 面板 `max-width:min(960px,92vw)`，`max-height:88vh`；白底 `#FFFFFF`；圆角 8px；内边距 1.5rem；遮罩 `--c-overlay` | 遮罩纯色半透明、**无 backdrop-filter**；面板 1px `--c-line` + `0 1px 2px --c-shadow`；标题 19px/600；关闭按钮 32×32 圆角 6px，`--c-surface-2` 底 | 关闭按钮底色 `--c-accent-soft`、图标 `--c-accent` | 打开后焦点移入面板、内部焦点循环；关闭按钮通用 focus ring；`Esc` 关闭并归还焦点 | 出现/消失仅 `opacity 120ms`，**禁止 scale 弹跳**；`prefers-reduced-motion` 下 0ms；`aria-modal="true"` + `role="dialog"`；背景滚动锁定 |

**补充组件约定（避免遗漏）**：
- 正文链接：`--c-accent` + 1px `rgba(20,86,107,.4)` 下划线；hover `--c-accent-hover` + 下划线不透明；visited 同色（学术站无区分必要）。
- 表格：表头 `--c-surface-2` 底 + `--c-ink-2` 600；单元格 1px `--c-line` 下边框；行 hover `--c-surface-2`（不加阴影）。
- 引用 `blockquote`：左侧 3px `--c-accent` 竖线 + 1.25rem 内边距 + `--c-surface-2` 底，去掉斜体与 blur。
- 输入框：1px `--c-line-strong`，圆角 6px，focus 边框 `--c-accent` + focus ring；错误态 1px `--c-danger` + 14px 错误文字 `--c-danger`。
- 代码块 `pre`：`--c-code-bg` 底 + 1px `--c-line`，Rouge 语法配色改浅色主题（对应 `_sass/_syntax.scss`）。

---

## 7. 减法清单（直接回应「元素很多」）

### 7.1 删除 / 停用（具体到文件）

| # | 文件 / 位置 | 内容 | 处置 | 理由 |
|---|---|---|---|---|
| 1 | `assets/js/liquid-bg.js`（约 19.9KB） | WebGL 全屏液体流动背景 | **删除文件 + 删除 `head/custom.html:44` 引用** | 与纸面基调冲突；常驻 GPU 上下文 |
| 2 | `assets/js/shooting-stars.js`（约 6.6KB） | 流星划过 | **删除文件 + 删除 `head/custom.html:46`** | 纯装饰持续动效 |
| 3 | `assets/js/theme-switcher.js`（约 3.5KB） | 日夜切换 + 左下浮动圆钮（inline 样式） | **删除文件 + 删除 `head/custom.html:49-61` 的 inline 判定脚本 + 删除 `:63` 引用** | 硬约束为唯一浅色皮肤；且浮动圆钮是页面第 3 个悬浮元素 |
| 4 | `assets/js/simulation-spiral.js`（约 10.5KB） | 2.8 圈 `requestAnimationFrame` 持续自转 | **删除文件 + 删除 `_pages/simulating_fig.md:72` 引用** | 用户明确否定的效果 |
| 5 | `assets/css/simulation-spiral.css`（约 5.9KB） | 螺旋卡片、发光轴、呼吸提示、弹跳 modal | **删除文件 + 删除 `_pages/simulating_fig.md:12` 引用** | 同上；其 modal 样式与灯箱规范冲突 |
| 6 | `assets/css/light-mode.css`（约 12.1KB，386 行，19 处 `!important`） | 第二套皮肤覆盖层 | **删除文件 + 删除 `head/custom.html:62` 引用**（详见 §9） | 双重真源；含极光/毛玻璃/螺旋/lineage 全部待删样式 |
| 7 | `_sass/_base.scss:35-74` | `body::before` 8 个 + `body::after` 6 个 `radial-gradient` 极光 + `blur` + `animation` | **删除整段** | 原则 1/3 |
| 8 | `_sass/_base.scss:85-106` | `#liquid-bg-canvas` 样式与 `html.liquid-bg-active` 降级规则 | **删除整段** | 随 #1 一并移除 |
| 9 | `_sass/_animations.scss` | `auroraMorph1/2`、`auroraPulse`、`glassShimmer`、`intro` | **删除前四个及 intro 的调用**；保留末尾 `@media (prefers-reduced-motion: reduce)` 规则 | 无持续动效；`#main/.masthead/.page__footer/.page__hero` 中的 `animation: intro` 一并去掉 |
| 10 | `_sass/_archive.scss:68-144` | `.archive__item` 的 `backdrop-filter`、`::before` 2px 光环、`::after` 渐变高光、hover `translateY(-2px) scale(1.01)` + 40px 阴影；`.page__content li` 玻璃 hover | **删除并重写为 §6.5 的分隔线列表** | 原则 1/3 |
| 11 | `_sass/_page.scss:136-155`、`:62-69` | 列表项玻璃 hover（`blur(14px)` + `translateX(2px)`）；`h2` 彩色 `::after` 下划线（定义在 `_base.scss:134-144`） | **删除** | 同上 |
| 12 | `_sass/_masthead.scss` / `_navigation.scss` / `_sidebar.scss` / `_footer.scss` | 所有 `backdrop-filter: blur(...) saturate(...)`、内阴影、`0 8px 32px` 头像阴影、`author__urls` 玻璃下拉与 `translateX(4px)` | **删除，改纯色 + 1px 边** | 原则 1 |
| 13 | `_sass/_buttons.scss:65-130` | `--info/--warning/--success/--danger` 彩色按钮族与 `box-shadow` 发光 | **删除，仅保留 `.btn` / `.btn--inverse` / 尺寸修饰** | 原则 2 |
| 14 | `_includes/author-profile.html:23` | `<button class="btn btn--inverse">Follow</button>`（无 href / 无行为） | **删除该行** | 无功能的干扰元素 |
| 15 | `_includes/head/custom.html:6-8` | 3 套 Google Fonts 请求 | **改为 1 套 Inter**；同时 `:29` `theme-color #0F0F11` → `#FAF9F6`；`:24,:26-28` 的 `mask-icon color="#000000"` / `msapplication-TileColor #000000` 改为 `#14566B` | 性能 + 品牌一致 |
| 16 | `assets/js/collapse.js` + `assets/css/collapse.css` | 全仓库 grep 无任何引用（死文件） | **删除** | 无引用残留 |
| 17 | `preview.html`（仓库根，约 23KB 本地预览页） | 独立静态 HTML，会被 GitHub Pages 输出为 `/preview.html` | **删除或加入 `_config.yml` 的 `exclude`** | 非站点内容，避免公开暴露第二套视觉 |
| 18 | `_pages/publications.md` 中 `<font color="#660000">`（44+ 处）与 `_sass/_base.scss:183-185` 的 `font[color="#660000"]` 覆盖 | 硬编码深酒红期刊名 | **由 CSS 类统一着 `--c-code-ink`** | 原则 2；避免深色皮肤残留 |

### 7.2 保留但需改造

| 文件 | 保留原因 | 改造内容 |
|---|---|---|
| `assets/css/main.scss` + `_sass/*.scss` | 主题编译入口，唯一真源 | `_variables.scss` 全量换色/字体/圆角/阴影；其余按 §7.1 去装饰 |
| `assets/css/abstract-modal.css` + `assets/js/abstract-modal.js` | 论文摘要的实用交互，UX 阶段可能保留 | 去 `backdrop-filter: blur(20px)`、深色面板、红色关闭态、弹跳 `absModalIn`；改 §6.10 白底灯箱 |
| `assets/css/lineage-tree.css` + `assets/js/lineage-tree.js` | 学术传承是 CV 页的真实内容 | 节点改白底 + 1px `--c-line`；渐变脊线改 1px 实线；当前节点用 `--c-accent` 文字而非红底 |
| `assets/css/academicons.css` | ORCID / Google Scholar 等学术图标 | 仅改图标颜色为 `--c-ink-3` / hover `--c-accent` |
| MathJax（`head/custom.html:32-41`） | 数学公式是学术站刚需 | 保留；建议改为仅在含 `$` 的页面按需加载（Phase 3 性能项），不影响视觉 |
| `_pages/simulating_fig.md` | 16 组结果图与 PDF 链接是核心内容 | 移除 spiral CSS/JS 引用与 `Loading spiral gallery...` 占位；改 §8 的分组网格标记（具体 markup 由 Phase 2/3 决定） |
| `images/simulation/*`（16 个文件，约 26MB） | 全部内容资产保留 | 生成 GIF 首帧静帧（JPG/PNG）用于网格；GIF 本体懒加载；统一 `loading="lazy"` + 显式 `width/height` |
| `_config.yml` / `CNAME` / `_data/navigation.yml` | 部署与信息架构 | **不改动**（`preview.html` 的 exclude 除外） |
| `_includes/head/custom.html` | 自定义 head 入口 | 保留文件，精简到：1 套字体 + favicon（可从 14 个 apple-touch-icon 精简到 3 个）+ academicons + MathJax |

### 7.3 量化收益（供 Phase 3 性能验收）

- 删除装饰 JS 约 **40.5KB**（liquid-bg 19.9 + shooting-stars 6.6 + theme-switcher 3.5 + simulation-spiral 10.5）；删除样式约 **18KB**（simulation-spiral 5.9 + light-mode 12.1）。
- 移除 **1 个 WebGL 上下文 + 2 个常驻 `requestAnimationFrame` 循环 + 14 个 `radial-gradient` + 2 次 blur 滤镜层 + 4 处 `backdrop-filter`**。
- 首屏关键资源从「3 套 Web 字体 + 4 个自定义脚本 + 2 张额外 CSS」降为「1 套 Web 字体 + 0 个装饰脚本 + 1 张编译 CSS」。
- 视觉层数从 5 层（背景/动效/玻璃/光晕/内容）降为 2 层（纸面/内容）。

---

## 8. Simulation 结果图的视觉基调（供 Phase 2 / Phase 3 作为输入）

**基调一句话：把 16 组结果当成期刊插图来排——静态、对齐、有图注、可放大，而不是当成轮播素材。**

### 8.1 版式

| 项 | 数值 |
|---|---|
| 分组 | 沿用原文 3 个一级方向（CAD for 3D printing / Computational fluids flow / Image processing），每组 `h2` + 1px `--c-line` 底分隔线，组间距 4rem |
| 网格 | `display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.5rem (24px)`；`<900px` 单列；同一行的两张图等高（`align-items:start`，卡片高度由图片比例决定，不强制拉伸） |
| 卡片 | `#FFFFFF` 底 + 1px `--c-line` + 圆角 6px + 内边距 1rem；阴影 `0 1px 2px var(--c-shadow)`；图片区 `--c-surface-2` 衬底 + 圆角 4px |
| 图片 | `width:100%; height:auto; max-height:320px; object-fit:contain; display:block`；不裁切、不圆角遮罩、不 `filter:brightness()` |
| 图注 | 卡片内图片下方 0.75rem；标题 16px/600 `--c-ink`（中英文各一行，不截断、不 `text-overflow:ellipsis`）；方法/年份 14px `--c-ink-3`；PDF 链接用 §6.7 描边按钮，右对齐 |
| 卡片间关系 | 无重叠、无 z-index 提升、无 3D transform、无 perspective；完全静态 |

### 8.2 GIF 处理（关键）

现状 `images/simulation/` 约 26MB，其中 9 个 GIF（单个最大 4.8MB），螺旋视图下全部同时解码并持续播放，既卡又乱。规范：

1. **网格内只显示静帧**：为每张 GIF 预生成首帧 JPG/PNG（建议宽度 800px、质量 80，单张目标 <150KB），网格 `<img>` 指向静帧。
2. **GIF 按需加载**：仅在用户点击「播放」或打开灯箱时，才把 `src` 换成 GIF 本体；`loading="lazy"` + `IntersectionObserver` 只预载视口内静帧。
3. **默认不自动播放**：任何情况下首屏不出现自主动画；`prefers-reduced-motion: reduce` 时「播放」按钮仍存在但需二次确认或直接提供静帧。
4. **播放控件**：卡片右上角 28×28 的「播放」图标按钮，白底 + 1px `--c-line-strong`，hover 转 `--c-accent`；播放中变为「暂停」；不使用彩色药丸、不加脉冲光圈。
5. **灯箱内播放**：大图查看时展示 GIF 原尺寸（最大 `88vh`），Controls 区含「PDF」外链与「关闭」，见 §6.10。

### 8.3 图注排版示例结构（仅为信息层级，非代码）

```
[静帧图片 · 浅灰衬底 · 最大高 320px]
机械结构优化 / Mechanical structure optimization        [PDF ↗]
Physics of Fluids, 2023 · 拓扑优化                      [▶ 播放]
```

- 中文在前、英文在后，中文用 `--c-ink`，英文用 `--c-ink-2`，避免同一行两种语言字号混乱。
- 元数据行 14px `--c-ink-3`，年份用 `tabular-nums`。
- 每个小节（如「Digital twin with FDM」下有 3 张图）用一个 `h3` + 该组网格，不用绝对定位的浮标标签。

### 8.4 明确避免（Simulation）

- 避免任何 `perspective` / `rotateY` / `rotate3d` / `transform-style:preserve-3d` / 自动 `angle += AUTO_SPEED`。
- 避免 `.helix-axis` 发光轴、`.spiral-section-label` 浮标、`.spiral-hint` 呼吸提示、`hintPulse` 动画。
- 避免 hover `scale(1.15)` + `brightness(1.3)` + 红紫 `drop-shadow`；hover 只改边框色。
- 避免 240×170 统一裁切（原图比例差异大，`object-fit:contain` + 等高容器会失真）——改为按原始比例自适应，只限制最大高度。
- 避免标签 `white-space:nowrap` + `ellipsis` 造成中英文名称被截断。
- 避免白底直接承接深色仿真云图导致边界不可辨——必须有 `--c-surface-2` 衬底 + 1px `--c-line`。

---

## 9. 与现有 `light-mode.css` 的关系

**结论：不沿用、不增量改造，而是「重写替换」——物理删除 `assets/css/light-mode.css` 及其引用，把浅色值下沉到 `_sass/_variables.scss` + `assets/css/main.scss`，使浅色成为唯一默认皮肤。**

| # | 理由 | 代码依据 |
|---|---|---|
| 1 | 它是**深色主题的覆盖层**，不是浅色基线：386 行全部是 `body.light-mode ...` 选择器，依赖 `theme-switcher.js` 与 `head/custom.html` 的 inline 脚本给 `<html>/<body>` 加 class。硬约束下不再有 dark 皮肤，这层覆盖既无对象也无意义 | `light-mode.css:5` `body.light-mode {...}`；`theme-switcher.js:28-37` |
| 2 | **19 处 `!important`** 与 `_sass/_variables.scss` 形成双重真源；改一个颜色要同时改 Sass 变量与覆盖层，且覆盖层优先级更高，Phase 3 极易改一处漏一处 | `light-mode.css` 全文 |
| 3 | 它自身就携带大量待删装饰：8+6 个彩色 `radial-gradient` 极光、`filter:blur(32px/26px)`、`backdrop-filter:blur(20px)`、玻璃 hover `translateX(4px)`、0.5s 全属性 `transition` | `light-mode.css:10-39, 82-88, 149-158, 372-385` |
| 4 | 它包含 **Simulation 螺旋** 与 **lineage 脊线** 的浅色覆盖（`.spiral-*`, `.helix-axis`, `.lineage-*`），这些组件本身要被替换/改造，保留覆盖层等于保留死代码 | `light-mode.css:270-296, 308-344` |
| 5 | 它与 `_sass/_base.scss` 的 `body::before/::after` 极光**叠加**：即使删除了深色渐变，`body.light-mode::before/::after` 仍会在浅色页上渲染彩色光斑，与原则 1 直接冲突 | `_base.scss:36-74` × `light-mode.css:11-39` |
| 6 | 硬约束要求「浅色明亮」为**默认且唯一**；保留按时间（6:00–18:00）自动切换的机制，会让夜间访问者看到深色页，属于推翻用户已拍板的决策 | `head/custom.html:49-61`、`theme-switcher.js:9-18` |

**替换后的样式归属建议（Phase 3 执行）**：
1. 所有颜色/字体/圆角/阴影/断点 → `_sass/_variables.scss`（Sass 变量）+ `:root`（CSS 变量，见 §3.2）。
2. 主题原生组件（导航、侧栏、按钮、页脚、表格、语法高亮）→ 直接改对应 `_sass/*.scss`，编译进 `assets/css/main.scss`，**不再需要任何覆盖层**。
3. 主题没有的自定义组件（Simulation 网格、lineage tree、abstract modal）→ 新建 `_sass/_custom.scss`（或 `assets/css/site.css`，控制在 **≤120 行**），由 `main.scss` 末尾 `@import`；文件内不得出现 `!important`、不得出现 `body.light-mode` 前缀。
4. `head/custom.html` 中删除 `light-mode.css` 的 `<link>`、inline 判定脚本与 `theme-switcher.js`；`theme-color` 改为 `#FAF9F6`。
5. 全站 CSS 里不再出现 `.light-mode` / `.dark` 类名与 `prefers-color-scheme` 分支。

---

## 10. 落地建议（路径级，Phase 3 可直接照做）

### 10.1 必须改（决定视觉是否成立）

| 路径 | 动作 |
|---|---|
| `_sass/_variables.scss` | 全量替换颜色/字体栈/圆角/阴影/断点；`$primary-color` → `#14566B`，`$link-color` → `#14566B`，`$body-color/$background-color` → `#FAF9F6`，`$text-color` → `#1B2429`，`$border-color` → `#E3E6E2`；`$border-radius:6px`；`$box-shadow:0 1px 2px rgba(27,36,41,.04)`；`$global-transition` 改为 `color/background-color/border-color 120ms ease-out`；`$large:1024px`、`$x-large:1200px` |
| `assets/css/main.scss` | 末尾 `@import "custom";`（新增 `_sass/_custom.scss`）；确认不再引入 `light-mode.css` |
| `_sass/_base.scss` | 删极光伪元素、`#liquid-bg-canvas` 块、`h2::after`、`font[color]` 深色覆盖；改 `body` 17px/1.8、标题色/字距、链接下划线、`hr` 实线、代码块浅色 |
| `_sass/_animations.scss` | 删 `auroraMorph1/2`、`auroraPulse`、`glassShimmer`、`intro`；保留 reduced-motion 兜底 |
| `_sass/_page.scss` | 删 li 玻璃 hover、`h2` 彩色下划线与深色标题；按 §5.3 设间距；`#main` 改 grid 与 `max-width:1200px` |
| `_sass/_archive.scss` | 删 `::before/::after` 光环与 hover transform；改分隔线列表 |
| `_sass/_masthead.scss` / `_sass/_navigation.scss` | 去 `backdrop-filter`、内阴影、红色下划线；当前态改 `--c-accent` 静态底条；`.hidden-links` 浅色 |
| `_sass/_sidebar.scss` | 去头像重阴影、玻璃下拉、hover opacity；设 240px 宽与移动端横向档案条 |
| `_sass/_buttons.scss` | 收敛为 2 种按钮；删彩色族与发光 |
| `_sass/_footer.scss` | 去 blur、入场动画、`absolute bottom` 造成的贴底问题；改常规文档流 + 1px 上边框 |
| `_sass/_syntax.scss` | Rouge 语法配色改浅色（背景 `--c-code-bg`，注释 `--c-ink-3`，关键字 `--c-accent`） |
| `_includes/head/custom.html` | 见 §7.1 #3/#15：只留 1 套字体、academicons、MathJax、精简 favicon、`theme-color:#FAF9F6` |
| `_includes/author-profile.html` | 删第 23 行 `Follow` 按钮 |
| `_pages/simulating_fig.md` | 删第 12 行 spiral CSS、第 14 行 loading 占位、第 72 行 spiral JS；改 §8 分组网格 |
| `_pages/publications.md` | `<font color="#660000">` → 统一 class（44+ 处，可脚本批量替换） |
| `assets/css/light-mode.css` | **删除文件** |
| `assets/js/liquid-bg.js` / `shooting-stars.js` / `theme-switcher.js` / `simulation-spiral.js` / `collapse.js` | **删除文件** |
| `assets/css/simulation-spiral.css` / `collapse.css` | **删除文件** |

### 10.2 建议改（一致性 / 性能）

| 路径 | 动作 |
|---|---|
| `assets/css/abstract-modal.css` + `assets/js/abstract-modal.js` | 按 §6.10 改白底灯箱、去 blur/弹跳/红色关闭态 |
| `assets/css/lineage-tree.css` + `assets/js/lineage-tree.js` | 节点白底 1px 边、脊线改实线、当前节点 `--c-accent` 文字 |
| `_config.yml` | `exclude` 增加 `preview.html`（或直接删除该文件）；`sass.style: compressed` 保持不变 |
| `_includes/head.html` | `main.css` 保持；可加 `<meta name="color-scheme" content="light">` 防止浏览器深色控件 |
| `images/simulation/` | 为 9 个 GIF 生成首帧静帧；产物命名规则由 Phase 3 定（如 `*.poster.jpg`） |
| `_sass/_forms.scss` / `_tables.scss` / `_notices.scss` / `_utilities.scss` | 边框色换 `--c-line-strong`，focus ring 统一 |

### 10.3 不动

`_config.yml` 的 `url/baseurl/collections/defaults/plugins`、`CNAME`、`_data/navigation.yml`、`_pages/*` 的正文与 front matter（除上述标记清理）、`_publications/*`、`images/*` 原图、`assets/js/main.min.js`（主题功能脚本，含 greedy-nav 与 magnific-popup，保留）。

---

## 附：视觉验收清单（Phase 3 自检）

- [ ] 全站无 `backdrop-filter`、`radial-gradient` 背景、`text-shadow`、彩色 `box-shadow`、`rotate3d/perspective`。
- [ ] 全站 CSS 无 `!important`（主题第三方案例除外）、无 `.light-mode` / `.dark` 类名、无 `prefers-color-scheme` 分支。
- [ ] 首屏 `requestAnimationFrame` 循环数 = 0；自动播放 GIF 数 = 0；WebGL 上下文数 = 0。
- [ ] Web 字体请求数 = 1；字体文件大小（woff2 合计）< 60KB；无中文 Web Font。
- [ ] 所有文字 ≥12px；正文 17px/1.8；链接带下划线；正文对比度 ≥4.5:1。
- [ ] 所有可交互元素有 `:focus-visible` 的 2px `--c-accent` outline；控件边框 ≥3:1。
- [ ] 所有 hover 仅改变颜色/边框，无位移、缩放、阴影加深。
- [ ] Simulation 页 16 组图静态 2 列网格呈现，卡片不重叠，图注不截断，GIF 需点击才播放。
- [ ] `preview.html` 不可通过 `https://qingxiaxjtu.com/preview.html` 访问。
- [ ] 在 1440px / 1024px / 768px / 375px 四个宽度下无横向滚动，侧栏在 <1024px 折叠为横向档案条。
