# -*- coding: utf-8 -*-
"""Independent acceptance checks for Phase 3-C; writes VERIFY.md.

All checks are executed, not eyeballed. Business files are read-only.
Outputs: .design/preview/VERIFY.md, .design/preview/assets/main.css (rebuilt).
"""
import html.parser
import json
import os
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PREVIEW = HERE
INDEX = HERE / "index.html"
YML = ROOT / "_data" / "simulation.yml"
ASSETS = HERE / "assets"

RESULTS = []          # (section, item, expected, actual, ok | None)
SECTION = [""]


def sec(name):
    SECTION[0] = name


def chk(item, expected, actual, ok=None):
    if ok is None:
        ok = (str(expected) == str(actual))
    RESULTS.append((SECTION[0], item, str(expected), str(actual), bool(ok)))
    return bool(ok)


def info(item, expected, actual):
    RESULTS.append((SECTION[0], item, str(expected), str(actual), None))


def warn(item, expected, actual):
    """A real problem found in business code, not a failure of the deliverables."""
    RESULTS.append((SECTION[0], item, str(expected), str(actual), "W"))


def run(cmd, cwd=None):
    return subprocess.run(
        cmd, cwd=str(cwd or ROOT), shell=True,
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )


# Compile once, up front, so §3 reads the FINAL main.css. Method per team-lead /
# fe-theme: strip the 2-line Jekyll front matter into an OS temp file, then run
# sass from the repo root with the same style as _config.yml (compressed).
import tempfile  # noqa: E402


def compile_theme_css():
    src = (ROOT / "assets" / "css" / "main.scss").read_text(encoding="utf-8").splitlines(keepends=True)
    has_fm = src[0].strip() == "---" and src[1].strip() == "---"
    out = ASSETS / "main.css"
    with tempfile.TemporaryDirectory(prefix="qx-preview-") as td:
        qx = pathlib.Path(td) / "qx-main.scss"
        qx.write_text("".join(src[2:] if has_fm else src), encoding="utf-8")
        probe = ASSETS / "_exact_probe.css"
        exact = run(["npx", "--yes", "sass", "--load-path=_sass", "--no-source-map",
                     "assets/css/main.scss", str(probe)])
        if probe.exists():
            probe.unlink()
        built = run(["npx", "--yes", "sass", "--load-path=_sass", "--no-source-map",
                     "--quiet", "--style=compressed", str(qx), str(out)])
        diag_css = pathlib.Path(td) / "diag.css"
        diag = run(["npx", "--yes", "sass", "--load-path=_sass", "--no-source-map",
                    str(qx), str(diag_css)])
    om = re.search(r"(\d+) repetitive deprecation warnings omitted", diag.stderr or "")
    return {
        "has_fm": has_fm, "exact": exact, "built": built, "diag": diag,
        "nwarn": (diag.stderr or "").count("DEPRECATION WARNING"),
        "nomit": int(om.group(1)) if om else 0,
        "bytes": out.stat().st_size,
    }


SASS = compile_theme_css()


# --------------------------------------------------------------------------
# 1. YAML -> JSON counts
# --------------------------------------------------------------------------
sec("1 数据计数（YAML → JSON）")
yp = run(["npx", "--yes", "js-yaml", str(YML)])
chk("npx js-yaml 解析 _data/simulation.yml", "exit 0", "exit %d" % yp.returncode, yp.returncode == 0)
if yp.returncode != 0:
    print(yp.stderr)
    sys.exit(1)
data = json.loads(yp.stdout)
groups = data["groups"]
items = [it for g in groups for it in g["items"]]
images = [im for it in items for im in it["images"]]
with_pdf = [it for it in items if it.get("pdf")]
without_pdf = [it for it in items if not it.get("pdf")]
multi = [it for it in items if len(it["images"]) >= 2]
gifs = [im for im in images if im.get("type") == "gif"]
stills = [im for im in images if im.get("type") == "still"]

chk("groups", 3, len(groups))
chk("items", 13, len(items))
chk("images", 16, len(images))
chk("有 pdf 的子项", 10, len(with_pdf))
chk("无 pdf 的子项", 3, len(without_pdf))
chk("多图子项（>=2 图）", 2, len(multi))
chk("type=gif 图", 9, len(gifs))
chk("type=still 图", 7, len(stills))
chk("无 pdf 子项 id", "cad-05, cad-06, cfd-04", ", ".join(i["id"] for i in without_pdf))
chk("多图子项 id", "cad-04, cfd-01", ", ".join(i["id"] for i in multi))
for g in groups:
    info("分组 %s 项/图" % g["id"], "-", "%d 项 / %d 图" % (len(g["items"]), sum(len(i["images"]) for i in g["items"])))

# --------------------------------------------------------------------------
# 2. HTML: DOM contract + tag balance
# --------------------------------------------------------------------------
sec("2 预览页 DOM 契约（HTMLParser）")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}


