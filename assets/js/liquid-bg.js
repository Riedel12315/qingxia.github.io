/**
 * Liquid Flow Background — DeepSeek-style flowing gradient liquid
 * ============================================================================
 * 整体：WebGL 片元着色器，用域扭曲 fbm 噪声生成缓慢流动的蓝紫渐变"液体"，
 *       视觉参考 DeepSeek 官网背景（深海军蓝底 + 流动的蓝/紫/青光斑）。
 * 鼠标：不再使用"彩色光点汇聚"特效。鼠标移动时向一张低分辨率"流速场"
 *       （flow map）注入速度冲量，流速场缓慢扩散、指数衰减 —— 液体会被
 *       "搅动"并在鼠标离开后带着惯性慢慢回弹，形成粘稠液体的手感。
 *
 * 特性：
 *   - 深色 / 浅色两套配色，跟随 theme-switcher 平滑过渡
 *   - 尊重 prefers-reduced-motion（静态单帧）
 *   - 自适应分辨率（帧时间超预算自动降采样）
 *   - 不支持 WebGL 时自动退回原有 aurora 渐变背景
 */

(function () {
  'use strict';

  // ── 可调参数 ─────────────────────────────────────────────────────────────
  var MAX_V   = 0.5;    // 流速场在纹理中的编码范围（±0.5，aspect 空间/秒）
  var GRID_H  = 80;     // 流速场纵向格数（横向按宽高比折算）
  var DECAY   = 1.1;    // 流速场指数衰减率（/秒）—— 越小液体越"粘"，回弹越慢
  var DIFFUSE = 0.20;   // 每帧向四邻域扩散的比例
  var IMPULSE = 0.45;   // 鼠标速度注入强度
  var CURL    = 0.85;   // 鼠标转向时产生的旋涡强度

  // ── 运行时状态 ───────────────────────────────────────────────────────────
  var canvas = null, gl = null, prog = null;
  var uniforms = {};
  var gridW = 0, gridH = 0;
  var flow = null;               // Float32Array: 流速场 (vx, vy)
  var pixels = null;             // Uint8Array: 纹理字节 RGBA
  var flowTex = null;
  var resScale = 1.0;
  var reduced = false;
  var theme = 0, themeTarget = 0;
  var lastT = 0, frames = 0, accMs = 0;
  var rafId = 0;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, drag: 0 };
  var prevVx = 0, prevVy = 0, turn = 0;
  var lastX = 0, lastY = 0, lastMoveT = 0, hasMouse = false, mouseFresh = false;

  // ── 着色器源码 ───────────────────────────────────────────────────────────
  var VS_SRC = [
    'attribute vec2 aPos;',
    'void main() {',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FS_SRC = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform float u_theme;    // 0=深色 → 1=浅色',
    'uniform vec2  u_mouse;    // 平滑后的光标位置（aspect 空间）',
    'uniform vec2  u_vel;      // 平滑后的光标速度（aspect 空间/秒）',
    'uniform float u_drag;     // 当前拖拽强度 0..1',
    'uniform float u_flowStr;  // 流速场整体强度',
    'uniform sampler2D u_flow; // 累积流速场',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise(p);',
    '    p = m * p * 2.02 + 3.71;',
    '    a *= 0.55;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 res = u_res;',
    '  float ar = res.x / res.y;',
    '  vec2 uv = gl_FragCoord.xy / res;',
    '  vec2 p = vec2(uv.x * ar, uv.y);            // aspect 空间',
    '',
    '  float t = u_time * 0.05;',
    '  vec2 pb = p * 1.18;                        // 未漂移的基准坐标',
    '  vec2 pp = pb + vec2(t * 0.5, t * 0.32);    // 环境缓慢流动',
    '',
    '  // ── 累积流速场：鼠标搅动过的区域带着惯性继续流动 ──',
    '  vec2 fuv = vec2(p.x / ar, p.y);',
    '  vec2 flowV = texture2D(u_flow, fuv).rg * 2.0 - 1.0;',
    '  vec2 disp = flowV * u_flowStr * 1.15;',
    '',
    '  // ── 光标即时反馈：沿运动方向拉伸 + 环绕光标旋涡（粘稠感） ──',
    '  vec2 d = pb - u_mouse;',
    '  float r2 = dot(d, d);',
    '  float fall = exp(-r2 / 0.085);',
    '  float w = u_drag * fall;',
    '  disp += normalize(u_vel + vec2(0.0001)) * w * 0.10;',
    '  disp += vec2(-d.y, d.x) / (sqrt(r2) + 0.001) * w * 0.20;',
    '',
    '  // ── 域扭曲 fbm：让色场像液体一样融合流动 ──',
    '  vec2 q = vec2(fbm(pp + disp), fbm(pp + disp + vec2(5.2, 1.3)));',
    '  vec2 r = vec2(fbm(pp + disp + 2.0 * q + vec2(1.7, 9.2)),',
    '                fbm(pp + disp + 2.0 * q + vec2(8.3, 2.8)));',
    '  float f = fbm(pp + disp + 1.9 * r);',
    '',
    '  // ── 深色配色（DeepSeek 蓝紫系） ──',
    '  vec3 navy   = vec3(0.030, 0.042, 0.088);',
    '  vec3 blue   = vec3(0.190, 0.330, 0.950);',
    '  vec3 purple = vec3(0.470, 0.250, 0.920);',
    '  vec3 cyan   = vec3(0.120, 0.620, 0.930);',
    '  vec3 pink   = vec3(0.930, 0.320, 0.560);',
    '',
    '  vec3 col = navy;',
    '  col = mix(col, blue,   smoothstep(0.0, 0.85, f));',
    '  col = mix(col, purple, smoothstep(0.30, 0.90, q.y) * 0.66);',
    '  col = mix(col, cyan,   smoothstep(0.40, 0.95, r.x) * 0.68);',
    '  col = mix(col, pink,   smoothstep(0.55, 0.95, r.y) * 0.40);',
    '  col += vec3(0.14, 0.16, 0.34) * pow(f, 2.0) * 0.38;',
    '  col += vec3(0.30, 0.16, 0.55) * pow(r.y, 3.0) * 0.30;',
    '',
    '  // ── 浅色配色（柔和粉彩） ──',
    '  vec3 lBase   = vec3(0.968, 0.963, 0.955);',
    '  vec3 lBlue   = vec3(0.760, 0.830, 1.000);',
    '  vec3 lPurple = vec3(0.870, 0.820, 1.000);',
    '  vec3 lCyan   = vec3(0.730, 0.920, 1.000);',
    '  vec3 lPink   = vec3(1.000, 0.840, 0.890);',
    '  vec3 lcol = lBase;',
    '  lcol = mix(lcol, lBlue,   smoothstep(0.0, 0.85, f) * 0.75);',
    '  lcol = mix(lcol, lPurple, smoothstep(0.30, 0.90, q.y) * 0.55);',
    '  lcol = mix(lcol, lCyan,   smoothstep(0.40, 0.95, r.x) * 0.55);',
    '  lcol = mix(lcol, lPink,   smoothstep(0.55, 0.95, r.y) * 0.34);',
    '',
    '  col = mix(col, lcol, u_theme);',
    '',
    '  // 保持氛围感，不让背景压过内容',
    '  vec3 baseCol = mix(navy, lBase, u_theme);',
    '  col = mix(col, baseCol, 0.22);',
    '',
    '  // 暗角',
    '  vec2 vc = p - vec2(ar * 0.5, 0.5);',
    '  float maxR = sqrt(ar * ar * 0.25 + 0.25);',
    '  float vig = smoothstep(1.18, 0.55, length(vc) / maxR * 1.35);',
    '  col *= mix(0.80, 1.0, vig);',
    '',
    '  // 细微抖动，消除 8bit 色带',
    '  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // ── 初始化 ───────────────────────────────────────────────────────────────
  function isLight() {
    return document.documentElement.classList.contains('light-mode');
  }

  function removeCanvas() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    gl = null;
  }

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      try { console.error('[liquid-bg] shader error: ' + gl.getShaderInfoLog(sh)); } catch (e) {}
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function buildProgram() {
    var vs = compile(gl.VERTEX_SHADER, VS_SRC);
    var fs = compile(gl.FRAGMENT_SHADER, FS_SRC);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      try { console.error('[liquid-bg] link error: ' + gl.getProgramInfoLog(prog)); } catch (e) {}
      return false;
    }
    gl.useProgram(prog);

    // 全屏三角形
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    uniforms.u_res     = gl.getUniformLocation(prog, 'u_res');
    uniforms.u_time    = gl.getUniformLocation(prog, 'u_time');
    uniforms.u_theme   = gl.getUniformLocation(prog, 'u_theme');
    uniforms.u_mouse   = gl.getUniformLocation(prog, 'u_mouse');
    uniforms.u_vel     = gl.getUniformLocation(prog, 'u_vel');
    uniforms.u_drag    = gl.getUniformLocation(prog, 'u_drag');
    uniforms.u_flowStr = gl.getUniformLocation(prog, 'u_flowStr');
    uniforms.u_flow    = gl.getUniformLocation(prog, 'u_flow');

    flowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, flowTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return true;
  }

  function resize() {
    if (!canvas || !gl) return;
    var w = window.innerWidth, h = window.innerHeight;
    if (w < 2 || h < 2) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var s = Math.min(dpr, 1366 / Math.max(w, h)); // 内部分辨率上限
    s = Math.max(0.25, s * resScale);
    var iw = Math.max(2, Math.round(w * s));
    var ih = Math.max(2, Math.round(h * s));
    if (canvas.width !== iw || canvas.height !== ih) {
      canvas.width = iw;
      canvas.height = ih;
      gl.viewport(0, 0, iw, ih);
    }
    // 流速场网格（横向按宽高比折算，保持格子近正方形）
    var gw = Math.max(2, Math.round(GRID_H * (w / h)));
    if (gw !== gridW) {
      gridW = gw;
      gridH = GRID_H;
      flow = new Float32Array(gridW * gridH * 2);
      pixels = new Uint8Array(gridW * gridH * 4);
      for (var i = 3; i < pixels.length; i += 4) pixels[i] = 255;
      gl.bindTexture(gl.TEXTURE_2D, flowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gridW, gridH, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    if (reduced) render(performance.now());
  }

  // ── 鼠标 → 流速场注入 ────────────────────────────────────────────────────
  function onMouseMove(e) {
    var w = window.innerWidth, h = window.innerHeight;
    var ar = w / h;
    var nx = (e.clientX / w) * ar;
    var ny = e.clientY / h;
    var now = performance.now();
    var dtv = Math.max(0.004, (now - lastMoveT) / 1000);
    lastMoveT = now;
    var ivx = (nx - lastX) / dtv; // 瞬时速度（aspect 空间/秒）
    var ivy = (ny - lastY) / dtv;
    lastX = nx;
    lastY = ny;
    var kv = Math.min(1, dtv * 8);
    mouse.vx += (ivx - mouse.vx) * kv;
    mouse.vy += (ivy - mouse.vy) * kv;
    // 转向曲率（叉积），转向时产生旋涡
    var vl = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
    var pl = Math.sqrt(prevVx * prevVx + prevVy * prevVy);
    var cross = mouse.vx * prevVy - mouse.vy * prevVx;
    turn = (vl * pl > 1e-6) ? Math.max(-1, Math.min(1, cross / (vl * pl))) : 0;
    prevVx = mouse.vx;
    prevVy = mouse.vy;
    mouse.tx = nx;
    mouse.ty = ny;
    hasMouse = true;
    mouseFresh = true;
  }

  function onTouchMove(e) {
    if (e.touches && e.touches.length) onMouseMove(e.touches[0]);
  }

  function onMouseLeave() {
    hasMouse = false;
    prevVx = prevVy = 0;
    turn = 0;
    mouse.vx = mouse.vy = 0;
  }

  function splat(cx, cy, radius, vx, vy, strength) {
    var r = Math.ceil(radius);
    var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(gridW - 1, Math.floor(cx + r));
    var y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(gridH - 1, Math.floor(cy + r));
    var r2 = radius * radius * 0.5;
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        var g = Math.exp(-(dx * dx + dy * dy) / r2);
        var i = (y * gridW + x) * 2;
        flow[i]     += vx * g * strength;
        flow[i + 1] += vy * g * strength;
      }
    }
  }

  function updateMouse(dt) {
    var w = window.innerWidth, h = window.innerHeight;
    var ar = w / h;
    var k = Math.min(1, dt * 10);
    mouse.x += (mouse.tx - mouse.x) * k;
    mouse.y += (mouse.ty - mouse.y) * k;

    // 没有新的移动事件时，速度快速衰减 → 鼠标停下后不再注入
    if (!mouseFresh) {
      var vd = Math.exp(-6 * dt);
      mouse.vx *= vd;
      mouse.vy *= vd;
      turn = 0;
    }
    mouseFresh = false;

    var speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
    var target = hasMouse ? Math.min(1, speed * 2.6) : 0;
    // 快速拉起、缓慢回落 → 粘稠手感
    var up = Math.min(1, dt * (target > mouse.drag ? 9 : 2.2));
    mouse.drag += (target - mouse.drag) * up;

    if (hasMouse && mouse.drag > 0.02) {
      var cx = (mouse.x / ar) * gridW;
      var cy = mouse.y * gridH;
      var radius = 2.0 + Math.min(3.0, speed * 6.0);
      var s = IMPULSE * dt * Math.min(1, speed * 3.0) * (0.35 + 0.65 * mouse.drag);
      // 沿运动方向注入（拉伸）
      splat(cx, cy, radius, mouse.vx, mouse.vy, s);
      // 转向时注入垂直分量（旋涡）
      if (Math.abs(turn) > 0.03) {
        splat(cx, cy, radius, -mouse.vy, mouse.vx, s * turn * CURL);
      }
    }
  }

  function updateFlow(dt) {
    var decay = Math.exp(-DECAY * dt);
    var d = DIFFUSE * Math.min(1, dt * 60);
    var keep = 1 - d;
    var row = gridW * 2;
    for (var y = 0; y < gridH; y++) {
      var yBase = y * row;
      for (var x = 0; x < gridW; x++) {
        var i = yBase + x * 2;
        var vx = flow[i], vy = flow[i + 1];
        var ax = vx, ay = vy, n = 1;
        if (x > 0)         { ax += flow[i - 2];     ay += flow[i - 1];     n++; }
        if (x < gridW - 1) { ax += flow[i + 2];     ay += flow[i + 3];     n++; }
        if (y > 0)         { ax += flow[i - row];   ay += flow[i - row + 1]; n++; }
        if (y < gridH - 1) { ax += flow[i + row];   ay += flow[i + row + 1]; n++; }
        flow[i]     = (vx * keep + (ax / n) * d) * decay;
        flow[i + 1] = (vy * keep + (ay / n) * d) * decay;
      }
    }
    // 编码到 RG 字节
    for (var j = 0, m = gridW * gridH * 2; j < m; j += 2) {
      var b = j * 2;
      var rv = (flow[j]     / MAX_V) * 127 + 128;
      var gv = (flow[j + 1] / MAX_V) * 127 + 128;
      pixels[b]     = rv < 0 ? 0 : (rv > 255 ? 255 : rv);
      pixels[b + 1] = gv < 0 ? 0 : (gv > 255 ? 255 : gv);
    }
  }

  function render(tMs) {
    // dt 统一换算为秒（tMs 是 rAF 的毫秒时间戳）
    var dt = Math.min((tMs - lastT) / 1000, 0.05);
    if (!(dt > 0)) dt = 0.016;
    lastT = tMs;

    theme += (themeTarget - theme) * Math.min(1, dt * 2.2);
    if (Math.abs(themeTarget - theme) < 0.004) theme = themeTarget;

    if (!reduced) {
      updateMouse(dt);
      updateFlow(dt);
    }

    gl.useProgram(prog);
    gl.uniform2f(uniforms.u_res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.u_time, tMs / 1000);
    gl.uniform1f(uniforms.u_theme, theme);
    gl.uniform2f(uniforms.u_mouse, mouse.x, mouse.y);
    gl.uniform2f(uniforms.u_vel, mouse.vx, mouse.vy);
    gl.uniform1f(uniforms.u_drag, reduced ? 0 : mouse.drag);
    gl.uniform1f(uniforms.u_flowStr, reduced ? 0 : 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flowTex);
    gl.uniform1i(uniforms.u_flow, 0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gridW, gridH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(tMs) {
    rafId = requestAnimationFrame(loop);
    render(tMs);
    // 自适应质量：帧时间超预算则降采样，富余则恢复
    var ms = performance.now() - tMs;
    frames++;
    accMs += ms;
    if (frames >= 90) {
      var avg = accMs / frames;
      frames = 0;
      accMs = 0;
      if (avg > 24 && resScale > 0.4) {
        resScale = Math.max(0.4, resScale * 0.85);
        resize();
      } else if (avg < 12 && resScale < 1) {
        resScale = Math.min(1, resScale * 1.1);
        resize();
      }
    }
  }

  function bindEvents() {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onMouseLeave);
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 120);
    });
  }

  function init() {
    if (!window.WebGLRenderingContext) return;
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    canvas = document.createElement('canvas');
    canvas.id = 'liquid-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: 'low-power'
      }) || canvas.getContext('experimental-webgl', {
        alpha: false, antialias: false, depth: false, stencil: false
      });
    } catch (e) {
      gl = null;
    }
    if (!gl) { removeCanvas(); return; }
    if (!buildProgram()) { removeCanvas(); return; }

    // 启用后隐藏原有 aurora 渐变，避免双重背景
    document.documentElement.classList.add('liquid-bg-active');
    theme = themeTarget = isLight() ? 1 : 0;

    resize();
    bindEvents();

    if (window.MutationObserver) {
      new MutationObserver(function () {
        themeTarget = isLight() ? 1 : 0;
        if (reduced) render(performance.now());
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    if (reduced) {
      render(performance.now());
    } else {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  // ── 启动 ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
