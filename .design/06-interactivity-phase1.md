# 交互改造 Phase 1 · 论文库 + 全站微交互

> 目标：把「自上而下读长文」变成「按条件找东西」。不改页面结构、不迁移内容、不引入框架。

## 1. 判断依据

之前的交互都集中在表层反馈（hover 变色、下划线、放大镜、滚动浮现），阅读路径本身没变。Publications 有 44 篇论文 + 14 条专利/软著/在投，全部纵向平铺，找一篇要滚很久。所以第一阶段的重点是**让内容可操作**，而不是继续加动效。

## 2. A · 论文库化

### 2.1 数据来源
- 不迁移正文。`publications.js` 读取页面已有的 `#abstract-data` JSON（44 条，含 `title / authors / journal / year / badges / abstract`），给每个 `<li>` 打 `data-year / data-type / data-topics`。
- 年份：优先用 JSON 的 `year`，无记录时用正文里最后一个 4 位年份；专利等无年份条目不进入年份筛选（仍出现在「全部」）。
- 类型：按最近的 `h2` 区块映射 —— `Publications` → 期刊/会议（44）、`Revision submitted / In revision / Submission / In Preparation` → 在投/在准备（4）、专利区块 → 专利（9）、`软件著作权` → 软件著作权（1）。
- 主题：按标题 + 摘要的关键词规则归为相场、拓扑优化、增材制造、流体/CFD、图像处理、机器学习；匹配不到归 `other`，不出现在主题 chips 里。

### 2.2 交互规格

| 项 | 行为 |
|---|---|
| 筛选条 | 年份 / 类型 / 主题三组 chip，组内单选、组间 AND；实时计数「显示 N / 58 条」 |
| URL 同步 | `?year=2025&type=journal&topic=phase-field`，用 `history.replaceState`；刷新/分享/后退都能还原 |
| 清空 | 有筛选时出现「清除筛选」；空结果显示虚线框提示 |
| 就地摘要 | 点 `Abstract` 在当前条目下方展开面板（标题 / 作者·期刊·年 / badges / 摘要），按钮变「收起摘要」，`aria-expanded` 同步；**替代原来的模态弹窗**，不打断阅读 |
| 复制引用 | 每条末尾「复制引用」，复制该条纯文本（排除按钮与摘要面板），toast 提示「引用已复制」 |
| 渐进增强 | 禁用 JS 时列表完整可读，只是没有筛选条与摘要面板 |

### 2.3 为什么不做 BibTeX
44 条论文的 BibTeX 需要可靠的作者/标题/卷期页码字段。正文里作者与标题都用逗号分隔，自动解析容易产出错误条目；错误 BibTeX 比没有更糟。本阶段只提供「复制引用文本」，等论文条目结构化后再做 BibTeX。

## 3. D · 全站微交互

| 项 | 行为 | 设计考量 |
|---|---|---|
| 阅读进度 | 视口顶部 2px 青蓝细线，`scaleX(0→1)`；页面高度不足 1.6 屏时不显示 | 只在长页面出现，短页面不制造「进度焦虑」；`requestAnimationFrame` 合并滚动事件 |
| 标题锚点 | `h2` hover/focus 时右侧出现 `#`，点击复制该节链接 + toast；移动端常显 45% 透明度 | 只在 h2 上做，避免每个标题都冒图标；键盘可聚焦 |
| Toast | 底部居中、深墨底白字、1.8s 自动消失，`role="status" aria-live="polite"` | 复制引用/复制链接共用；不打断操作 |

## 4. 刻意不做的

- 不做 hover 浮层快捷菜单（会遮挡相邻条目、移动端无 hover）。
- 不做 tag 云、不做论文卡片化（会把 44 条变成 44 张大卡，反而更难扫读）。
- 不做无限动画、不做自动轮播、不做数字滚动。
- 不引入框架或构建工具。

## 5. 性能与可访问性

| 项 | 结果 |
|---|---|
| 新增 JS | `publications.js` ≈ 9.6 KB、`page-tools.js` ≈ 3.6 KB（均未压缩，defer） |
| 新增 CSS | `_publications.scss` + `_page-tools.scss` 并入 `main.css`，约 +4.5 KB |
| 运行时 | 只在 publications 页解析 58 个 `<li>`；筛选是切换 `hidden`，无重排风暴；滚动用 rAF 合并 |
| 键盘 | chips 是原生 `<button>`；摘要是原生 `<button aria-expanded>`；锚点是 `<a href="#id">` |
| 屏幕阅读器 | 计数 `role="status"`、toast `role="status"`、摘要按钮 `aria-controls` / `aria-expanded` |
| 减少动效 | 进度条与 toast 只有 140ms opacity，`_animations.scss` 的 reduce 兜底会归零 |

## 6. 验证记录（真实 Chrome + CDP）

| 检查 | 结果 |
|---|---|
| 工具条 | 生成 20 个 chip；58 个条目；年份 2020–2026；类型 4 类；主题 7 类 |
| 类型计数 | journal 44 / preprint 4 / patent 9 / software 1 |
| 筛选 2025 | 显示 10 / 58，URL `?year=2025`，chip `aria-pressed=true`，清除按钮出现 |
| 清除 | 回到 58 / 58，URL 清空 |
| 就地摘要 | 按钮变「收起摘要」，`aria-expanded=true`，面板 911 字符 |
| 复制引用 | 授予剪贴板权限后 toast「引用已复制」 |
| 进度条 | 滚动 50% 时 `scaleX(0.5424)`、可见 |
| 锚点 | 10 个 h2 各 1 个 `#` 链接，`aria-label="复制此节链接"` |

自动化验收：141 → 待补断言后重跑。

## 7. 可调参数

| 想要 | 改哪里 |
|---|---|
| 改主题归类 | `publications.js` 顶部 `TOPIC_RULES` 正则与 `TOPIC_LABEL` |
| 改类型名称 | `publications.js` 的 `TYPE_LABEL` / `TYPE_BY_SECTION` |
| 进度条颜色/高度 | `_page-tools.scss` 的 `#read-progress` |
| 关闭论文库 | 删 `_pages/publications.md` 末尾的 `publications.js` 引用；列表恢复纯静态 |
| 关闭全站微交互 | 删 `_includes/scripts.html` 的 `page-tools.js` 引用 |
