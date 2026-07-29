---
layout: archive
title: "2D → 3D Printing"
permalink: /3dprinting/
author_profile: true
---

{% include base_path %}

<style>
  .print-container {
    max-width: 1100px;
    margin: 0 auto;
  }
  .print-intro {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 16px;
    padding: 2em 2em 1.5em;
    margin-bottom: 2em;
    text-align: center;
  }
  .print-intro h2 {
    font-size: 1.8em;
    margin-bottom: 0.3em;
    color: #333;
  }
  .print-intro p {
    color: #666;
    font-size: 1.05em;
    margin-bottom: 0.8em;
    line-height: 1.6;
  }
  .print-intro .features {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.8em;
    margin-top: 1em;
  }
  .print-intro .feature-tag {
    background: white;
    border-radius: 20px;
    padding: 0.4em 1em;
    font-size: 0.9em;
    color: #555;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .print-frame {
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .print-frame iframe {
    width: 100%;
    height: 900px;
    border: none;
    display: block;
  }
  .print-note {
    text-align: center;
    padding: 1.5em;
    color: #999;
    font-size: 0.85em;
  }
  .print-note a {
    color: #667eea;
  }

  @media (max-width: 768px) {
    .print-frame iframe { height: 750px; }
    .print-intro { padding: 1.5em 1em 1em; }
  }
</style>

<div class="print-container">

<div class="print-intro">
  <h2>📷 2D 照片 → 3D 打印浮雕</h2>
  <p>上传你的照片、logo 或插画，一键生成可直接 3D 打印的 STL 浮雕模型。
  <br>适合制作冰箱贴、钥匙扣挂件、徽章、纪念牌等个性化礼品。</p>
  <div class="features">
    <span class="feature-tag">🎨 自动分析识别</span>
    <span class="feature-tag">⭕ 圆形/心形/矩形</span>
    <span class="feature-tag">🔩 挂孔 + 磁铁槽</span>
    <span class="feature-tag">✏️ 文字雕刻</span>
    <span class="feature-tag">🧠 AI 深度估计</span>
    <span class="feature-tag">📦 STL 直接下载</span>
  </div>
</div>

<div class="print-frame">
  <!--
    ╔══════════════════════════════════════════════════════════════╗
    ║  部署 Web 后端后, 修改下面的 src 地址:                      ║
    ║                                                             ║
    ║  方案 1: Hugging Face Spaces (推荐, 免费永久)               ║
    ║    https://YOUR-USERNAME-2d-to-3d.hf.space                  ║
    ║                                                             ║
    ║  方案 2: 本地 Gradio share (临时, 72小时有效)               ║
    ║    python webui.py --share                                  ║
    ║    → https://xxxxx.gradio.live                              ║
    ║                                                             ║
    ║  方案 3: 自己部署到 VPS / 云服务器                          ║
    ║    https://your-server.com:7860                             ║
    ╚══════════════════════════════════════════════════════════════╝
  -->
  <iframe
    id="print-tool"
    title="2D → 3D 浮雕生成器"
    loading="lazy"
  >
  </iframe>
</div>

<div class="print-note">
  <p>支持 PNG / JPG / HEIC (iPhone) / WebP / BMP / TIFF 等 15 种图片格式</p>
  <p>Powered by <a href="https://github.com/Riedel12315/2dto3dprinting" target="_blank">2dto3dprinting</a>
  &nbsp;|&nbsp; <a href="https://github.com/LiheYoung/Depth-Anything" target="_blank">Depth-Anything</a>
  &nbsp;|&nbsp; <a href="https://github.com/danielgatis/rembg" target="_blank">rembg</a></p>
  <p style="margin-top:0.5em;">📖 <a href="https://github.com/Riedel12315/2dto3dprinting/blob/master/%E7%94%A8%E6%88%B7%E6%89%8B%E5%86%8C.md" target="_blank">完整使用手册</a></p>
</div>

</div>

<script>
  // ╔══════════════════════════════════════════════════════════════╗
  // ║  🔧 部署: 修改下面的地址指向你的 Gradio Web UI 后端        ║
  // ║                                                             ║
  // ║  Hugging Face Spaces: https://YOUR-USERNAME-xxx.hf.space    ║
  // ║  Gradio share:        https://xxxxx.gradio.live             ║
  // ║  自部署:              https://your-domain.com               ║
  // ╚══════════════════════════════════════════════════════════════╝
  var PRINT_TOOL_URL = "https://fktot-2409-8a55-35f0-7930-78cc-ec71-50d8-ac38.free.pinggy.net";

  (function() {
    if (PRINT_TOOL_URL) {
      document.getElementById("print-tool").src = PRINT_TOOL_URL;
    } else {
      // 未配置 URL 时显示提示
      var placeholder = document.createElement("div");
      placeholder.style.cssText = "text-align:center;padding:4em 2em;color:#888;";
      placeholder.innerHTML =
        '<p style="font-size:2em;margin-bottom:0.5em;">🖨️</p>' +
        '<p style="font-size:1.2em;margin-bottom:0.8em;">3D 打印服务暂未上线</p>' +
        '<p style="font-size:0.95em;">Web 后端正在部署中，请稍后访问。<br>' +
        '或前往 <a href="https://github.com/Riedel12315/2dto3dprinting" target="_blank" style="color:#667eea;">GitHub</a> 本地运行。</p>';
      document.getElementById("print-tool").replaceWith(placeholder);
    }
  })();
</script>