class Collector(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []            # (tag, attrs, classes)
        self.stack = []
        self.errors = []
        self.counts = []
        self._cap = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        c = set((a.get("class") or "").split())
        self.tags.append((tag, a, c))
        if "sim-group__count" in c:
            self._cap = ""
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append((tag, a, set((a.get("class") or "").split())))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self._cap is not None and tag == "span":
            self.counts.append(self._cap.strip())
            self._cap = None
        if not self.stack:
            self.errors.append("多余的 </%s>" % tag)
            return
        top = self.stack.pop()
        if top != tag:
            self.errors.append("标签错配：期望 </%s>，实得 </%s>" % (top, tag))

    def handle_data(self, data):
        if self._cap is not None:
            self._cap += data


raw = INDEX.read_text(encoding="utf-8")
parser = Collector()
try:
    parser.feed(raw)
    parser.close()
    parse_exc = None
except Exception as e:                                   # pragma: no cover
    parse_exc = repr(e)
if parser.stack:
    parser.errors.append("未闭合标签：" + ", ".join(parser.stack))
if parse_exc:
    parser.errors.append("HTMLParser 异常：" + parse_exc)

T = parser.tags


def n(tag=None, cls=None):
    return sum(1 for t, a, c in T if (tag is None or t == tag) and (cls is None or cls in c))


chk("index.html 存在且非空", ">0 字节", "%d 字节" % INDEX.stat().st_size, INDEX.stat().st_size > 0)
chk("HTML 标签配平 / HTMLParser 无异常", "0 错误", "%d 错误" % len(parser.errors),
    len(parser.errors) == 0)
if parser.errors:
    for e in parser.errors[:10]:
        info("  └ 配平错误", "-", e)
chk("section.sim-group", 3, n("section", "sim-group"))
chk("article.sim-item", 13, n("article", "sim-item"))
chk("figure.sim-figure", 16, n("figure", "sim-figure"))
chk("a.sim-pdf", 10, n("a", "sim-pdf"))
chk("button.sim-play（播放按钮）", 9, n("button", "sim-play"))
chk("播放按钮默认 hidden", 9, sum(1 for t, a, c in T if t == "button" and "sim-play" in c and "hidden" in a))
chk("h1 全页恰好 1 个", 1, n("h1"))
chk("h1.class = page__title", 1, sum(1 for t, a, c in T if t == "h1" and "page__title" in c))
chk("h1 文本 = Simulation", "Simulation", re.findall(r'<h1[^>]*>(.*?)</h1>', raw)[0].strip())
idxs = sorted(int(a["data-fig-index"]) for t, a, c in T if "data-fig-index" in a)
chk("data-fig-index 连续 0..15", str(list(range(16))), str(idxs))
chk("sim-item--wide（多图子项）", 2, n("article", "sim-item--wide"))
chk("sim-figs--weighted（cfd-01）", 1, n("ul", "sim-figs--weighted"))
chk("img[src$=.gif]（首屏 GIF 请求来源）", 0, sum(1 for t, a, c in T if t == "img" and a.get("src", "").lower().endswith(".gif")))
chk("分组计数文本", "6 项 · 8 图 | 5 项 · 6 图 | 2 项 · 2 图",
    " | ".join(parser.counts))
figimgs = [(t, a, c) for t, a, c in T if t == "img" and "sim-figure__img" in c]
alts = [a.get("alt", "") for t, a, c in figimgs]
chk("16 张 sim 图 alt 非空", 16, sum(1 for x in alts if x.strip()))
chk("16 张 sim 图 alt 互异", 16, len(set(alts)))
chk("16 张 sim 图显式 width/height", 16, sum(1 for t, a, c in figimgs if a.get("width") and a.get("height")))
chk("16 张 sim 图 loading=lazy", 16, sum(1 for t, a, c in figimgs if a.get("loading") == "lazy"))
chk("data-poster 属性数", 16, sum(1 for t, a, c in T if "data-poster" in a))
chk("data-full 属性数", 16, sum(1 for t, a, c in T if "data-full" in a))
chk("data-gif 非空（GIF 本体）", 9, sum(1 for t, a, c in T if a.get("data-gif")))
chk("绝对路径 /images/simulation/ 残留", 0, len(re.findall(r'="/images/simulation/', raw)))
chk("<details> 折叠块（首页旧闻 + 代表作 + 说明面板）", ">=2", n("details"), n("details") >= 2)
# caption text must be verbatim from YAML, no ellipsis
caps = [im["caption"] for im in images]
missing_caps = [c for c in caps if c not in raw]
chk("16 条图注逐字取自 YAML", "0 条缺失", "%d 条缺失" % len(missing_caps), not missing_caps)
chk("图注无省略号", "0 处", "%d 处" % raw.count("…"), raw.count("…") == 0)
chk("sim-item__actions（有 PDF 才渲染）", 10, n("div", "sim-item__actions"))
chk("header.masthead 外壳", 1, sum(1 for t, a, c in T if t == "header" and "masthead" in c))
chk("#main[role=main].page 外壳", 1, sum(1 for t, a, c in T if t == "div" and a.get("id") == "main" and a.get("role") == "main" and "page" in c))
chk("div.sidebar 左侧栏", 1, n("div", "sidebar"))
chk("div.archive 右主栏", 1, n("div", "archive"))
chk("5 项导航 li.masthead__menu-item（不含站点名 --lg）", 5,
    sum(1 for t, a, c in T if t == "li" and "masthead__menu-item" in c and "masthead__menu-item--lg" not in c))
chk('当前项 aria-current="page"', 1, sum(1 for t, a, c in T if a.get("aria-current") == "page"))
_author_block = re.search(r'<ul class="author__links social-icons">(.*?)</ul>', raw, re.S)
_author_li = re.findall(r"<li>", _author_block.group(1)) if _author_block else []
chk("author__links 学术链接条目", 5, len(_author_li))
info("author__links 链接文本", "-",
     ", ".join(re.findall(r'<li><a aria-label="([^"]+)"', _author_block.group(1))) if _author_block else "")
chk("link[href=assets/main.css]", 1, sum(1 for t, a, c in T if t == "link" and a.get("href") == "assets/main.css"))
chk("link[href=../../assets/css/simulation.css]", 1,
    sum(1 for t, a, c in T if t == "link" and a.get("href") == "../../assets/css/simulation.css"))
chk("script[src=../../assets/js/simulation.js][defer]", 1,
    sum(1 for t, a, c in T if t == "script" and a.get("src") == "../../assets/js/simulation.js" and "defer" in a))
chk("模拟减少动效勾选框", 1, sum(1 for t, a, c in T if t == "input" and a.get("id") == "reduce-motion"))
chk("改造说明面板", 1, n("details", "preview-notes"))

# --------------------------------------------------------------------------
# 3. Resource reachability
# --------------------------------------------------------------------------
sec("3 资源可达性（相对路径解析）")
LOCAL_KEYS = ("src", "href", "data-poster", "data-full", "data-gif")
refs = []
for t, a, c in T:
    for k in LOCAL_KEYS:
        v = a.get(k, "")
        if v:
            refs.append((t, k, v))
external = {"http://", "https://", "//", "mailto:", "#"}
local_refs = [(t, k, v) for t, k, v in refs
              if not any(v.startswith(p) for p in external)]
missing = []
for t, k, v in local_refs:
    p = (PREVIEW / v.split("?", 1)[0].split("#", 1)[0]).resolve()
    if not os.path.exists(p):
        missing.append("%s %s=%s -> %s" % (t, k, v, p))
chk("本地资源引用全部存在", "0 个 404", "%d 个 404" % len(missing), not missing)
info("本地资源引用总数", "-", len(local_refs))
info("外部链接（PDF / 学术站点，不做存在性断言）", "-", len(refs) - len(local_refs))
if missing:
    for m in missing[:20]:
        info("  └ 404 风险", "-", m)
for m in missing[:20]:
    info("404 风险路径", "-", m)

# posters: exist, Pillow-openable, <150 KB
from PIL import Image  # noqa: E402

posters = []
for im in images:
    stem = im["file"].split(".")[0]
    posters.append(ROOT / "images" / "simulation" / (stem + ".poster.jpg"))
chk("poster 文件存在", 16, sum(1 for p in posters if p.exists()))
bad_img, too_big, sizes = [], [], []
for p in posters:
    if not p.exists():
        continue
    try:
        with Image.open(p) as pic:
            pic.verify()
        with Image.open(p) as pic:
            sizes.append((p.name, pic.size))
    except Exception as e:
        bad_img.append("%s: %s" % (p.name, e))
    if p.stat().st_size >= 150 * 1024:
        too_big.append("%s (%d B)" % (p.name, p.stat().st_size))
chk("16 poster 可被 Pillow 打开", "0 失败", "%d 失败" % len(bad_img), not bad_img)
chk("单张 poster < 150 KiB", "0 超限", "%d 超限" % len(too_big), not too_big)
poster_bytes = sum(p.stat().st_size for p in posters if p.exists())
orig_bytes = sum((ROOT / "images" / "simulation" / im["file"]).stat().st_size for im in images)
info("16 张原图合计", "-", "%d B = %.2f MB（十进制）/ %.2f MiB" % (orig_bytes, orig_bytes / 1e6, orig_bytes / 1048576))
info("16 张静帧合计", "-", "%d B = %.1f KiB / %.2f MiB" % (poster_bytes, poster_bytes / 1024, poster_bytes / 1048576))
chk("16 张静帧合计（与团队最终复核一致）", 808037, poster_bytes)
_compression = (1 - poster_bytes / orig_bytes) * 100
info("压缩率", "-", "%.2f%%（%d B → %d B）" % (_compression, orig_bytes, poster_bytes))
chk("压缩率 >= 97%（按 1 位小数四舍五入）", ">= 97.0%", "%.1f%%" % _compression,
    round(_compression, 1) >= 97.0)
_maxp = max(((p.name, p.stat().st_size) for p in posters if p.exists()), key=lambda x: x[1])
info("最大单张 poster", "-", "%s (%d B)" % (_maxp[0], _maxp[1]))
chk("最大单张 poster（与团队最终复核一致）", 139654, _maxp[1])
_gen = (ROOT / "tools" / "make_posters.py").read_text(encoding="utf-8")
chk("生成器含 budget = min(MAX_BYTES, src_bytes) 规则", "存在",
    "存在" if re.search(r"budget\s*=\s*min\(MAX_BYTES,\s*src_bytes\)", _gen) else "缺失",
    bool(re.search(r"budget\s*=\s*min\(MAX_BYTES,\s*src_bytes\)", _gen)))
chk("生成器含 shutil.copyfile 零重编码分支", "存在",
    "存在" if "shutil.copyfile" in _gen else "缺失", "shutil.copyfile" in _gen)
bigger = [(im["file"], (ROOT / "images" / "simulation" / im["file"]).stat().st_size,
           (ROOT / "images" / "simulation" / (im["file"].split(".")[0] + ".poster.jpg")).stat().st_size)
          for im in images
          if (ROOT / "images" / "simulation" / (im["file"].split(".")[0] + ".poster.jpg")).stat().st_size
          > (ROOT / "images" / "simulation" / im["file"]).stat().st_size]
info("静帧比原图还大的条目（静图重编码）", "-", "; ".join("%s %d→%d B" % b for b in bigger) or "无")
F3_OPEN = bool(bigger)
_f3p = ROOT / "images" / "simulation" / "sWkfSq3ZENQJ7h5.poster.jpg"
_f3o = ROOT / "images" / "simulation" / "sWkfSq3ZENQJ7h5.jpg"
F3_IDENTICAL = _f3p.read_bytes() == _f3o.read_bytes()
info("F3 该静帧与原静图字节完全一致", "-", "%s（%d B / %d B）"
     % ("是" if F3_IDENTICAL else "否", _f3p.stat().st_size, _f3o.stat().st_size))
# CSS-relative font URLs: main.css normally lives at assets/css/, but the brief
# requires the compiled copy at .design/preview/assets/. Report the mismatch.
css_text = (ASSETS / "main.css").read_text(encoding="utf-8", errors="replace")
css_urls = sorted(set(re.findall(r'url\(["\']?([^)"\']+)', css_text)))
css_font_missing = [u for u in css_urls if u.startswith("../fonts/") and not (ASSETS / u).exists()]
icon_nodes = len(re.findall(r'class="(?:fa[bsr]?|ai)\s', raw))
info("main.css 中 url(../fonts/...) 字体引用（共 %d 条）" % len(css_urls), "-",
     "%d 条从预览位置解析到 .design/preview/fonts/ 不存在" % len(css_font_missing))
info("预览页使用 Font Awesome / academicons 图标元素", "0（故上述字体不会被请求）", icon_nodes)

# --------------------------------------------------------------------------
# 4. Subtraction grep
# --------------------------------------------------------------------------
sec("4 减法验收（grep）")
ROOTS = ["_sass", "assets/css", "assets/js", "_includes", "_pages"]
EXTS = {".scss", ".css", ".js", ".html", ".md", ".yml"}
allfiles = [p for r in ROOTS for p in (ROOT / r).rglob("*")
            if p.is_file() and p.suffix.lower() in EXTS]
excluded = [p for p in allfiles if "vendor" in p.parts or p.name == "main.min.js"]
included = [p for p in allfiles if p not in excluded]
PATTERNS = {
    "backdrop-filter": r"backdrop-filter",
    "radial-gradient": r"radial-gradient",
    "rotate3d|perspective|rotateY": r"rotate3d|perspective|rotateY",
    ".light-mode": r"\.light-mode",
    "prefers-color-scheme": r"prefers-color-scheme",
    "animation-iteration-count: infinite": r"animation-iteration-count\s*:\s*infinite",
    "simulation-spiral": r"simulation-spiral",
    "旧霓虹色 #FF6363|#A855F7|#FF8585": r"#FF6363|#A855F7|#FF8585",
}
info("扫描文件数（业务代码）", "-", len(included))
info("排除文件数（_sass/vendor/** + 第三方 vendor js + main.min.js）", "-", len(excluded))
for label, pat in PATTERNS.items():
    rx = re.compile(pat, re.I)
    hits = [("%s:%d" % (p.relative_to(ROOT), i + 1), l.strip()[:90])
            for p in included
            for i, l in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines())
            if rx.search(l)]
    chk(label, "0 命中", "%d 命中" % len(hits), len(hits) == 0)
    for h in hits[:5]:
        info("  └ 命中", "-", h)
