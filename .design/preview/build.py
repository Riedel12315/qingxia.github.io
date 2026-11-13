# -*- coding: utf-8 -*-
"""Generate .design/preview/index.html from _data/simulation.yml.

Read-only with respect to all business files. Everything this script writes is
inside .design/preview/. It reproduces the Liquid output of
_includes/simulation-grid.html byte-for-byte in structure (DOM contract
.design/02-ux-spec.md sec 4.3), with site-absolute /images/simulation/ paths
rewritten to ../../images/simulation/ so file:// loading works.
"""
import html
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
YML = ROOT / "_data" / "simulation.yml"
OUT = HERE / "index.html"

ABS = "/images/simulation/"
REL = "../../images/simulation/"


def esc(v):
    return html.escape(str(v), quote=True)


def load_data():
    p = subprocess.run(
        ["npx", "--yes", "js-yaml", str(YML)],
        cwd=str(ROOT), shell=True, capture_output=True, text=True, encoding="utf-8",
    )
    if p.returncode != 0:
        sys.exit("js-yaml failed: " + p.stderr)
    return json.loads(p.stdout)


def render_sim(data):
    """Mirror _includes/simulation-grid.html exactly, with relative image paths."""
    idx = 0
    out = ['<div class="sim-page">']
    for gi, group in enumerate(data["groups"]):
        gid = esc(group["id"])
        nimg = sum(len(it["images"]) for it in group["items"])
        out.append(
            '  <section class="sim-group" id="%s" aria-labelledby="%s-h" '
            'data-group="%s" data-group-index="%d">' % (gid, gid, gid, gi)
        )
        out.append(
            '    <h2 id="%s-h" class="sim-group__title">%s '
            '<span class="sim-group__count">%d 项 · %d 图</span></h2>'
            % (gid, esc(group["title"]), len(group["items"]), nimg)
        )
        out.append('    <div class="sim-grid">')
        for item in group["items"]:
            iid = esc(item["id"])
            imgs = item["images"]
            n = len(imgs)
            wide = " sim-item--wide" if n >= 2 else ""
            title = esc(item["title_en"])
            if item.get("title_zh", ""):
                title += "（%s）" % esc(item["title_zh"])
            out.append(
                '      <article class="sim-item%s" id="%s" aria-labelledby="%s-h" '
                'data-group="%s" data-item="%s" data-figure-count="%d">'
                % (wide, iid, iid, gid, iid, n)
            )
            out.append('        <h3 id="%s-h" class="sim-item__title">%s</h3>' % (iid, title))
            weighted = " sim-figs--weighted" if imgs[0].get("emphasis") else ""
            out.append('        <ul class="sim-figs sim-figs--count-%d%s">' % (n, weighted))
            for im in imgs:
                stem = im["file"].split(".")[0]
                poster = REL + stem + ".poster.jpg"
                full = REL + im["file"]
                gif = full if im.get("type") == "gif" else ""
                pdf = item.get("pdf", "") or ""
                caption = esc(im["caption"])
                caption_zh = esc(item.get("title_zh", ""))
                caption_en = esc(item["title_en"])
                out.append('          <li class="sim-figs__cell">')
                out.append(
                    '            <figure class="sim-figure" data-fig-index="%d" '
                    'data-item="%s" data-full="%s" data-gif="%s" data-poster="%s" '
                    'data-pdf="%s" data-caption-zh="%s" data-caption-en="%s">'
                    % (idx, iid, esc(full), esc(gif), esc(poster), esc(pdf), caption_zh, caption_en)
                )
                out.append('              <div class="sim-figure__media">')
                out.append(
                    '                <a class="sim-figure__open" href="%s" target="_blank" '
                    'rel="noopener noreferrer" aria-haspopup="dialog" '
                    'aria-label="放大查看：%s"><img class="sim-figure__img" src="%s" '
                    'alt="%s" width="%d" height="%d" loading="lazy" decoding="async"%s></a>'
                    % (
                        esc(full), caption, esc(poster), esc(im["alt"]),
                        int(im["width"]), int(im["height"]),
                        ' fetchpriority="high"' if idx == 0 else "",
                    )
                )
                if im.get("type") == "gif":
                    out.append(
                        '                <button class="sim-play" type="button" hidden '
                        'aria-pressed="false" aria-label="播放动画：%s">'
                        '<span class="sim-play__icon" aria-hidden="true">▶</span></button>'
                        % caption_en
                    )
                out.append("              </div>")
                out.append(
                    '              <figcaption class="sim-figure__caption">'
                    '<span class="sim-figure__title">%s</span></figcaption>' % caption
                )
                if im.get("type") == "gif":
                    out.append(
                        '              <span class="sim-figure__status" role="status" '
                        'aria-live="polite"></span>'
                    )
                    out.append(
                        '              <noscript><a class="sim-figure__giflink" href="%s">'
                        '查看动画原始文件（GIF）</a></noscript>' % esc(full)
                    )
                out.append("            </figure>")
                out.append("          </li>")
                idx += 1
            out.append("        </ul>")
            if item.get("pdf"):
                out.append(
                    '        <div class="sim-item__actions">'
                    '<a class="btn btn--inverse sim-pdf" href="%s" target="_blank" '
                    'rel="noopener noreferrer" aria-label="打开 PDF：%s（在新窗口打开）">'
                    'PDF <span aria-hidden="true">↗</span></a></div>'
                    % (esc(item["pdf"]), caption_en)
                )
            out.append("      </article>")
        out.append("    </div>")
        out.append("  </section>")
    out.append("</div>")
    return "\n".join(out), idx


