# Phase 3-C 独立验收报告 · 无构建静态预览页

- 执行者：`fe-preview`（独立视角，不替前序同事背书）
- 生成方式：`python .design/preview/verify.py`，本报告由脚本写入，非手写结论
- 生成时机：每次执行 `verify.py` 时重新计算并覆盖本报告（不记录手工结论）
- 环境：Python + Pillow 13.0.0 / Node v22 / Dart Sass 1.108.1 / `npx js-yaml`；本机无 Ruby/Jekyll、无浏览器自动化
- 写入范围：仅 `.design/preview/**`；`_sass/`、`assets/`、`_pages/`、`_includes/`、`_data/`、`images/`、`_config.yml` 全程只读
- 被测文件：`.design/preview/index.html`、`.design/preview/assets/main.css`

## 0. 结论速览

| 项 | 数值 |
|---|---|
| 执行断言 | 110 |
| 通过 | 110 |
| 未通过 | 0 |
| 业务代码告警（不计入交付物通过/失败） | 0 |
| 无法验证项（明确不计入通过） | 8 |
| 问题清单 | 共 4 条：待裁定 0 / 已闭环 3 / 不构成阻塞 1 |

> 通过项均为脚本实际断言结果；**未验证项一律不写作「通过」**。
> 本轮无业务代码告警。
> 本报告为**最终复验快照**：Phase 3-A / 3-B / 3-C 与 #9 / #10 修复均已落盘并复验，F1–F3 闭环、F4 不构成阻塞；后续如业务文件再变动，重跑 `verify.py` 即可刷新状态。


## 1 数据计数（YAML → JSON）

| 检查项 | 期望 | 实测 | 结果 |
|---|---|---|---|
| npx js-yaml 解析 _data/simulation.yml | exit 0 | exit 0 | ✅ |
| groups | 3 | 3 | ✅ |
| items | 13 | 13 | ✅ |
| images | 16 | 16 | ✅ |
| 有 pdf 的子项 | 10 | 10 | ✅ |
| 无 pdf 的子项 | 3 | 3 | ✅ |
| 多图子项（>=2 图） | 2 | 2 | ✅ |
| type=gif 图 | 9 | 9 | ✅ |
| type=still 图 | 7 | 7 | ✅ |
| 无 pdf 子项 id | cad-05, cad-06, cfd-04 | cad-05, cad-06, cfd-04 | ✅ |
| 多图子项 id | cad-04, cfd-01 | cad-04, cfd-01 | ✅ |
| 分组 cad 项/图 | - | 6 项 / 8 图 | — |
| 分组 cfd 项/图 | - | 5 项 / 6 图 | — |
| 分组 img 项/图 | - | 2 项 / 2 图 | — |

## 2 预览页 DOM 契约（HTMLParser）