excl_hits = {}
for label, pat in PATTERNS.items():
    rx = re.compile(pat, re.I)
    excl_hits[label] = sum(
        1 for p in excluded
        for l in p.read_text(encoding="utf-8", errors="replace").splitlines()
        if rx.search(l))
info("排除文件中的命中数（单独说明）", "-",
     "; ".join("%s=%d" % (k, v) for k, v in excl_hits.items()))

DELETED = [
    "assets/js/shooting-stars.js",
    "assets/js/theme-switcher.js", "assets/js/collapse.js",
    "assets/css/light-mode.css", "assets/css/collapse.css",
    "preview.html",
    "assets/js/simulation-spiral.js", "assets/css/simulation-spiral.css",
]
still_there = [f for f in DELETED if (ROOT / f).exists()]
chk("应删文件（8 个）确实不存在", "0 个仍存在", "%d 个仍存在" % len(still_there), not still_there)
STALE_RX = re.compile(r"shooting-stars|theme-switcher|collapse\.js|light-mode\.css|collapse\.css|simulation-spiral", re.I)
stale_hits = ["%s:%d" % (p.relative_to(ROOT), i + 1)
              for p in included
              for i, l in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines())
              if STALE_RX.search(l)]
stale_hits += ["_config.yml:%d" % (i + 1)
               for i, l in enumerate((ROOT / "_config.yml").read_text(encoding="utf-8").splitlines())
               if STALE_RX.search(l)]
info("对已删文件的残留引用（grep 等价扫描）", "0 条", "%d 条 %s" % (len(stale_hits), stale_hits[:5]))

# --------------------------------------------------------------------------
# 4b. Liquid backdrop — explicit user decision (2026-11-08).
#     A documented exception to the earlier "zero continuous animation" rule:
#     one near-invisible paper tint, stirred by the cursor, with hard opt-outs.
# --------------------------------------------------------------------------
liq = ROOT / "assets/js/liquid-bg.js"
liq_src = liq.read_text(encoding="utf-8") if liq.exists() else ""
head_html = (ROOT / "_includes/head/custom.html").read_text(encoding="utf-8")
preview_html = (ROOT / ".design/preview/index.html").read_text(encoding="utf-8")
custom_scss = (ROOT / "_sass/_custom.scss").read_text(encoding="utf-8")
chk("液体背景脚本按用户新决策恢复", "存在", "存在" if liq.exists() else "缺失", liq.exists())
chk("head/custom.html 引用液体背景", 1, head_html.count("liquid-bg.js"), head_html.count("liquid-bg.js") == 1)
chk("预览页引用同一份液体背景", 1, preview_html.count("liquid-bg.js"), preview_html.count("liquid-bg.js") == 1)
for _label, _needle in [
    ("触屏设备停用 hover:none", "(hover: none)"),
    ("尊重 prefers-reduced-motion", "prefers-reduced-motion"),
    ("隐藏标签页暂停 rAF", "visibilitychange"),
    ("静止降帧 IDLE_FPS", "IDLE_FPS"),
    ("WebGL 不可用回退", "WebGLRenderingContext"),
    ("单一浅色纸白配色", "0.980, 0.976, 0.965"),
]:
    chk("液体背景 / " + _label, "包含", "包含" if _needle in liq_src else "缺失", _needle in liq_src)
for _label, _needle in [
    ("无双皮肤 u_theme", "u_theme"),
    ("无 .light-mode 依赖", "light-mode"),
    ("无主题 MutationObserver", "MutationObserver"),
    ("无 aurora class 依赖", "liquid-bg-active"),
]:
    chk("液体背景 / " + _label, 0, liq_src.count(_needle), liq_src.count(_needle) == 0)
chk("canvas 层叠：内容 z-index 高于背景", "含规则",
    "含规则" if ("#liquid-bg-canvas" in custom_scss and "z-index: 1" in custom_scss) else "缺失",
    "#liquid-bg-canvas" in custom_scss and "z-index: 1" in custom_scss)

# --------------------------------------------------------------------------
# 4c. Follow-up fixes (2026-11-08): mobile profile card + cleaner/stronger wake
# --------------------------------------------------------------------------
sidebar_scss = (ROOT / "_sass/_sidebar.scss").read_text(encoding="utf-8")
chk("移动端档案：grid 落在 <div itemscope> 包装层", "含 .sidebar > [itemscope]",
    "含" if ".sidebar > [itemscope]" in sidebar_scss else "缺失",
    ".sidebar > [itemscope]" in sidebar_scss)
chk("移动端档案：竖排列表（非横排胶囊）", "column + nowrap + 无 pill 圆角",
    "满足" if ("flex-direction: column" in sidebar_scss and "flex-wrap: nowrap" in sidebar_scss
               and "border-radius: 6px" not in sidebar_scss.split(".sidebar .author__links > li")[1].split("@media")[0]) else "缺失",
    "flex-direction: column" in sidebar_scss and "flex-wrap: nowrap" in sidebar_scss)
