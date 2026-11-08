# 变更记录：恢复浅色极淡流体背景（2026-11-08）

## 1. 用户决策

用户要求把之前那种「粘稠液体流动、跟随鼠标搅动」的背景加回来，参考 DeepSeek 官网质感。
经确认，选择 **浅色极淡基调 + 全站统一**，不推翻已上线的浅色纸白学术风。

> 本记录**覆盖** `01-visual-direction.md` §1 原则 3、§7.1 #1，以及 `02-ux-spec.md` §0.1「动效」与 §7 性能预算中
> 「首屏零持续动画 / 删除 `assets/js/liquid-bg.js` / WebGL 上下文数 0 / rAF 循环数 0」的条款。
> 其余视觉、体验、信息架构与内容规范全部不变。

## 2. 实现

| 项 | 做法 |
|---|---|
| 代码来源 | 从 `d41757e` 恢复原 `assets/js/liquid-bg.js`（WebGL 片元着色器 + 域扭曲 fbm + 低分辨率流速场），保留经过验证的核心算法 |
| 配色 | 删除深色 / 浅色双皮肤分支，锁死单一浅色：基底 `#FAF9F6` (`0.980,0.976,0.965`)，晕染为极淡青蓝 `lBlue/lBlue2/lSky/lMist`；环境流动速度降低约 8 倍，静态近乎不动 |
| 拖尾 | 关键修复：原深色版 `smoothstep(0.10, 0.62, flowMag)` 的发光阈值在浅色下永远够不到，拖尾等于被关掉。改为 `smoothstep(0.015, 0.18, flowMag)`，并把 glow 与光标即时反馈提到 `0.45 / 0.42` |
| 层叠 | `_sass/_custom.scss` 新增 `#liquid-bg-canvas { position:fixed; inset:0; z-index:0; pointer-events:none }`，并给 `#main` / `.page__footer` 明确 `z-index:1`，保证背景不盖住正文；`@media print` 隐藏 |
| 挂载 | `_includes/head/custom.html` 以 `defer` 引入；预览页与 `build.py` 模板同步引入同一份脚本 |
| 移除的历史依赖 | `u_theme`、`isLight()`、`.light-mode`、`theme-switcher`、`MutationObserver` 主题监听、`liquid-bg-active`（aurora 已删）全部清除 |

## 3. 硬性约束（替代原「零动画」条款）

1. **仅限这一处**背景动效；不恢复流星、极光、玻璃拟态、日夜切换、3D 螺旋等其它已删装饰。
2. `prefers-reduced-motion: reduce` → 只渲染一帧静态，不启动 rAF。
3. `(hover: none)` 触屏设备 → 不启动（无「鼠标搅动」语义，也省电）。
4. WebGL 不可用 / 着色器编译失败 → 移除 canvas，回退到纯 `--c-bg`，无视觉回归。
5. 鼠标静止 2.2 秒且拖尾平息后降到 **12fps**；标签页隐藏时 `cancelAnimationFrame` 完全暂停，回来再恢复。
6. 保持 `powerPreference:'low-power'`、1.5x DPR 上限、帧时间自适应降采样、`aria-hidden="true"`、`pointer-events:none`。

## 4. 验证（真实浏览器，非静态推断）

用本机 Chrome 无头模式 + 调试协议、真实时间安排帧循环与逐帧鼠标事件：

| 检查 | 结果 |
|---|---|
| GLSL 编译 / WebGL 上下文 / canvas 插入 | 通过，`shaderErrors: []` |
| 静态底色 | `centerRGB [249,249,246]`，全屏 R 通道 `249–250`（纯净纸白、几乎无色差） |
| 鼠标搅动后 | R 通道范围 `205–249`，最大变化 **44/255**（拖尾清晰可见且清透） |
| 内容层叠 | 1440×900 截图确认导航 / 标题 / 图片卡片 / 文字全部清晰可见，未被背景遮挡 |
| 回归 | `node --check`、Sass 编译、`verify.py` **110/110 断言**全通过 |