| 检查项 | 期望 | 实测 | 结果 |
|---|---|---|---|
| index.html 存在且非空 | >0 字节 | 49577 字节 | ✅ |
| HTML 标签配平 / HTMLParser 无异常 | 0 错误 | 0 错误 | ✅ |
| section.sim-group | 3 | 3 | ✅ |
| article.sim-item | 13 | 13 | ✅ |
| figure.sim-figure | 16 | 16 | ✅ |
| a.sim-pdf | 10 | 10 | ✅ |
| button.sim-play（播放按钮） | 9 | 9 | ✅ |
| 播放按钮默认 hidden | 9 | 9 | ✅ |
| h1 全页恰好 1 个 | 1 | 1 | ✅ |
| h1.class = page__title | 1 | 1 | ✅ |
| h1 文本 = Simulation | Simulation | Simulation | ✅ |
| data-fig-index 连续 0..15 | [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] | [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] | ✅ |
| sim-item--wide（多图子项） | 2 | 2 | ✅ |
| sim-figs--weighted（cfd-01） | 1 | 1 | ✅ |
| img[src$=.gif]（首屏 GIF 请求来源） | 0 | 0 | ✅ |
| 分组计数文本 | 6 项 · 8 图 \| 5 项 · 6 图 \| 2 项 · 2 图 | 6 项 · 8 图 \| 5 项 · 6 图 \| 2 项 · 2 图 | ✅ |
| 16 张 sim 图 alt 非空 | 16 | 16 | ✅ |
| 16 张 sim 图 alt 互异 | 16 | 16 | ✅ |
| 16 张 sim 图显式 width/height | 16 | 16 | ✅ |
| 16 张 sim 图 loading=lazy | 16 | 16 | ✅ |
| data-poster 属性数 | 16 | 16 | ✅ |
| data-full 属性数 | 16 | 16 | ✅ |
| data-gif 非空（GIF 本体） | 9 | 9 | ✅ |
| 绝对路径 /images/simulation/ 残留 | 0 | 0 | ✅ |
| <details> 折叠块（首页旧闻 + 代表作 + 说明面板） | >=2 | 3 | ✅ |
| 16 条图注逐字取自 YAML | 0 条缺失 | 0 条缺失 | ✅ |
| 图注无省略号 | 0 处 | 0 处 | ✅ |
| sim-item__actions（有 PDF 才渲染） | 10 | 10 | ✅ |
| header.masthead 外壳 | 1 | 1 | ✅ |
| #main[role=main].page 外壳 | 1 | 1 | ✅ |
| div.sidebar 左侧栏 | 1 | 1 | ✅ |
| div.archive 右主栏 | 1 | 1 | ✅ |
| 5 项导航 li.masthead__menu-item（不含站点名 --lg） | 5 | 5 | ✅ |
| 当前项 aria-current="page" | 1 | 1 | ✅ |
| author__links 学术链接条目 | 5 | 5 | ✅ |
| author__links 链接文本 | - | Xi'an, China, Google Scholar, ResearchGate, ORCID, Email | — |
| link[href=assets/main.css] | 1 | 1 | ✅ |
| link[href=../../assets/css/simulation.css] | 1 | 1 | ✅ |
| script[src=../../assets/js/simulation.js][defer] | 1 | 1 | ✅ |
| 模拟减少动效勾选框 | 1 | 1 | ✅ |
| 改造说明面板 | 1 | 1 | ✅ |

## 3 资源可达性（相对路径解析）

| 检查项 | 期望 | 实测 | 结果 |
|---|---|---|---|
| 本地资源引用全部存在 | 0 个 404 | 0 个 404 | ✅ |
| 本地资源引用总数 | - | 88 | — |
| 外部链接（PDF / 学术站点，不做存在性断言） | - | 24 | — |
| poster 文件存在 | 16 | 16 | ✅ |
| 16 poster 可被 Pillow 打开 | 0 失败 | 0 失败 | ✅ |
| 单张 poster < 150 KiB | 0 超限 | 0 超限 | ✅ |
| 16 张原图合计 | - | 26848641 B = 26.85 MB（十进制）/ 25.60 MiB | — |
| 16 张静帧合计 | - | 808037 B = 789.1 KiB / 0.77 MiB | — |
| 16 张静帧合计（与团队最终复核一致） | 808037 | 808037 | ✅ |
| 压缩率 | - | 96.99%（26848641 B → 808037 B） | — |
| 压缩率 >= 97%（按 1 位小数四舍五入） | >= 97.0% | 97.0% | ✅ |
| 最大单张 poster | - | INqhYJLjSXtRsdy.poster.jpg (139654 B) | — |
| 最大单张 poster（与团队最终复核一致） | 139654 | 139654 | ✅ |
| 生成器含 budget = min(MAX_BYTES, src_bytes) 规则 | 存在 | 存在 | ✅ |
| 生成器含 shutil.copyfile 零重编码分支 | 存在 | 存在 | ✅ |
| 静帧比原图还大的条目（静图重编码） | - | 无 | — |
| F3 该静帧与原静图字节完全一致 | - | 是（75300 B / 75300 B） | — |
| main.css 中 url(../fonts/...) 字体引用（共 12 条） | - | 12 条从预览位置解析到 .design/preview/fonts/ 不存在 | — |
| 预览页使用 Font Awesome / academicons 图标元素 | 0（故上述字体不会被请求） | 0 | — |

## 4 减法验收（grep）