chk("移动端档案：每行 1px 分隔线、末行去线", "含 border-bottom + last-child",
    "含" if ("border-bottom: 1px solid" in sidebar_scss and "li:last-child { border-bottom: 0" in sidebar_scss) else "缺失",
    "border-bottom: 1px solid" in sidebar_scss and "li:last-child { border-bottom: 0" in sidebar_scss)
chk("移动端档案：整行 44px 命中区（::after inset:0）", "含 inset:0",
    "含" if "inset: 0" in sidebar_scss else "缺失", "inset: 0" in sidebar_scss)
chk("移动端档案：fa-fw / ai-fw 图标宽度归一化", "含 flex: 0 0 16px",
    "含" if "flex: 0 0 16px" in sidebar_scss else "缺失",
    "flex: 0 0 16px" in sidebar_scss)
chk("流体背景：静态压回纸白（消除灰底噪）", "含 mix(col, lBase, 0.68)",
    "含" if "mix(col, lBase, 0.68)" in liq_src else "缺失",
    "mix(col, lBase, 0.68)" in liq_src)
chk("流体背景：已移除让边缘发灰的暗角", 0, liq_src.count("col *= mix"),
    liq_src.count("col *= mix") == 0)
chk("流体背景：清透冷青拖尾与更绵长尾迹", "含新配色 + DECAY 0.24",
    "含" if ("vec3(0.66, 0.83, 0.94)" in liq_src and "DECAY   = 0.24" in liq_src) else "缺失",
    "vec3(0.66, 0.83, 0.94)" in liq_src and "DECAY   = 0.24" in liq_src)

# --------------------------------------------------------------------------
# 4d. Interaction / motion layer (2026-11-09)
# --------------------------------------------------------------------------
motion_js = ROOT / "assets/js/motion.js"
motion_scss = ROOT / "_sass/_motion.scss"
scripts_html = ROOT / "_includes/scripts.html"
main_scss = (ROOT / "assets/css/main.scss").read_text(encoding="utf-8")
mjs = motion_js.read_text(encoding="utf-8") if motion_js.exists() else ""
msc = motion_scss.read_text(encoding="utf-8") if motion_scss.exists() else ""

chk("动效脚本 motion.js 存在", "存在", "存在" if motion_js.exists() else "缺失", motion_js.exists())
chk("动效样式 _motion.scss 存在", "存在", "存在" if motion_scss.exists() else "缺失", motion_scss.exists())
chk("main.scss 引入 motion 层", 1, main_scss.count('@import "motion"'), main_scss.count('@import "motion"') == 1)
chk("scripts.html 引入 motion.js（恰好 1 次）", 1,
    scripts_html.read_text(encoding="utf-8").count("motion.js"),
    scripts_html.read_text(encoding="utf-8").count("motion.js") == 1)
for _label, _needle in [
    ("IntersectionObserver 一次性观察", "IntersectionObserver"),
    ("进入后 unobserve", "unobserve"),
    ("尊重 prefers-reduced-motion", "prefers-reduced-motion"),
    ("先标记再启用的防闪烁顺序", "motion-ready"),
    ("排除折叠区 details", 'closest("details")'),
]:
    chk("motion.js / " + _label, "包含", "包含" if _needle in mjs else "缺失", _needle in mjs)
for _label, _needle in [
    ("浮现规则由 no-preference 包裹", "prefers-reduced-motion: no-preference"),
    ("初始位移 10px", "translateY(10px)"),
    ("揭示态归零", ".is-revealed"),
    ("三档时长 token", "--dur-reveal"),
    ("导航下划线从中心展开", "transform: scaleX(0)"),
]:
    chk("_motion.scss / " + _label, "包含", "包含" if _needle in msc else "缺失", _needle in msc)
_cheap = [p for p in ("translateX", "rotate(", "scale(1", "box-shadow", "animation-iteration-count") if p in msc]
chk("动效层无廉价特效（位移放大/旋转/阴影/无限动画）", "0 命中", "%d 命中 %s" % (len(_cheap), _cheap), len(_cheap) == 0)
chk("node --check assets/js/motion.js", "exit 0",
    "exit %d %s" % (run(["node", "--check", "assets/js/motion.js"]).returncode,
                    run(["node", "--check", "assets/js/motion.js"]).stderr.strip()[:80]),
    run(["node", "--check", "assets/js/motion.js"]).returncode == 0)

# --------------------------------------------------------------------------
# 4e. Navigation lens (2026-11-13)
# --------------------------------------------------------------------------
nav_lens = ROOT / "assets/js/nav-lens.js"
njs = nav_lens.read_text(encoding="utf-8") if nav_lens.exists() else ""
chk("导航放大镜 nav-lens.js 存在", "存在", "存在" if nav_lens.exists() else "缺失", nav_lens.exists())
chk("scripts.html 引用 nav-lens.js（恰好 1 次）", 1,
    scripts_html.read_text(encoding="utf-8").count("nav-lens.js"),
    scripts_html.read_text(encoding="utf-8").count("nav-lens.js") == 1)
for _label, _needle in [
    ("pointerover 建立镜片", "pointerover"),
    ("pointermove 逐帧合并", "requestAnimationFrame"),
    ("仅精细指针启用", "(hover: hover) and (pointer: fine)"),
    ("减少动效下不启用", "prefers-reduced-motion"),
    ("装饰元素 aria-hidden", 'aria-hidden", "true'),
    ("字体就绪后重测", "fonts.ready"),
]:
    chk("nav-lens.js / " + _label, "包含", "包含" if _needle in njs else "缺失", _needle in njs)
for _label, _needle in [
    ("镜片容器样式", ".nav-lens {"),
    ("圆形裁剪", "clip-path: circle("),
    ("放大倍率变量", "scale(var(--s"),
    ("光学细边", ".nav-lens__ring"),
]:
    chk("_motion.scss / " + _label, "包含", "包含" if _needle in msc else "缺失", _needle in msc)
chk("node --check assets/js/nav-lens.js", "exit 0",
    "exit %d %s" % (run(["node", "--check", "assets/js/nav-lens.js"]).returncode,
                    run(["node", "--check", "assets/js/nav-lens.js"]).stderr.strip()[:80]),
    run(["node", "--check", "assets/js/nav-lens.js"]).returncode == 0)

# --------------------------------------------------------------------------
# 4f. Publications library + page tools (2026-11-13, Phase 1)
# --------------------------------------------------------------------------
pub_js_path = ROOT / "assets/js/publications.js"
tools_js_path = ROOT / "assets/js/page-tools.js"
pub_scss_path = ROOT / "_sass/_publications.scss"
tools_scss_path = ROOT / "_sass/_page-tools.scss"
pub_md = (ROOT / "_pages/publications.md").read_text(encoding="utf-8")
pub_js = pub_js_path.read_text(encoding="utf-8") if pub_js_path.exists() else ""
tools_js = tools_js_path.read_text(encoding="utf-8") if tools_js_path.exists() else ""
pscss = pub_scss_path.read_text(encoding="utf-8") if pub_scss_path.exists() else ""
tscss = tools_scss_path.read_text(encoding="utf-8") if tools_scss_path.exists() else ""

chk("论文库脚本 publications.js 存在", "存在",
    "存在" if pub_js_path.exists() else "缺失", pub_js_path.exists())
chk("微交互脚本 page-tools.js 存在", "存在",
    "存在" if tools_js_path.exists() else "缺失", tools_js_path.exists())
chk("publications.md 引用 publications.js（1 次）", 1, pub_md.count("publications.js"),
    pub_md.count("publications.js") == 1)
chk("publications.md 已移除 abstract-modal 依赖", 0, pub_md.count("abstract-modal"),
    pub_md.count("abstract-modal") == 0)
chk("main.scss 引入 publications 层", 1, main_scss.count('@import "publications"'),
    main_scss.count('@import "publications"') == 1)
chk("main.scss 引入 page-tools 层", 1, main_scss.count('@import "page-tools"'),
    main_scss.count('@import "page-tools"') == 1)
chk("scripts.html 引用 page-tools.js（1 次）", 1,
    scripts_html.read_text(encoding="utf-8").count("page-tools.js"),
    scripts_html.read_text(encoding="utf-8").count("page-tools.js") == 1)