HOME_HTML = r"""      <div class="page__content">
        <p class="preview-hint">以下为 <code>_pages/about.md</code> 的代表性摘录（非全文），用于展示浅色主题的留白、1px 分隔线与单一强调色排版，以及旧闻 / 代表作的原生 <code>&lt;details&gt;</code> 折叠。</p>

        <h2>About me（简介）</h2>
        <p><strong>Qing Xia</strong> received his Ph.D. degree in June 2025 from the School of Mathematics and Statistics at Xi’an Jiaotong University (XJTU), where he was supervised by Prof. Dr. <a href="http://gr.xjtu.edu.cn/web/yibaoli">Yibao Li</a>. Prior to that, he obtained his B.S. degree from the same school at XJTU in 2019. Recently, he was selected for the <strong>TopMinds</strong> program and joined Huawei.</p>

        <h2>Research（研究）</h2>
        <p>My research interests mainly lie in <strong>Shape topology optimization in 3D printing</strong> and <strong>multi-scale multi-physics coupled computation</strong>. My research interests also include computer vision on the digital twin, entropy analysis and numerical analysis. Since 2019, I have published <strong>43 SCI</strong> papers, <strong>32</strong> of them in <strong>JCR Q1</strong> journals, <strong>7</strong> chosen as <strong>Highly Cited paper</strong> by Web of Science.</p>

        <h2>News（新闻）</h2>
        <ul>
          <li>May 15, 2025. <strong>Qing Xia</strong> successfully obtained his Ph.D. in Science.</li>
          <li>May 01, 2025. Our paper 'A Unified Algorithm Framework for Phase-Field Based Multimaterial Topology Optimization with Various Graded Interfaces' has been accepted for publication in <em>International Journal for Numerical Methods in Engineering</em>.</li>
          <li>Apr 22, 2025. Our paper 'Data-driven reduced-order modeling of hydrogen-fueled supersonic combustion' has been accepted for publication in <em>Physics of Fluids</em>.</li>
          <li>Apr 09, 2025. <strong>Qing Xia</strong> attended the award ceremony of the 10th Xu Zongben Applied Mathematics Paper Award and delivered a presentation.</li>
          <li>Mar 08, 2025. Our paper 'Phase field modeling of melting and solidification dynamics in metallic powders during the bed fusion process' has been accepted for publication in <em>Communications in Nonlinear Science and Numerical Simulation</em>.</li>
          <li>Jan 11, 2025. Our paper 'Triply periodic minimal surfaces based topology optimization for the hydrodynamic and convective heat transfer' has been chosen as the Highly Cited paper by Web of Science.</li>
          <li>Jan 11, 2025. Our paper 'An unconditional energy stable data assimilation scheme for Navier-Stokes-Cahn-Hilliard equations' has been chosen as the Highly Cited paper by Web of Science.</li>
          <li>Jan 09, 2025. Our paper 'Enhanced Reduced-Order Modeling with VAE and LSTM for Predicting the Cahn-Hilliard Equation' has been accepted for publication in <em>Engineering Analysis with Boundary Elements</em>.</li>
        </ul>

        <details class="home-more">
          <summary>展开更早的动态（2024–2022，共 31 条；预览摘录 6 条）</summary>
          <ul>
            <li>Dec 18, 2024. Our paper 'A second-order accurate numerical method with unconditional energy stability for the Lifshitz-Petrich equation on curved surfaces' has been accepted.</li>
            <li>Oct 30, 2024. <strong>Qing Xia</strong> won the Xu Zongben Applied Mathematics Paper Award (Second prize).</li>
            <li>Sep 11, 2024. Our paper 'On the adaption of biological transport networks affected by complex domains' has been accepted for publication in <em>Physics of Fluids</em>.</li>
            <li>Jun 14, 2024. Our application of '3D printing design - simulation - processing integration research' was awarded "Outstanding achievements of scientific and technological research of Shaanxi Province".</li>
            <li>May 10, 2024. Our paper 'On the integrated 3D printing research for design, optimization and simulation within phase field framework' has been accepted (Special invitation).</li>
            <li>Feb 19, 2024. Our paper 'Thermal-fluid topology optimization with unconditional energy stability' has been chosen as the Highly Cited paper by Web of Science.</li>
          </ul>
        </details>

        <h2>Magnum Opus（代表作）</h2>
        <ul>
          <li><strong>Qing Xia</strong>#, Gangming Sun, Junseok Kim, Yibao Li, Multi-scale modeling and simulation of additive manufacturing based on fused deposition technique, <em>Physics of Fluids</em>, 35 (2023) 034116 (<strong>Cover Article/Featured/Scilight Article</strong>).</li>
          <li><strong>Qing Xia</strong>#, Junxiang Yang, Yibao Li, On the conservative phase-field method with the N-component incompressible flows, <em>Physics of Fluids</em>, 35 (2023) 012120. (JCR Q1, TOP)</li>
          <li>Yibao Li#, Zhixian Lv, <strong>Qing Xia</strong>*, On the adaption of biological transport networks affected by complex domains, <em>Physics of Fluids</em>. (JCR Q1, TOP)</li>
          <li><strong>Qing Xia</strong>#, Qian Yu, Yibao Li, A second-order accuracy, unconditionally energy stable numerical scheme for binary fluid flows on arbitrarily curved surfaces, <em>CMAME</em>, 384 (2021) 113987.</li>
          <li><strong>Qing Xia</strong>#, Junxiang Yang, Junseok Kim, Yibao Li, On the phase field based model for the crystalline transition and nucleation within the Lagrange multiplier framework, <em>Journal of Computational Physics</em>, 513 (2024) 113158.</li>
        </ul>

        <details class="home-more">
          <summary>展开更多代表作（第 6–15 条，共 10 条）</summary>
          <ul>
            <li>A modified and efficient phase field model for the biological transport network, <em>J. Comput. Phys.</em> (2023).</li>
            <li>Thermal-fluid topology optimization with unconditional energy stability and second-order accuracy, <em>CNSNS</em>, 116 (2023) 106782.</li>
            <li>Triply periodic minimal surfaces based topology optimization for the hydrodynamic and convective heat transfer, <em>CNSNS</em>, 131 (2024) 107819.</li>
            <li>Phase field modeling of melting and solidification dynamics in metallic powders during the bed fusion process, <em>CNSNS</em>.</li>
            <li>Binary thermal fluids computation over arbitrary surfaces, <em>J. Comput. Appl. Math.</em> (2023).</li>
            <li>An unconditionally energy stable method for binary incompressible heat conductive fluids, <em>Computers &amp; Mathematics with Applications</em>, 123 (2023) 26-39.</li>
            <li>Modeling and simulation of multi-component immiscible flows, <em>European Journal of Mechanics-B/Fluids</em>, 95 (2022) 194-204.</li>
            <li>A simple and efficient volume merging method for triply periodic minimal structure, <em>Computer Physics Communications</em>, 264 (2021) 107956.</li>
            <li>Simple and efficient fingerprint image restoration method based on a phase-field model, <em>Pattern Recognition</em>, 123 (2020) 108405.</li>
            <li>A simple and practical volume merging algorithm for the porous scaffold design, <em>Mathematics and Computers in Simulation</em>, 481 (2024) 481-495.</li>
          </ul>
        </details>

        <h2>Awards（获奖）</h2>
        <ul>
          <li>Outstanding achievements of scientific and technological research of Shaanxi Province (2024，一等奖，第三完成人)</li>
          <li>The 10th Xu Zongben Applied Mathematics Paper Award（第十届徐宗本应用数学论文奖）</li>
          <li>National Scholarship for Doctoral students (2023)（国家奖学金）</li>
          <li>Academic Star Award of Xi’an Jiaotong University (2023)（学术之星，全校 10 人）</li>
          <li>National Scholarship for Doctoral students (2022)（国家奖学金）</li>
          <li>Outstanding Model for the Doctoral students of XJTU (2022)（博士研究生标兵，全校 15 人）</li>
        </ul>
      </div>"""