| 检查项 | 期望 | 实测 | 结果 |
|---|---|---|---|
| 扫描文件数（业务代码） | - | 92 | — |
| 排除文件数（_sass/vendor/** + 第三方 vendor js + main.min.js） | - | 95 | — |
| backdrop-filter | 0 命中 | 0 命中 | ✅ |
| radial-gradient | 0 命中 | 0 命中 | ✅ |
| rotate3d\|perspective\|rotateY | 0 命中 | 0 命中 | ✅ |
| .light-mode | 0 命中 | 0 命中 | ✅ |
| prefers-color-scheme | 0 命中 | 0 命中 | ✅ |
| animation-iteration-count: infinite | 0 命中 | 0 命中 | ✅ |
| simulation-spiral | 0 命中 | 0 命中 | ✅ |
| 旧霓虹色 #FF6363\|#A855F7\|#FF8585 | 0 命中 | 0 命中 | ✅ |
| 排除文件中的命中数（单独说明） | - | backdrop-filter=0; radial-gradient=0; rotate3d\|perspective\|rotateY=0; .light-mode=0; prefers-color-scheme=0; animation-iteration-count: infinite=0; simulation-spiral=0; 旧霓虹色 #FF6363\|#A855F7\|#FF8585=0 | — |
| 应删文件（8 个）确实不存在 | 0 个仍存在 | 0 个仍存在 | ✅ |
| 对已删文件的残留引用（grep 等价扫描） | 0 条 | 0 条 [] | — |
| 液体背景脚本按用户新决策恢复 | 存在 | 存在 | ✅ |
| head/custom.html 引用液体背景 | 1 | 1 | ✅ |
| 预览页引用同一份液体背景 | 1 | 1 | ✅ |
| 液体背景 / 触屏设备停用 hover:none | 包含 | 包含 | ✅ |
| 液体背景 / 尊重 prefers-reduced-motion | 包含 | 包含 | ✅ |
| 液体背景 / 隐藏标签页暂停 rAF | 包含 | 包含 | ✅ |
| 液体背景 / 静止降帧 IDLE_FPS | 包含 | 包含 | ✅ |
| 液体背景 / WebGL 不可用回退 | 包含 | 包含 | ✅ |
| 液体背景 / 单一浅色纸白配色 | 包含 | 包含 | ✅ |
| 液体背景 / 无双皮肤 u_theme | 0 | 0 | ✅ |
| 液体背景 / 无 .light-mode 依赖 | 0 | 0 | ✅ |
| 液体背景 / 无主题 MutationObserver | 0 | 0 | ✅ |
| 液体背景 / 无 aurora class 依赖 | 0 | 0 | ✅ |
| canvas 层叠：内容 z-index 高于背景 | 含规则 | 含规则 | ✅ |
| 移动端档案：grid 落在 <div itemscope> 包装层 | 含 .sidebar > [itemscope] | 含 | ✅ |
| 移动端档案：统一 pill 高度与 44px 命中区 | 两者具备 | 两者具备 | ✅ |
| 移动端档案：fa-fw / ai-fw 图标宽度归一化 | 含 flex: 0 0 15px | 含 | ✅ |
| 流体背景：静态压回纸白（消除灰底噪） | 含 mix(col, lBase, 0.68) | 含 | ✅ |
| 流体背景：已移除让边缘发灰的暗角 | 0 | 0 | ✅ |
| 流体背景：清透冷青拖尾与更绵长尾迹 | 含新配色 + DECAY 0.24 | 含 | ✅ |

## 5 语法与构建

| 检查项 | 期望 | 实测 | 结果 |
|---|---|---|---|
| node --check assets/js/simulation.js | exit 0 | exit 0  | ✅ |
| main.scss 保留 Jekyll front matter（未删 / 未改业务文件） | 前 2 行均为 --- | 是 | ✅ |
| 原样命令（含 front matter）按预期失败 exit 65 | exit 65 | exit 65 / Error: expected "{". | ✅ |
| 剥离 front matter + --quiet --style=compressed 编译 | exit 0 | exit 0 | ✅ |
| 产物 main.css 字节数（新增液体背景层叠规则后应 > 旧基线 104685） | > 104685 | 106101 | ✅ |
| 编译无 Error（--quiet 抑制弃用告警） | 0 Error | 0 Error | ✅ |
| Sass 弃用告警（未加 --quiet 的诊断运行；显式打印 / 折叠重复） | - | 20 / 328；类型 import / if-function / global-builtin / slash-div，全部来自 _sass/vendor/ 的 breakpoint 与 susy，非错误 | — |
| HTML 标签配平（见 §2） | 0 错误 | 0 错误 | ✅ |

## 6 附加交叉核对（独立补充）

| 检查项 | 期望 | 实测 | 结果 |
|---|---|---|---|
| /resume 仅由 cv.md 声明 | 1 个文件 | 1 个：_pages/cv.md | ✅ |
| data-abstract-key 精确绑定 | 44 | 44 | ✅ |
| 旧 <font color="#660000"> 已清除 | 0 | 0 | ✅ |
| about.md Setext H1（=== 下划线） | 0 | 0 | ✅ |
| author-profile.html 无 Follow 按钮 | 0 | 0 | ✅ |
| Web 字体仅 1 套 Inter | 1 | 1 | ✅ |
| _config.yml exclude 含 .design/ / preview.html / tools/ | 3 项齐备 | .design/, preview.html, tools/ | ✅ |
| head/custom.html + head.html 的本地引用 | - | assets/css/academicons.css, assets/css/main.css, assets/js/liquid-bg.js, images/mstile-144x144.png, images/safari-pinned-tab.svg | — |
| 排除 Jekyll 编译产物 | - | assets/css/main.css（非静态文件） | — |
| head 引用的本地静态资源 0 个 404 | 0 缺失 | 0 缺失：无 | ✅ |
| 旧 3 个 favicon 文件名残留引用（全业务文件） | 0 条 | 0 条 | ✅ |
| 新 favicon 主资源 images/mstile-144x144.png 存在 | 存在 | 存在 1164 B | ✅ |
| head 未引用 manifest / msapplication-config（死文件不构成 404） | 0 条 | 0 条 | ✅ |
| F2 修复：.sim-page 前缀重置 .sim-figs__cell（margin/background） | 规则存在 | 已存在（含 margin:0 + background:transparent） | ✅ |
| F3 修复：16 张静帧均不大于各自源图 | 0 项 | 0 项 | ✅ |
| F3 修复证据：该 poster 与原静图字节一致（免重编码） | 一致 | 一致 | ✅ |

## 7. 无法验证项（不写作「通过」）

1. Jekyll / kramdown 真实构建（`bundle exec jekyll build`）——本机无 Ruby/Jekyll，未执行。
2. `<details markdown="1">` 内部 markdown 是否被 kramdown 正确渲染为 `<ul>/<li>`——依赖 Jekyll 构建。
3. 浏览器 1440 / 1024 / 768 / 375 四宽度横向滚动与容器查询列数（`.sim-grid` 2/1 列）——无浏览器自动化。
4. axe DevTools / Lighthouse Accessibility 扫描（0 critical / 0 serious）——无浏览器与工具链。
5. 灯箱焦点循环、Esc 焦点归还、GIF 状态机（POSTER→CONFIRM/LOADING→PLAYING→ERROR）、10s 超时、`visibilitychange` 释放解码——均为运行时行为，只做了静态代码审阅，未实际点击验证。
6. Network 面板 `.gif` 请求数 0 / 播放后恰好 +1 / 首屏 ≤12 请求 ≤600 KB、CLS <0.05、流体背景静止时降到 12fps / 触屏与减少动效下停用的实际帧率、`prefers-reduced-motion` 下 `getComputedStyle().transitionDuration === '0s'`——静态断言已覆盖，运行时帧率需真实浏览器测量。
7. 预览页本身的浏览器渲染结果（16 张图是否可见、视图切换、灯箱、减少动效勾选框的视觉效果）——本报告只对 DOM 结构与文件路径做断言，未打开浏览器，不声称「渲染通过」。
8. 真实站点 `https://qingxiaxjtu.com/preview.html` 是否 404（未部署、无网络验证）。

## 8. 问题清单与闭环状态

> 验收过程共发现 4 条；经 fe-theme / fe-simulation 修复并由本脚本复验后，**待裁定 0 条**。以下为分组归档，历史现象与复验证据均予以保留。

### 8.1 已解决 / 已闭环（3 条）

| 编号 | 级别 | 状态 | 文件 / 现象 |
|---|---|---|---|
| F1 | 中 | 已闭环 | `_includes/head/custom.html:11-13` 原引用 3 个不存在的 favicon 文件：`images/apple-touch-icon-180x180.png`、`images/favicon-32x32.png`、`images/favicon.ico`（全仓库 find 无任何同名文件，仅 `safari-pinned-tab.svg` 存在；Gemfile 的 `:jekyll_plugins` 只有 jekyll-feed / jekyll-sitemap / hawkins，无 favicon 生成插件，因此不是构建期生成物）。真实站点每次页面加载都会产生 3 个 404，与「首屏请求 ≤12」的性能预算口径冲突；文件头注释写「favicon (3 assets)」但实际有 4 个 link。属 fe-theme 的 head 收尾范围。**复验（§6）**：fe-theme 已闭环修复（任务 #10 已完成），改为 `rel=icon` + `apple-touch-icon` 同时指向真实存在的 `images/mstile-144x144.png`，保留 `safari-pinned-tab.svg`；旧文件名 0 残留、head 本地引用 0 个 404，本条关闭。 |
| F2 | 中 | 已闭环 | `_sass/_archive.scss:55-62,70` 的 `.archive li { margin-bottom:.5em; ... }` 与 `.archive li:hover { background:$surface-2 }` 会作用到 Simulation 网格的 `<li class="sim-figs__cell">`：因为 `_pages/simulating_fig.md` 用 `layout: archive`， `.sim-page` 位于 `.archive` 内部，原 `assets/css/simulation.css:51` 只写了 `min-width:0`。**复验（§6）**：fe-simulation 已闭环修复（任务 #9 已完成），在 `assets/css/simulation.css` 增加 `.sim-page .sim-figs > .sim-figs__cell` 正常态 + `:hover` 态的限定重置（margin/padding/border/border-radius/background/color/font-size/line-height/list-style/transition）；特异性 (0,3,0) / hover (0,4,0) 压过 `.archive li` (0,1,1)、`.archive li:hover` (0,2,1)、`.archive > ul > li` (0,1,2)，并顺带挡下 `_sass/_base.scss:122` 的 `ul li` 行高与文字色；未改 `_sass/`，`!important` 仍 0 处，本条关闭。 |
| F3 | 低 | 已闭环 | `images/simulation/sWkfSq3ZENQJ7h5.poster.jpg` 原为 100,613 B，反而大于其源静图 `sWkfSq3ZENQJ7h5.jpg` 的 75,300 B（其余 15 张静帧均显著小于原图）；静图无需重编码，直接复用原 `.jpg` 可省 ~25 KB，不违反 <150 KiB 预算。**复验（§3 / §6）**：fe-simulation 已闭环修复（任务 #9 已完成）——根因是 695×555 紧凑 JPEG 被放大到 800×639 再 q80 重编码；改为把原 JPEG 逐字节 `shutil.copyfile` 成 `.poster.jpg`（75,300 B，与原静图字节完全一致），保持 16 个 figure 统一的 `<stem>.poster.jpg` 路径契约，零重编码 / 零画质损失。生成器 `tools/make_posters.py` 已加 `budget = min(MAX_BYTES, src_bytes)` 与超限 `raise RuntimeError`，二次运行幂等。16 张静帧合计 **808,037 B**，无一张比源图更大、无一张 >150 KiB，最大 139,654 B，压缩率 96.99%，本条关闭。 |

### 8.2 不构成阻塞（1 条）

| 编号 | 级别 | 状态 | 文件 / 现象 |
|---|---|---|---|
| F4 | 提示 | 不构成阻塞 | 任务书要求的外壳是 `<header class="masthead">` 与 `<div id="main" role="main" class="page">`；仓库真实代码是 `_includes/masthead.html` 的 `<div class="masthead">` 与 `_layouts/archive.html` 的 `<div id="main" role="main">`（无 `page` class，右栏由 `.archive` 承载）。预览页按要求写了 `class="page"`，并在内联样式里用 `#main.page { float:none; width:auto }` 抵消 `.page` 在 ≥64em 的 `width:83% / float:right`，避免桌面两列网格被压窄。属预览页专用适配，真实站点无需改动。 |

### 8.3 待裁定（0 条）

**无。** F1–F3 已闭环，F4 为预览页专用适配、无需主理人裁定。

### 与前序同事报告口径不一致 / 需对齐的点（本轮已全部对齐）

- `F1`（已关闭）：head 原声明「favicon 精简到 3 个」，但 3 个被引用文件均不在仓库中；fe-theme 已删除 3 行并改用真实存在的 `mstile-144x144.png`。
- `F2`（已关闭）：`assets/css/simulation.css` 的 DOM 契约实现本身正确，冲突来自主题层 `_sass/_archive.scss` 的全局 `li` 规则；fe-simulation 已在 sim CSS 内用 `.sim-page` 前缀限定重置，未改 `_sass/`。
- `F3`（已关闭）：1 张静帧曾比源静图大 25 KB；复验已替换为与原图字节一致的文件。

### 已解决 / 已闭环的复验证据

- **F1 / favicon**：`_includes/head/custom.html` 现为 `rel=icon` 与 `apple-touch-icon` 同时指向 `images/mstile-144x144.png`（1,164 B，144×144 PNG，实测存在），加 `safari-pinned-tab.svg`（1,981 B）；旧的 `apple-touch-icon-180x180.png` / `favicon-32x32.png` / `favicon.ico` 在全部业务文件中 **0 残留引用**。本报告 §6 逐条解析 `head.html` + `head/custom.html` 的本地 href/src，排除 Jekyll 编译产物 `assets/css/main.css` 后 **0 个 404**；并确认 head 未引用 manifest / msapplication-config，`images/manifest.json` 中指向不存在图标的条目是未被链接的死文件、浏览器不会请求，按 fe-theme 提示以「head 实际引用」而非「全仓扫描」判定。
- **F2 / 网格样式污染**：`assets/css/simulation.css` 新增 `.sim-page .sim-figs > .sim-figs__cell` 正常态与 `:hover` 态的限定重置（`margin:0` / `padding:0` / `background:transparent` / `transition:none` 等），§6 已断言规则存在；预览页直接链接该 CSS，因此展示的是修复后的真实状态。
- **F3 / 超大静帧**：`sWkfSq3ZENQJ7h5.poster.jpg` 现为 75,300 B，与源静图 `sWkfSq3ZENQJ7h5.jpg` **字节完全一致**（§3 / §6 已断言），16 张静帧中不再有比源图更大者，首屏少传约 25 KB。最终实测：16 张静帧合计 **808,037 B**、原图 26,848,641 B、压缩率 **96.99%**、单张均 <150 KiB、最大 **139,654 B**；生成器 `budget = min(MAX_BYTES, src_bytes)` 与 `shutil.copyfile` 零重编码分支均已断言存在。

### 已澄清 / 不构成问题

- **Sass front matter**：按主理人与 fe-theme 的更正，改用 OS 临时目录生成剥掉 `---\n---` 的 `qx-main.scss`、在仓库根执行 `npx sass --load-path=_sass --no-source-map --quiet --style=compressed`，本报告 §5 实测 EXIT=0、产物 **104,685 B**，与 fe-theme 完全一致。任务书「原样命令」的 exit 65 是 Jekyll front matter 的预期行为，**不是代码错误**；`main.scss` 前 2 行 front matter 保持原样，未删未改。此前 143,214 B 的产物是未加 `--style=compressed` 的 expanded 输出，已替换。
- `_config.yml:125-128` 的 `exclude` 已含 `.design/`、`preview.html`、`tools/`（§6 已断言），无需追加。
- `assets/css/simulation.css` 使用自带硬编码色板（`var(--c-*)` 引用 0、无 `:root`），与编译后的 `main.css` 同时 `<link>` 不存在「变量未定义导致失色」的隐藏依赖；此条为主题层核对结论，本报告仅记录、未做浏览器运行时验证。

## 9. 复现方式

```bash
cd "C:/Users/Qing Xia/WorkBuddy/Homepage"
python .design/preview/build.py     # 从 _data/simulation.yml 生成 index.html
python .design/preview/verify.py    # 复跑全部断言、重编译 main.css 并重写 VERIFY.md
```

`verify.py` 内部用 `tempfile.TemporaryDirectory()` 生成剥掉 front matter 的 `qx-main.scss`，再从仓库根执行：

```bash
npx --yes sass --load-path=_sass --no-source-map --quiet --style=compressed \
    <临时目录>/qx-main.scss .design/preview/assets/main.css
```

> 双击 `.design/preview/index.html` 即可在 `file://` 下查看；图片 / CSS / JS 均以相对路径 指向仓库原文件，本报告 §3 已用 `os.path.exists` 逐条证明路径可解析。

### 已知预览限制（非失败）

- 编译产物 `main.css` 按任务书放在 `.design/preview/assets/`，而其中 12 条 `url(../fonts/fa-*.woff2|ttf|…)` 原本相对 `assets/css/`；从预览位置会解析到 不存在的 `.design/preview/fonts/`。预览页刻意**不使用任何 Font Awesome / academicons 图标元素**，侧栏与按钮改用纯文本 / `↗`，因此这些字体不会被请求，也不影响浅色主题观感。若以后要在预览页加图标，需把 `assets/fonts/` 复制一份到 `.design/preview/fonts/`。
- 预览页的导航链接不跳转到真实栏目（单文件预览，无其它页面），点击 5 项导航或侧栏链接会切到「首页概览」或保持 Simulation 视图；`aria-current` 随视图同步移动。
- 首页概览为 `_pages/about.md` 的代表性摘录（News 8 条 + 折叠摘要、代表作 5 条 + 折叠摘要、Awards 6 条），非全文，用于展示留白 / 1px 线 / 单一强调色与 `<details>` 折叠。