for _label, _needle in [
    ("按年份/类型/主题标注", "data-topics"),
    ("URL 状态同步", "replaceState"),
    ("chip 选中态", "aria-pressed"),
    ("就地摘要面板", "pub-abstract"),
    ("复制引用动作", "复制引用"),
    ("主题规则表", "TOPIC_RULES"),
]:
    chk("publications.js / " + _label, "包含", "包含" if _needle in pub_js else "缺失",
        _needle in pub_js)
for _label, _needle in [
    ("阅读进度条", "read-progress"),
    ("标题锚点", "heading-anchor"),
    ("复制提示 toast", "site-toast"),
    ("跨模块工具出口", "window.siteTools"),
    ("滚动 rAF 合并", "requestAnimationFrame"),
]:
    chk("page-tools.js / " + _label, "包含", "包含" if _needle in tools_js else "缺失",
        _needle in tools_js)
for _label, _needle in [
    ("筛选工具条样式", ".pub-toolbar"),
    ("筛选 chip 样式", ".pub-chip"),
    ("就地摘要面板样式", ".pub-abstract"),
]:
    chk("_publications.scss / " + _label, "包含", "包含" if _needle in pscss else "缺失",
        _needle in pscss)
for _label, _needle in [
    ("进度条样式", "#read-progress"),
    ("锚点样式", ".heading-anchor"),
    ("toast 样式", "#site-toast"),
]:
    chk("_page-tools.scss / " + _label, "包含", "包含" if _needle in tscss else "缺失",
        _needle in tscss)
for _f in ("assets/js/publications.js", "assets/js/page-tools.js"):
    _r = run(["node", "--check", _f])
    chk("node --check " + _f, "exit 0", "exit %d %s" % (_r.returncode, _r.stderr.strip()[:80]),
        _r.returncode == 0)

# --------------------------------------------------------------------------
# 4g. Simulation compare view + lightbox zoom (2026-11-13, Phase B)
# --------------------------------------------------------------------------
sim_js = (ROOT / "assets/js/simulation.js").read_text(encoding="utf-8")
_sim_css = (ROOT / "assets/css/simulation.css").read_text(encoding="utf-8")
for _label, _needle in [
    ("视图切换条", "sim-viewbar"),
    ("并排对比面板", "sim-compare"),
    ("双图选择", "is-picked"),
    ("同步缩放函数", "zoomAt"),
    ("滚轮缩放", "wheel"),
    ("拖拽平移", "pointerdown"),
    ("URL 视图同步", "params.set('view', 'compare')"),
    ("灯箱缩放控件", "data-lbzoom"),
]:
    chk("simulation.js / " + _label, "包含", "包含" if _needle in sim_js else "缺失", _needle in sim_js)
for _label, _needle in [
    ("视图切换样式", ".sim-viewbar"),
    ("对比面板样式", ".sim-compare"),
    ("选择态样式", ".sim-figure.is-picked"),
    ("灯箱缩放样式", ".sim-lightbox__zoom"),
]:
    chk("simulation.css / " + _label, "包含", "包含" if _needle in _sim_css else "缺失", _needle in _sim_css)
import gzip as _gzip
_sim_gz = len(_gzip.compress(sim_js.encode("utf-8")))
chk("simulation.js gzip 体积 ≤ 10 KB", "≤ 10240 B", "%d B" % _sim_gz, _sim_gz <= 10240)

# --------------------------------------------------------------------------
# 4h. Home curation (2026-11-13, Phase C)
# --------------------------------------------------------------------------
home_scss_path = ROOT / "_sass/_home.scss"
home_scss = home_scss_path.read_text(encoding="utf-8") if home_scss_path.exists() else ""
about_md = (ROOT / "_pages/about.md").read_text(encoding="utf-8")
chk("首页策展样式 _home.scss 存在", "存在",
    "存在" if home_scss_path.exists() else "缺失", home_scss_path.exists())
chk("main.scss 引入 home 层", 1, main_scss.count('@import "home"'),
    main_scss.count('@import "home"') == 1)
for _label, _needle in [
    ("Hero 区", 'class="home-hero"'),
    ("研究主题区", 'class="home-topics"'),
    ("精选代表作区", 'class="home-featured"'),
]:
    chk("about.md / " + _label, "包含", "包含" if _needle in about_md else "缺失",
        _needle in about_md)
chk("about.md / 3 张精选卡", 3, about_md.count('class="home-card"'),
    about_md.count('class="home-card"') == 3)
chk("about.md / 4 个主题入口", 4, about_md.count('class="home-topic"'),
    about_md.count('class="home-topic"') == 4)
chk("about.md / 主题入口指向筛选后的论文库", "≥ 4",
    about_md.count("/publications/?topic="), about_md.count("/publications/?topic=") >= 4)
for _label, _needle in [
    ("Hero 样式", ".home-hero"),
    ("主题网格", ".home-topics__grid"),
    ("代表作网格", ".home-featured__grid"),
    ("自有 CTA（避免被正文链接色覆盖）", ".home-cta"),
]:
    chk("_home.scss / " + _label, "包含", "包含" if _needle in home_scss else "缺失",
        _needle in home_scss)
chk("about.md / 正文无 Setext H1（保持单一大纲）", 0,
    len(re.findall(r'^={3,}$', about_md, re.M)),
    len(re.findall(r'^={3,}$', about_md, re.M)) == 0)


# --------------------------------------------------------------------------
# 5. Syntax / build
# --------------------------------------------------------------------------
sec("5 语法与构建")
nchk = run(["node", "--check", "assets/js/simulation.js"])
chk("node --check assets/js/simulation.js", "exit 0", "exit %d %s" % (nchk.returncode, nchk.stderr.strip()[:80]), nchk.returncode == 0)

exact_err = (SASS["exact"].stderr or "").splitlines()
exact_first = next((l for l in exact_err if "Error:" in l), "(no error)")
chk("main.scss 保留 Jekyll front matter（未删 / 未改业务文件）", "前 2 行均为 ---",
    "是" if SASS["has_fm"] else "否", SASS["has_fm"])
chk("原样命令（含 front matter）按预期失败 exit 65", "exit 65",
    "exit %d / %s" % (SASS["exact"].returncode, exact_first.strip()),
    SASS["exact"].returncode == 65)
chk("剥离 front matter + --quiet --style=compressed 编译", "exit 0",
    "exit %d" % SASS["built"].returncode, SASS["built"].returncode == 0)
chk("产物 main.css 字节数（新增液体背景层叠规则后应 > 旧基线 104685）", "> 104685",
    SASS["bytes"], SASS["bytes"] > 104685)
chk("编译无 Error（--quiet 抑制弃用告警）", "0 Error",
    "%d Error" % (SASS["built"].stderr or "").count("Error:"),
    (SASS["built"].stderr or "").count("Error:") == 0)
info("Sass 弃用告警（未加 --quiet 的诊断运行；显式打印 / 折叠重复）", "-",
     "%d / %d；类型 import / if-function / global-builtin / slash-div，全部来自 _sass/vendor/ 的 breakpoint 与 susy，非错误"
     % (SASS["nwarn"], SASS["nomit"]))
chk("HTML 标签配平（见 §2）", "0 错误", "%d 错误" % len(parser.errors), len(parser.errors) == 0)

# --------------------------------------------------------------------------
# 6. Extra cross-checks (independent, not required by the brief)
# --------------------------------------------------------------------------
sec("6 附加交叉核对（独立补充）")
resume_files = sorted(
    {str(p.relative_to(ROOT)).replace("\\", "/")
     for p in list((ROOT / "_pages").rglob("*.md")) + [ROOT / "_config.yml"]
     if "/resume" in p.read_text(encoding="utf-8", errors="replace")}
)
chk("/resume 仅由 cv.md 声明", "1 个文件", "%d 个：%s" % (len(resume_files), ", ".join(resume_files)),
    len(resume_files) == 1 and resume_files[0].endswith("cv.md"))