PAGE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>主页改造预览 · Qing Xia / 夏青</title>
<link rel="stylesheet" href="assets/main.css">
<link rel="stylesheet" href="../../assets/css/simulation.css">
<style>
/* ---- Preview-only shell scaffolding. No colour tokens are overridden here:
       the palette comes entirely from the compiled main.css + simulation.css. ---- */
:root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
               'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
               'Noto Sans CJK SC', sans-serif;
}
body { margin: 0; }
[hidden] { display: none !important; }

/* Jekyll archive layout emits <div id="main"> with .sidebar + .archive as
   children. The task asks for a .page class on #main; neutralise only the
   two box-model declarations that would otherwise shrink/float the grid. */
#main.page { float: none; width: auto; }

header.masthead .masthead__inner-wrap {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.5rem; flex-wrap: wrap;
}
header.masthead .greedy-nav { float: none; }
header.masthead .greedy-nav .visible-links { display: flex; flex-wrap: wrap; align-items: center; }
header.masthead .greedy-nav .visible-links li { display: block; }
header.masthead .greedy-nav button { display: none; } /* greedy-nav JS is not loaded */

.preview-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: .5rem;
  margin: 0 0 2rem; padding-bottom: 1rem; border-bottom: 1px solid #E3E6E2;
}
.preview-toolbar__label { font-size: .875rem; color: #626F75; margin-right: .25rem; }
.preview-tab {
  min-height: 44px; padding: .5rem 1rem;
  font-family: inherit; font-size: .875rem; font-weight: 600; line-height: 1.2;
  color: #49565C;
  background: #FFFFFF; border: 1px solid #82908E; border-radius: 6px;
  cursor: pointer;
}
.preview-tab[aria-pressed="true"] { color: #FFFFFF; background: #14566B; border-color: #14566B; }
.preview-tab:hover { border-color: #14566B; }
.preview-hint {
  padding: .75rem 1rem; background: #FFFFFF; border: 1px solid #E3E6E2;
  border-radius: 6px; font-size: .875rem; color: #49565C;
}
.preview-notes {
  position: fixed; right: 1rem; bottom: 1rem; z-index: 30;
  width: 250px; max-width: calc(100vw - 2rem);
  margin: 0; padding: .75rem 1rem;
  background: #FFFFFF; border: 1px solid #E3E6E2; border-radius: 6px;
  box-shadow: 0 1px 2px rgba(27,36,41,.04);
  font-size: .75rem; line-height: 1.7; color: #49565C;
}
.preview-notes summary { min-height: 44px; font-size: .8125rem; }
.preview-notes ul { margin: .5rem 0 0; padding-left: 1.1rem; }
.preview-notes code { font-size: .75rem; }
@media (max-width: 900px) {
  .preview-notes { position: static; width: auto; max-width: none; margin: 2rem 0 0; }
}
.preview-reduce {
  display: inline-flex; align-items: center; gap: .5rem; min-height: 44px;
  margin-left: auto; font-size: .875rem; color: #49565C; cursor: pointer;
}
html[data-reduced-motion] *,
html[data-reduced-motion] *::before,
html[data-reduced-motion] *::after {
  transition-duration: 0ms !important;
  animation-duration: 0ms !important;
  animation: none !important;
}
</style>
</head>
<body>

<header class="masthead">
  <div class="masthead__inner-wrap">
    <div class="masthead__author">
      <img src="../../images/QingXia1.png" class="masthead__author-avatar" alt="Qing Xia">
      <span class="masthead__author-name">Qing Xia / 夏青</span>
    </div>
    <div class="masthead__menu">
      <nav id="site-nav" class="greedy-nav">
        <button type="button" aria-expanded="false" aria-controls="site-nav-hidden" aria-label="展开导航菜单" hidden><div class="navicon"></div></button>
        <ul class="visible-links">
          <li class="masthead__menu-item masthead__menu-item--lg"><a id="nav-home" aria-label="Qing Xia / 夏青 — 返回首页" href="#view-home" data-view-target="home">Qing Xia / 夏青</a></li>
          <li class="masthead__menu-item"><a href="#view-home" data-view-target="home">Biography（简介）</a></li>
          <li class="masthead__menu-item"><a href="#view-home" data-view-target="home">Publications（论文）</a></li>
          <li class="masthead__menu-item"><a id="nav-sim" href="#view-simulation" data-view-target="simulation" aria-current="page">Simulation（模拟）</a></li>
          <li class="masthead__menu-item"><a href="#view-home" data-view-target="home">Teaching（教学）</a></li>
          <li class="masthead__menu-item"><a href="#view-home" data-view-target="home">Instants（瞬间）</a></li>
        </ul>
        <ul id="site-nav-hidden" class="hidden-links hidden"></ul>
      </nav>
    </div>
  </div>
</header>

<div id="main" role="main" class="page">
  <div class="sidebar sticky">
    <div itemscope itemtype="http://schema.org/Person">
      <div class="author__avatar">
        <img src="../../images/QingXia1.png" class="author__avatar" alt="Qing Xia / 夏青">
      </div>
      <div class="author__content">
        <h3 class="author__name">Qing Xia / 夏青</h3>
        <p class="author__bio">Ph.D. in Science · Xi'an, China</p>
      </div>
      <div class="author__links-wrapper">
        <ul class="author__links social-icons">
          <li><a aria-label="Xi'an, China" href="#view-home" data-view-target="home">Xi'an, China</a></li>
          <li><a aria-label="Google Scholar" href="https://scholar.google.com/citations?user=pWXuL4EAAAAJ&amp;hl=zh-CN">Google Scholar ↗</a></li>
          <li><a aria-label="ResearchGate" href="https://www.researchgate.net/profile/Qing-Xia-12">ResearchGate ↗</a></li>
          <li><a aria-label="ORCID" href="https://orcid.org/0000-0003-1608-415X">ORCID ↗</a></li>
          <li><a aria-label="Email" href="mailto:xiaqing151701@stu.xjtu.edu.cn">Email ↗</a></li>
        </ul>
      </div>
    </div>
  </div>

  <div class="archive">
    <h1 class="page__title" id="preview-title">Simulation</h1>

    <div class="preview-toolbar" role="group" aria-label="预览视图切换">
      <span class="preview-toolbar__label">选择视图：</span>
      <button class="preview-tab" type="button" data-view-target="simulation" aria-pressed="true">Simulation（模拟结果）</button>
      <button class="preview-tab" type="button" data-view-target="home" aria-pressed="false">首页概览</button>
      <label class="preview-reduce"><input type="checkbox" id="reduce-motion"> 模拟减少动效</label>
    </div>

    <section class="preview-view" id="view-simulation" aria-label="Simulation 模拟结果网格">
__SIM__
    </section>

    <section class="preview-view" id="view-home" aria-label="首页概览" hidden>
__HOME__
    </section>
  </div>
</div>

<div class="page__footer">
  <footer>
    <div class="page__footer-copyright">
      &copy; 2025 Qing Xia / 夏青 &nbsp;·&nbsp;
      <a href="mailto:xiaqing151701@stu.xjtu.edu.cn">Email</a> &nbsp;·&nbsp;
      <a href="https://scholar.google.com/citations?user=pWXuL4EAAAAJ&amp;hl=zh-CN">Google Scholar</a>
      &nbsp;·&nbsp; 静态预览页（无 Jekyll 构建，file:// 直接打开）
    </div>
  </footer>
</div>

<details class="preview-notes" open>
  <summary>改造说明（本次关键数字）</summary>
  <ul>
    <li>删除装饰 / 死文件：<strong>7</strong> 个（另 2 个 spiral 文件）</li>
    <li>Simulation 首屏图：<strong>26.85 MB → 0.79 MB</strong> 静帧（833 KB / 16 张）</li>
    <li>Web 字体：<strong>3 → 1</strong>（仅 Inter）</li>
    <li>首屏 GIF 请求：<strong>0</strong>（9 个 GIF 改为点击后加载）</li>
    <li>3 组 / 13 子项 / 16 图 / 10 PDF</li>
  </ul>
  <p>本页为 <code>.design/preview/</code> 下的验收预览，图片与 CSS/JS 均用相对路径指向仓库原文件，不复制业务代码。</p>
</details>

<script>
(function () {
  'use strict';
  var D = document;
  var views = {
    simulation: D.getElementById('view-simulation'),
    home: D.getElementById('view-home')
  };
  var titles = { simulation: 'Simulation', home: '首页概览 / About me' };
  var h1 = D.getElementById('preview-title');
  var navSim = D.getElementById('nav-sim');
  var navHome = D.getElementById('nav-home');

  function setView(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = (k !== name); });
    h1.textContent = titles[name];
    if (name === 'simulation') {
      navSim.setAttribute('aria-current', 'page'); navHome.removeAttribute('aria-current');
    } else {
      navHome.setAttribute('aria-current', 'page'); navSim.removeAttribute('aria-current');
    }
    D.querySelectorAll('.preview-tab[data-view-target]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view-target') === name ? 'true' : 'false');
    });
    window.scrollTo(0, 0);
  }
  D.querySelectorAll('[data-view-target]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      setView(el.getAttribute('data-view-target'));
    });
  });
  D.getElementById('reduce-motion').addEventListener('change', function () {
    if (this.checked) D.documentElement.setAttribute('data-reduced-motion', '');
    else D.documentElement.removeAttribute('data-reduced-motion');
  });
  setView('simulation');
})();
</script>
<script src="../../assets/js/simulation.js" defer></script>
<script src="../../assets/js/liquid-bg.js?v=2" defer></script>
<script src="../../assets/js/motion.js" defer></script>
<script src="../../assets/js/nav-lens.js" defer></script>
<script src="../../assets/js/page-tools.js" defer></script>
</body>
</html>
"""


def main():
    data = load_data()
    sim, nfig = render_sim(data)
    page = PAGE.replace("__SIM__", sim).replace("__HOME__", HOME_HTML)
    # Only reject an absolute path used as the *start* of an attribute value;
    # "../../images/simulation/" legitimately contains the substring.
    if '="/images/simulation/' in page or "='/images/simulation/" in page:
        sys.exit("FATAL: an absolute /images/simulation/ path survived rewriting")
    OUT.write_text(page, encoding="utf-8")
    print("wrote %s (%d bytes, %d figures)" % (OUT, OUT.stat().st_size, nfig))


if __name__ == "__main__":
    main()
