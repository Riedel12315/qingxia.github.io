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
| 静态底色 | `centerRGB [247,247,246]`，全屏 R 通道 `246–247`（极淡、几乎均匀） |
| 鼠标搅动后 | R 通道范围 `223–247`，最大变化 **24/255**（拖尾明显可见但柔和） |
| 内容层叠 | 1440×900 截图确认导航 / 标题 / 图片卡片 / 文字全部清晰可见，未被背景遮挡 |
| 回归 | `node --check`、Sass 编译、`verify.py` **104/104 断言**全通过 |

## 5. 可调参数

都在 `assets/js/liquid-bg.js` 顶部与 FS_SRC 配色段：

- `IMPULSE` → 拖尾强度；`DECAY` → 尾迹绵长度；`DIFFUSE` / `CURL` → 扩散与旋涡。
- `IDLE_MS` / `IDLE_FPS` → 静止降帧节奏。
- `lBlue*` / `lSky` / `lMist` 与四个 `mix` 系数 → 静态晕染层次；`glowCol` / `glow * …` / `u_drag * fall * …` → 拖尾颜色与强度。

若想更明显：提高 `glow * 0.45` 与 `u_drag * fall * 0.42`；若想更淡：降低这两项或把 `col = mix(col, lBase, 0.30)` 调高。