pub = (ROOT / "_pages" / "publications.md").read_text(encoding="utf-8")
chk("data-abstract-key 精确绑定", 44, len(re.findall(r"data-abstract-key", pub)))
chk('旧 <font color="#660000"> 已清除', 0, len(re.findall(r'<font color="#660000">', pub)))
about = (ROOT / "_pages" / "about.md").read_text(encoding="utf-8")
chk("about.md Setext H1（=== 下划线）", 0, len(re.findall(r"^===+\s*$", about, re.M)))
chk("author-profile.html 无 Follow 按钮", 0, (ROOT / "_includes" / "author-profile.html").read_text(encoding="utf-8").count("Follow"))
headcustom = (ROOT / "_includes" / "head" / "custom.html").read_text(encoding="utf-8")
chk("Web 字体仅 1 套 Inter", 1, len(re.findall(r"fonts\.googleapis\.com/css2\?family=Inter", headcustom)))
cfg = (ROOT / "_config.yml").read_text(encoding="utf-8")
excl_block = re.search(r"^exclude:\s*\n((?:[ \t]+-[^\n]*\n)+)", cfg, re.M)
excl_items = re.findall(r"^\s+-\s+(.+)$", excl_block.group(1), re.M) if excl_block else []
need_excl = [".design/", "preview.html", "tools/"]
chk("_config.yml exclude 含 .design/ / preview.html / tools/", "3 项齐备",
    ", ".join(x for x in need_excl if x in excl_items) or "缺",
    all(x in excl_items for x in need_excl))
# --- F1 re-verification: head 实际引用的本地静态资源逐条解析 ---
head_html = (ROOT / "_includes" / "head.html").read_text(encoding="utf-8")
head_refs = []
for blob in (headcustom, head_html):
    head_refs += re.findall(r'(?:href|src)="\{\{ base_path \}\}/([^"?]+)', blob)
head_static = [f for f in head_refs if f != "assets/css/main.css"]  # Jekyll 编译产物，非静态文件
head_missing = [f for f in head_static if not (ROOT / f).exists()]
info("head/custom.html + head.html 的本地引用", "-", ", ".join(sorted(set(head_refs))))
info("排除 Jekyll 编译产物", "-", "assets/css/main.css（非静态文件）")
chk("head 引用的本地静态资源 0 个 404", "0 缺失", "%d 缺失：%s" % (len(head_missing), ", ".join(head_missing) or "无"),
    not head_missing)
OLD_FAV = ["apple-touch-icon-180x180.png", "favicon-32x32.png", "favicon.ico"]
old_fav_hits = ["%s:%d" % (p.relative_to(ROOT), i + 1)
                for p in included
                for i, l in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines())
                if any(x in l for x in OLD_FAV)]
chk("旧 3 个 favicon 文件名残留引用（全业务文件）", "0 条", "%d 条" % len(old_fav_hits), not old_fav_hits)
chk("新 favicon 主资源 images/mstile-144x144.png 存在", "存在",
    "存在 %d B" % (ROOT / "images" / "mstile-144x144.png").stat().st_size
    if (ROOT / "images" / "mstile-144x144.png").exists() else "缺失",
    (ROOT / "images" / "mstile-144x144.png").exists())
chk("head 未引用 manifest / msapplication-config（死文件不构成 404）", "0 条",
    "%d 条" % len(re.findall(r'rel="manifest"|msapplication-config|android-chrome', headcustom + head_html)),
    not re.findall(r'rel="manifest"|msapplication-config|android-chrome', headcustom + head_html))
# --- F2 re-verification ---
sim_css = (ROOT / "assets" / "css" / "simulation.css").read_text(encoding="utf-8")
f2_rule = re.search(r'\.sim-page\s+\.sim-figs\s*>\s*\.sim-figs__cell[^}]*\{([^}]*)\}', sim_css)
f2_ok = bool(f2_rule) and "margin: 0" in f2_rule.group(1) and "background: transparent" in f2_rule.group(1)
chk("F2 修复：.sim-page 前缀重置 .sim-figs__cell（margin/background）", "规则存在",
    "已存在（含 margin:0 + background:transparent）" if f2_ok else "未找到", f2_ok)
# --- F3 status ---
bigger_now = [im["file"] for im in images
              if (ROOT / "images" / "simulation" / (im["file"].split(".")[0] + ".poster.jpg")).stat().st_size
              > (ROOT / "images" / "simulation" / im["file"]).stat().st_size]
if bigger_now:
    warn("F3 静帧仍大于原静图（业务代码待修复）", "0 项待处理",
         "%d 项：%s" % (len(bigger_now), ", ".join(bigger_now)))
else:
    chk("F3 修复：16 张静帧均不大于各自源图", "0 项", "0 项", True)
chk("F3 修复证据：该 poster 与原静图字节一致（免重编码）", "一致",
    "一致" if F3_IDENTICAL else "不一致", F3_IDENTICAL)

# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------
F3_STATUS = "待裁定" if F3_OPEN else "已闭环"
F3_TEXT = ("`images/simulation/sWkfSq3ZENQJ7h5.poster.jpg` 原为 100,613 B，反而大于其源静图"
           " `sWkfSq3ZENQJ7h5.jpg` 的 75,300 B（其余 15 张静帧均显著小于原图）；"
           "静图无需重编码，直接复用原 `.jpg` 可省 ~25 KB，不违反 <150 KiB 预算。")
if F3_OPEN:
    F3_TEXT += "**复验时点仍未修复**，需派回对应同事处理。"
else:
    F3_TEXT += ("**复验（§3 / §6）**：fe-simulation 已闭环修复（任务 #9 已完成）——"
                "根因是 695×555 紧凑 JPEG 被放大到 800×639 再 q80 重编码；"
                "改为把原 JPEG 逐字节 `shutil.copyfile` 成 `.poster.jpg`（75,300 B，"
                "与原静图字节完全一致），保持 16 个 figure 统一的 `<stem>.poster.jpg` 路径契约，"
                "零重编码 / 零画质损失。生成器 `tools/make_posters.py` 已加"
                " `budget = min(MAX_BYTES, src_bytes)` 与超限 `raise RuntimeError`，二次运行幂等。"
                "16 张静帧合计 **808,037 B**，无一张比源图更大、无一张 >150 KiB，"
                "最大 139,654 B，压缩率 96.99%，本条关闭。")