## 5. 可调参数

都在 `assets/js/liquid-bg.js` 顶部与 FS_SRC 配色段：

- `IMPULSE` → 拖尾强度；`DECAY` → 尾迹绵长度；`DIFFUSE` / `CURL` → 扩散与旋涡。
- `IDLE_MS` / `IDLE_FPS` → 静止降帧节奏。
- `lBlue*` / `lSky` / `lMist` 与四个 `mix` 系数 → 静态晕染层次；`glowCol` / `glow * …` / `u_drag * fall * …` → 拖尾颜色与强度。

若想更明显：提高 `glow * 0.45` 与 `u_drag * fall * 0.42`；若想更淡：降低这两项或把 `col = mix(col, lBase, 0.30)` 调高。

## 6. 第二轮调整（同日，针对用户两条反馈）

**反馈 1：「鼠标跟随不明显，而且有点脏」。**
- 「脏」来自三处：静态 fbm 色场在纸白上形成灰蒙蒙底噪、暗角让边缘发灰、以及偏灰的拖尾色 + 过柔的过渡。
- 处理：静态四个 `mix` 系数降到 `0.12/0.09/0.08/0.06` 并 `mix(col, lBase, 0.68)` 拉回纸白；**移除暗角**、抖动降到 `0.0015`；拖尾改为清透冷青 `vec3(0.66,0.83,0.94)` + 亮核心 `vec3(0.90,0.96,0.985)` 双层，`smoothstep(0.010,0.085,flowMag)` 让边界更利落；`DECAY 0.24`、`IMPULSE 0.52` 让尾迹更绵长；光标影响半径 `0.07 → 0.11`。
- 结果：静态 `249–250` 几乎纯色，搅动 `205–249`（**44/255**）。拖尾截图为一条边缘柔和的淡蓝流带，无灰脏、无噪点、无暗角。

**反馈 2：手机端 Email / ResearchGate / Google Scholar / ORCID 排列散乱、不高级。**
- 根因：`<1024px` 时 `.sidebar` 用 flex 把头像与链接挤在同一行，链接列被压窄；纯文本 `Xi'an, China` 与带链接的 `<li>` 没有统一盒子，`fa-fw` 与 `ai-fw` 图标宽度不同，ORCID 被挤到第二行并出现缩进。
- 第一次修正把 grid 加在 `.sidebar` 上**无效**：`author-profile.html` 把所有内容包在 `<div itemscope>` 里，真正的 grid item 只有这一个包装层，导致姓名折成三行、链接竖排。已改为把 grid 落在 `.sidebar > [itemscope]`。
- 第二步（同日，仍不满意）：横排浅灰胶囊在手机上仍显得「框里分散」，不高级。
- 最终方案：**去掉卡片框与每个链接的独立小胶囊**，改为纯竖排列表——第一行头像 + 姓名/bio 并排，下面 location / email / 各社交链接**各占一行、左对齐、图标统一 16px、行底 1px 分隔线、整行 44px 命中区**，与正文无缝融入。`.sidebar` 去掉 `background/border/border-radius`，`.author__links` 改回 `column + nowrap`，`li` 用 `border-bottom:1px solid $line`、`::after { inset:0 }` 撑满整行。
- `390×844` 截图确认：五项条目整齐纵向排列、图标对齐、无孤立缩进、无散布小框。

**当前可调值**：`DECAY 0.24` / `IMPULSE 0.52` / `glow * 0.62` / `u_drag * fall * 0.52` / `mix(col, lBase, 0.68)`。想更明显提高 `glow` 与 `u_drag` 两项；想更淡则调高 `mix(col, lBase, …)`。移动端若想恢复窄卡片，把 `.sidebar` 的 `background/border` 加回、`.author__links > li` 的 `border-bottom` 换成 `border + border-radius` 即可。
