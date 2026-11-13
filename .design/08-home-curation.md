# 交互改造 Phase 3 · 首页策展化

> 目标：首页从「一屏读不完的长文」变成「有入口的目录」，但不删除任何已有内容。

## 1. 改动结构

在原有顺序中插入三个区块，其余内容逐字保留：

```
简介
Hero（新增：定位 / 数字 / 两个入口）
## Research（原文保留）
Research topics（新增：4 个主题入口）
## News（原文保留，8 条 + 31 条折叠）
## Magnum Opus（原文保留）
Selected work（新增：3 张精选卡）
+ 原 Magnum Opus 列表（5 条 + 10 条折叠，逐字保留）
## Awards（原文保留）
```

`h1` 仍为 1 个，`<details>` 仍为 2 个，News / Magnum Opus / Awards 的条目一条未删。

## 2. Hero：第一屏给出「你是谁 + 去哪看」

| 元素 | 内容 | 设计考量 |
|---|---|---|
| 眉标 | `Ph.D. in Science · Xi'an Jiaotong University · Huawei TopMinds` | 三行信息压成一行小字，先给身份坐标 |
| 大标题 | `Shape topology optimization, multi-scale multi-physics, and the digital twin.` | 一句话研究定位，取代「读完两段才知道你做什么」 |
| 说明 | 把物理模型从真实空间投影到数字空间做等效实验 | 用现有 Research 段落的原意，不新增主张 |
| 数字 | 43 SCI / 32 JCR Q1 / 7 Highly Cited | 全部来自原文，不夸大；数字用强调色，是整页唯一的高对比块 |
| 入口 | `Browse publications` / `Explore simulations` | 两个最常用的去向；实心 + 描边区分主次 |

**为什么用自有 `.home-cta` 而不是 `.btn`**：`.page__content a` 的颜色规则特异性高于 `.btn`，会把按钮文字改成正文链接色。自定义类把颜色收回到按钮自身，避免全局覆盖。

## 3. Research topics：把「研究兴趣」变成可点的入口

四张卡：Phase-field modelling / Topology optimization / Additive manufacturing / Fluid & CFD。

- 每张卡链接到 **Phase 1 的筛选论文库**：`/publications/?topic=phase-field` 等。点进去直接看到该主题的论文，而不是回到全量列表再找。
- 卡片只写一句范围描述（Cahn–Hilliard、TPMS、FDM、Navier–Stokes），不重复论文标题。
- 四列在 ≥900px 并排，600–900px 两列，<600px 单列；`margin-top:auto` 保证「View papers」始终贴底，四张卡高度一致。

这是本次改造里唯一「内容之间互相跳转」的部分：首页 → 筛选后的论文库，形成闭环。

## 4. Selected work：三张卡，不替代完整列表

- 取 Magnum Opus 前 3 条，卡片显示 venue · year、标题、badge（Cover / Highly Cited / JCR Q1）、`Related papers` 链接。
- 完整 Magnum Opus 列表（5 + 10 条折叠）原样保留在卡片下方——**精选是入口，完整列表是记录**，学术主页不能为了好看而删条目。
- 第 3 条原文没有卷号/年份，卡片只写 `Physics of Fluids` + `JCR Q1 · TOP`，不编造年份。

## 5. 刻意不做的

- 不做全屏大图 Hero、不做视频背景、不做滚动视差。
- 不改导航、不改页面 permalink、不删任何原有段落。
- 不做「研究地图」的连线/网络图（需要额外数据，且容易变成装饰）。
- 不做卡片 hover 上浮/放大（沿用纸面风格：只变边框色）。

## 6. 性能与可访问性

| 项 | 结果 |
|---|---|
| 新增 CSS | `_home.scss` 约 5 KB（未压缩），并入 `main.css` |
| 新增 JS | 0（主题入口是普通链接，无脚本依赖） |
| 响应式 | 4 列 / 2 列 / 1 列三档；Hero 卡片在 <600px 收窄内边距 |
| 语义 | 每个区块 `<section aria-labelledby>`；主题卡是 `<a>`，可键盘聚焦；卡片标题用 `h3` |
| 对比度 | 数字 `#14566B` 对纸白 7.75:1；卡片描述 `#626F75` 对白底 5.1:1 |
| 减少动效 | 只有 140ms 颜色过渡，reduce 下由全局兜底归零 |

## 7. 验证记录（真实 Chrome）

| 检查 | 结果 |
|---|---|
| 结构 | `.home-hero` 存在、`.home-topic` 4 个、`.home-card` 3 个 |
| 数字 | 43 / 32 / 7 正确渲染 |
| 链接 | 4 个主题入口分别指向 `?topic=phase-field / topology / additive / fluid` |
| 大纲 | `h1 = 1`，`details = 2`（News 与 Magnum Opus 折叠仍在） |
| 视觉 | 1280px 截图：Hero 卡片、四列主题卡、三列代表作卡均对齐、无溢出 |
| 自动化 | **193 / 193 断言通过**，Sass 编译零错误 |

## 8. 可调参数

| 想要 | 改哪里 |
|---|---|
| 改 Hero 文案/数字 | `_pages/about.md` 的 `<section class="home-hero">` |
| 增减主题卡 | 同上 `home-topics` 列表；链接用 `?topic=` 对应 `publications.js` 的 `TOPIC_RULES` |
| 换精选论文 | 同上 `home-featured` 三张卡 |
| 改列数 | `_home.scss` 的 `repeat(4, …)` / `repeat(3, …)` 与两个断点 |
| 整体撤掉 | 删除 `about.md` 里三个 `<section>` 块即可，原内容不受影响 |