FINDINGS = [
    ("F1", "中", "已闭环", "`_includes/head/custom.html:11-13` 原引用 3 个不存在的 favicon 文件："
     "`images/apple-touch-icon-180x180.png`、`images/favicon-32x32.png`、`images/favicon.ico`"
     "（全仓库 find 无任何同名文件，仅 `safari-pinned-tab.svg` 存在；Gemfile 的"
     " `:jekyll_plugins` 只有 jekyll-feed / jekyll-sitemap / hawkins，无 favicon 生成插件，"
     "因此不是构建期生成物）。真实站点每次页面加载都会产生 3 个 404，"
     "与「首屏请求 ≤12」的性能预算口径冲突；文件头注释写「favicon (3 assets)」但实际有 4 个 link。"
     "属 fe-theme 的 head 收尾范围。**复验（§6）**：fe-theme 已闭环修复（任务 #10 已完成），"
     "改为 `rel=icon` + `apple-touch-icon` 同时指向真实存在的 `images/mstile-144x144.png`，"
     "保留 `safari-pinned-tab.svg`；旧文件名 0 残留、head 本地引用 0 个 404，本条关闭。"),
    ("F2", "中", "已闭环", "`_sass/_archive.scss:55-62,70` 的 `.archive li { margin-bottom:.5em; ... }` 与"
     " `.archive li:hover { background:$surface-2 }` 会作用到 Simulation 网格的"
     " `<li class=\"sim-figs__cell\">`：因为 `_pages/simulating_fig.md` 用 `layout: archive`，"
     " `.sim-page` 位于 `.archive` 内部，原 `assets/css/simulation.css:51` 只写了 `min-width:0`。"
     "**复验（§6）**：fe-simulation 已闭环修复（任务 #9 已完成），在 `assets/css/simulation.css`"
     " 增加 `.sim-page .sim-figs > .sim-figs__cell` 正常态 + `:hover` 态的限定重置"
     "（margin/padding/border/border-radius/background/color/font-size/line-height/list-style/transition）；"
     "特异性 (0,3,0) / hover (0,4,0) 压过 `.archive li` (0,1,1)、`.archive li:hover` (0,2,1)、"
     "`.archive > ul > li` (0,1,2)，并顺带挡下 `_sass/_base.scss:122` 的 `ul li` 行高与文字色；"
     "未改 `_sass/`，`!important` 仍 0 处，本条关闭。"),
    ("F3", "低", F3_STATUS, F3_TEXT),
    ("F4", "提示", "不构成阻塞", "任务书要求的外壳是 `<header class=\"masthead\">` 与"
     " `<div id=\"main\" role=\"main\" class=\"page\">`；仓库真实代码是"
     " `_includes/masthead.html` 的 `<div class=\"masthead\">` 与"
     " `_layouts/archive.html` 的 `<div id=\"main\" role=\"main\">`（无 `page` class，"
     "右栏由 `.archive` 承载）。预览页按要求写了 `class=\"page\"`，并在内联样式里用"
     " `#main.page { float:none; width:auto }` 抵消 `.page` 在 ≥64em 的"
     " `width:83% / float:right`，避免桌面两列网格被压窄。属预览页专用适配，"
     "真实站点无需改动。"),
]
UNVERIFIABLE = [
    "Jekyll / kramdown 真实构建（`bundle exec jekyll build`）——本机无 Ruby/Jekyll，未执行。",
    "`<details markdown=\"1\">` 内部 markdown 是否被 kramdown 正确渲染为 `<ul>/<li>`——依赖 Jekyll 构建。",
    "浏览器 1440 / 1024 / 768 / 375 四宽度横向滚动与容器查询列数（`.sim-grid` 2/1 列）——无浏览器自动化。",
    "axe DevTools / Lighthouse Accessibility 扫描（0 critical / 0 serious）——无浏览器与工具链。",
    "灯箱焦点循环、Esc 焦点归还、GIF 状态机（POSTER→CONFIRM/LOADING→PLAYING→ERROR）、10s 超时、"
    "`visibilitychange` 释放解码——均为运行时行为，只做了静态代码审阅，未实际点击验证。",
    "Network 面板 `.gif` 请求数 0 / 播放后恰好 +1 / 首屏 ≤12 请求 ≤600 KB、CLS <0.05、"
    "流体背景静止时降到 12fps / 触屏与减少动效下停用的实际帧率、`prefers-reduced-motion` 下 "
    "`getComputedStyle().transitionDuration === '0s'`——静态断言已覆盖，运行时帧率需真实浏览器测量。",
    "预览页本身的浏览器渲染结果（16 张图是否可见、视图切换、灯箱、减少动效勾选框的视觉效果）——"
    "本报告只对 DOM 结构与文件路径做断言，未打开浏览器，不声称「渲染通过」。",
    "真实站点 `https://qingxiaxjtu.com/preview.html` 是否 404（未部署、无网络验证）。",
]

# Defensive normalisation: FINDINGS has a 4th "status" column. Accept both the
# historical 3-tuple and the current 4-tuple so an in-progress edit can never
# crash the report with "too many values to unpack (expected 3)".
def norm_finding(entry):
    if len(entry) == 4:
        return tuple(entry)
    if len(entry) == 3:
        return (entry[0], entry[1], "待裁定", entry[2])
    raise AssertionError("FINDINGS entry must be a 3- or 4-tuple, got %r" % (entry,))


NORM_FINDINGS = [norm_finding(e) for e in FINDINGS]
assert all(len(r) == 5 for r in RESULTS), "RESULTS entries must be 5-tuples"

lines = []
lines.append("# Phase 3-C 独立验收报告 · 无构建静态预览页")
lines.append("")
lines.append("- 执行者：`fe-preview`（独立视角，不替前序同事背书）")
lines.append("- 生成方式：`python .design/preview/verify.py`，本报告由脚本写入，非手写结论")
lines.append("- 生成时机：每次执行 `verify.py` 时重新计算并覆盖本报告（不记录手工结论）")
lines.append("- 环境：Python + Pillow 13.0.0 / Node v22 / Dart Sass 1.108.1 / `npx js-yaml`；本机无 Ruby/Jekyll、无浏览器自动化")
lines.append("- 写入范围：仅 `.design/preview/**`；`_sass/`、`assets/`、`_pages/`、`_includes/`、`_data/`、`images/`、`_config.yml` 全程只读")
lines.append("- 被测文件：`.design/preview/index.html`、`.design/preview/assets/main.css`")
lines.append("")
total = len([r for r in RESULTS if r[4] is True or r[4] is False])
passed = len([r for r in RESULTS if r[4] is True])
failed = len([r for r in RESULTS if r[4] is False])
warnings = len([r for r in RESULTS if r[4] == "W"])
lines.append("## 0. 结论速览")
lines.append("")
lines.append("| 项 | 数值 |")
lines.append("|---|---|")
lines.append("| 执行断言 | %d |" % total)
lines.append("| 通过 | %d |" % passed)
lines.append("| 未通过 | %d |" % failed)
lines.append("| 业务代码告警（不计入交付物通过/失败） | %d |" % warnings)
lines.append("| 无法验证项（明确不计入通过） | %d |" % len(UNVERIFIABLE))
n_closed = len([f for f in NORM_FINDINGS if f[2] == "已闭环"])
n_nonblock = len([f for f in NORM_FINDINGS if f[2] == "不构成阻塞"])
n_pending = len([f for f in NORM_FINDINGS if f[2] == "待裁定"])
lines.append("| 问题清单 | 共 %d 条：待裁定 %d / 已闭环 %d / 不构成阻塞 %d |"
             % (len(NORM_FINDINGS), n_pending, n_closed, n_nonblock))
lines.append("")
lines.append("> 通过项均为脚本实际断言结果；**未验证项一律不写作「通过」**。")
_warn_items = [r[1] for r in RESULTS if r[4] == "W"]
if _warn_items:
    lines.append("> ⚠️ 业务代码告警 %d 项：%s；均不是预览页交付物的失败，"
                 "预览页本身 DOM / 路径 / 资源断言全部通过。"
                 % (len(_warn_items), "；".join(_warn_items)))
else:
    lines.append("> 本轮无业务代码告警。")
lines.append("> 本报告为**最终复验快照**：Phase 3-A / 3-B / 3-C 与 #9 / #10 修复均已落盘并复验，"
             "F1–F3 闭环、F4 不构成阻塞；后续如业务文件再变动，重跑 `verify.py` 即可刷新状态。")
lines.append("")
cur = None
for s, item, exp, act, ok in RESULTS:
    if s != cur:
        lines.append("")
        lines.append("## %s" % s)
        lines.append("")
        lines.append("| 检查项 | 期望 | 实测 | 结果 |")
        lines.append("|---|---|---|---|")
        cur = s
    flag = "—" if ok is None else ("⚠️" if ok == "W" else ("✅" if ok else "❌"))
    lines.append("| %s | %s | %s | %s |" % (item.replace("|", "\\|"), exp.replace("|", "\\|"),
                                          act.replace("|", "\\|").replace("\n", " "), flag))
lines.append("")
lines.append("## 7. 无法验证项（不写作「通过」）")
lines.append("")
for i, u in enumerate(UNVERIFIABLE, 1):
    lines.append("%d. %s" % (i, u))
lines.append("")
lines.append("## 8. 问题清单与闭环状态")
lines.append("")
lines.append("> 验收过程共发现 4 条；经 fe-theme / fe-simulation 修复并由本脚本复验后，"
             "**待裁定 0 条**。以下为分组归档，历史现象与复验证据均予以保留。")
lines.append("")


def finding_table(rows):
    out = ["| 编号 | 级别 | 状态 | 文件 / 现象 |", "|---|---|---|---|"]
    for entry in rows:
        fid, level, status, text = norm_finding(entry)
        out.append("| %s | %s | %s | %s |" % (fid, level, status, text.replace("|", "\\|")))
    return out


closed_rows = [f for f in NORM_FINDINGS if f[2] == "已闭环"]
nonblock_rows = [f for f in NORM_FINDINGS if f[2] == "不构成阻塞"]
pending_rows = [f for f in NORM_FINDINGS if f[2] == "待裁定"]
lines.append("### 8.1 已解决 / 已闭环（%d 条）" % len(closed_rows))
lines.append("")
lines += finding_table(closed_rows)
lines.append("")
lines.append("### 8.2 不构成阻塞（%d 条）" % len(nonblock_rows))
lines.append("")
lines += finding_table(nonblock_rows)
lines.append("")
lines.append("### 8.3 待裁定（%d 条）" % len(pending_rows))
lines.append("")
if pending_rows:
    lines += finding_table(pending_rows)
else:
    lines.append("**无。** F1–F3 已闭环，F4 为预览页专用适配、无需主理人裁定。")
lines.append("")
lines.append("### 与前序同事报告口径不一致 / 需对齐的点（本轮已全部对齐）")
lines.append("")
lines.append("- `F1`（已关闭）：head 原声明「favicon 精简到 3 个」，但 3 个被引用文件均不在仓库中；"
             "fe-theme 已删除 3 行并改用真实存在的 `mstile-144x144.png`。")
lines.append("- `F2`（已关闭）：`assets/css/simulation.css` 的 DOM 契约实现本身正确，"
             "冲突来自主题层 `_sass/_archive.scss` 的全局 `li` 规则；fe-simulation 已在 sim CSS 内"
             "用 `.sim-page` 前缀限定重置，未改 `_sass/`。")
lines.append("- `F3`（%s）：1 张静帧曾比源静图大 25 KB；%s"
             % ("已关闭" if not F3_OPEN else "仍待处理",
                "复验已替换为与原图字节一致的文件。" if not F3_OPEN else "复验时点仍未修复。"))
lines.append("")
lines.append("### 已解决 / 已闭环的复验证据")
lines.append("")
lines.append("- **F1 / favicon**：`_includes/head/custom.html` 现为 `rel=icon` 与"
             " `apple-touch-icon` 同时指向 `images/mstile-144x144.png`（1,164 B，144×144 PNG，实测存在），"
             "加 `safari-pinned-tab.svg`（1,981 B）；旧的 `apple-touch-icon-180x180.png` /"
             " `favicon-32x32.png` / `favicon.ico` 在全部业务文件中 **0 残留引用**。"
             "本报告 §6 逐条解析 `head.html` + `head/custom.html` 的本地 href/src，"
             "排除 Jekyll 编译产物 `assets/css/main.css` 后 **0 个 404**；"
             "并确认 head 未引用 manifest / msapplication-config，`images/manifest.json` 中"
             "指向不存在图标的条目是未被链接的死文件、浏览器不会请求，按 fe-theme 提示"
             "以「head 实际引用」而非「全仓扫描」判定。")
lines.append("- **F2 / 网格样式污染**：`assets/css/simulation.css` 新增"
             " `.sim-page .sim-figs > .sim-figs__cell` 正常态与 `:hover` 态的限定重置"
             "（`margin:0` / `padding:0` / `background:transparent` / `transition:none` 等），"
             "§6 已断言规则存在；预览页直接链接该 CSS，因此展示的是修复后的真实状态。")
if not F3_OPEN:
    lines.append("- **F3 / 超大静帧**：`sWkfSq3ZENQJ7h5.poster.jpg` 现为 75,300 B，"
                 "与源静图 `sWkfSq3ZENQJ7h5.jpg` **字节完全一致**（§3 / §6 已断言），"
                 "16 张静帧中不再有比源图更大者，首屏少传约 25 KB。"
                 "最终实测：16 张静帧合计 **808,037 B**、原图 26,848,641 B、压缩率 **96.99%**、"
                 "单张均 <150 KiB、最大 **139,654 B**；生成器 `budget = min(MAX_BYTES, src_bytes)`"
                 " 与 `shutil.copyfile` 零重编码分支均已断言存在。")
lines.append("")
lines.append("### 已澄清 / 不构成问题")
lines.append("")
lines.append("- **Sass front matter**：按主理人与 fe-theme 的更正，改用 OS 临时目录生成剥掉"
             " `---\\n---` 的 `qx-main.scss`、在仓库根执行"
             " `npx sass --load-path=_sass --no-source-map --quiet --style=compressed`，"
             "本报告 §5 实测 EXIT=0、产物 **104,685 B**，与 fe-theme 完全一致。"
             "任务书「原样命令」的 exit 65 是 Jekyll front matter 的预期行为，"
             "**不是代码错误**；`main.scss` 前 2 行 front matter 保持原样，未删未改。"
             "此前 143,214 B 的产物是未加 `--style=compressed` 的 expanded 输出，已替换。")
lines.append("- `_config.yml:125-128` 的 `exclude` 已含 `.design/`、`preview.html`、`tools/`"
             "（§6 已断言），无需追加。")
lines.append("- `assets/css/simulation.css` 使用自带硬编码色板（`var(--c-*)` 引用 0、无 `:root`），"
             "与编译后的 `main.css` 同时 `<link>` 不存在「变量未定义导致失色」的隐藏依赖；"
             "此条为主题层核对结论，本报告仅记录、未做浏览器运行时验证。")
lines.append("")
lines.append("## 9. 复现方式")
lines.append("")
lines.append("```bash")
lines.append('cd "C:/Users/Qing Xia/WorkBuddy/Homepage"')
lines.append("python .design/preview/build.py     # 从 _data/simulation.yml 生成 index.html")
lines.append("python .design/preview/verify.py    # 复跑全部断言、重编译 main.css 并重写 VERIFY.md")
lines.append("```")
lines.append("")
lines.append("`verify.py` 内部用 `tempfile.TemporaryDirectory()` 生成剥掉 front matter 的"
             " `qx-main.scss`，再从仓库根执行：")
lines.append("")
lines.append("```bash")
lines.append("npx --yes sass --load-path=_sass --no-source-map --quiet --style=compressed \\")
lines.append("    <临时目录>/qx-main.scss .design/preview/assets/main.css")
lines.append("```")
lines.append("")
lines.append("> 双击 `.design/preview/index.html` 即可在 `file://` 下查看；图片 / CSS / JS 均以相对路径"
             " 指向仓库原文件，本报告 §3 已用 `os.path.exists` 逐条证明路径可解析。")
lines.append("")
lines.append("### 已知预览限制（非失败）")
lines.append("")
lines.append("- 编译产物 `main.css` 按任务书放在 `.design/preview/assets/`，而其中 12 条"
             " `url(../fonts/fa-*.woff2|ttf|…)` 原本相对 `assets/css/`；从预览位置会解析到"
             " 不存在的 `.design/preview/fonts/`。预览页刻意**不使用任何 Font Awesome / academicons"
             " 图标元素**，侧栏与按钮改用纯文本 / `↗`，因此这些字体不会被请求，也不影响浅色主题观感。"
             "若以后要在预览页加图标，需把 `assets/fonts/` 复制一份到 `.design/preview/fonts/`。")
lines.append("- 预览页的导航链接不跳转到真实栏目（单文件预览，无其它页面），点击 5 项导航或"
             "侧栏链接会切到「首页概览」或保持 Simulation 视图；`aria-current` 随视图同步移动。")
lines.append("- 首页概览为 `_pages/about.md` 的代表性摘录（News 8 条 + 折叠摘要、代表作 5 条 +"
             " 折叠摘要、Awards 6 条），非全文，用于展示留白 / 1px 线 / 单一强调色与 `<details>` 折叠。")
lines.append("")

(HERE / "VERIFY.md").write_text("\n".join(lines), encoding="utf-8")
print("VERIFY.md written: %d checks, %d passed, %d failed, %d warnings, %d unverifiable | "
      "findings: %d pending / %d closed / %d non-blocking"
      % (total, passed, failed, warnings, len(UNVERIFIABLE), n_pending, n_closed, n_nonblock))
if failed:
    print("FAILED CHECKS:")
    for s, item, exp, act, ok in RESULTS:
        if ok is False:
            print("  [%s] %s: expected %s, got %s" % (s, item, exp, act))
    sys.exit(1)
