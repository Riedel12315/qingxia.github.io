/**
 * Liquid Flow Background — light, near-invisible paper edition
 * ============================================================================
 * Adapted from the site's earlier DeepSeek-style WebGL fluid backdrop.
 * Mouse movement injects velocity into a low-res flow map; the field diffuses
 * and decays slowly, so the tinted paper "syrup" keeps drifting after the
 * cursor stops. At rest the surface is almost indistinguishable from #FAF9F6.
 *
 * Constraints for the light academic theme:
 *   - ONE skin only: warm paper white + a barely-there blue-green tint.
 *     No dark palette, no theme switcher, no aurora gradients.
 *   - Static state is nearly still (ambient flow slowed ~8x).
 *   - Idle throttling to 12fps; paused entirely when the tab is hidden.
 *   - Disabled on touch-only devices (hover:none) and under
 *     prefers-reduced-motion (a single static frame is rendered instead).
 *   - If WebGL is unavailable the canvas is removed and the plain CSS
 *     background remains — no visual regression, no JS dependency.
 */

(function () {
  'use strict';

  // ── 可调参数 ─────────────────────────────────────────────────────────────
  var MAX_V   = 0.7;    // 流速场在纹理中的编码范围（±0.7，aspect 空间/秒）
  var GRID_H  = 80;     // 流速场纵向格数（横向按宽高比折算）
  var DECAY   = 0.24;   // 流速场指数衰减率（/秒）—— 越小尾迹越绵长
  var DIFFUSE = 0.24;   // 每帧向四邻域扩散的比例
  var IMPULSE = 0.52;   // 鼠标速度注入强度（浅色版更克制）
  var CURL    = 0.85;   // 鼠标转向时产生的旋涡强度
  var IDLE_MS  = 2200;  // 鼠标静止多久后降帧
  var IDLE_FPS = 12;    // 静止时帧率上限

  // ── 运行时状态 ───────────────────────────────────────────────────────────
  var canvas = null, gl = null, prog = null;
  var uniforms = {};
  var gridW = 0, gridH = 0;
  var flow = null;               // Float32Array: 流速场 (vx, vy)
  var pixels = null;             // Uint8Array: 纹理字节 RGBA
  var flowTex = null;
  var resScale = 1.0;
  var reduced = false;
  var lastT = 0, frames = 0, accMs = 0;
  var rafId = 0;
  var lastIdleFrame = 0;
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
    '  float t = u_time * 0.075;',
    '  vec2 pb = p * 1.18;                        // 未漂移的基准坐标',
    '  vec2 pp = pb + vec2(t * 0.06, t * 0.045); // 极缓：静止时近乎不动',
    '',
    '  // ── 累积流速场：鼠标搅动过的区域带着惯性继续流动 ──',
    '  vec2 fuv = vec2(p.x / ar, p.y);',
    '  vec2 flowV = texture2D(u_flow, fuv).rg * 2.0 - 1.0;',
    '  vec2 disp = flowV * u_flowStr * 1.35;',
    '',
    '  // ── 光标即时反馈：沿运动方向拉伸 + 环绕光标旋涡（粘稠感） ──',
    '  vec2 d = pb - u_mouse;',
    '  float r2 = dot(d, d);',
    '  float fall = exp(-r2 / 0.11);',
    '  float w = u_drag * fall;',
    '  disp += normalize(u_vel + vec2(0.0001)) * w * 0.06;',
    '  disp += vec2(-d.y, d.x) / (sqrt(r2) + 0.001) * w * 0.12;',
    '',
    '  // ── 域扭曲 fbm：让色场像液体一样融合流动 ──',
    '  vec2 q = vec2(fbm(pp + disp), fbm(pp + disp + vec2(5.2, 1.3)));',
    '  vec2 r = vec2(fbm(pp + disp + 1.7 * q + vec2(1.7, 9.2)),',
    '                fbm(pp + disp + 1.7 * q + vec2(8.3, 2.8)));',
    '  float f = fbm(pp + disp + 1.6 * r);',
    '',
    '  // ── 单一浅色极淡配色：暖纸白基底 + 极淡青蓝晕染 ──',
    '  vec3 lBase  = vec3(0.980, 0.976, 0.965);',  // #FAF9F6
    '  vec3 lBlue  = vec3(0.915, 0.950, 0.958);',
    '  vec3 lBlue2 = vec3(0.935, 0.962, 0.968);',
    '  vec3 lSky   = vec3(0.922, 0.958, 0.968);',
    '  vec3 lMist  = vec3(0.958, 0.974, 0.966);',
    '  vec3 col = lBase;',
    '  col = mix(col, lBlue,  smoothstep(0.0, 0.85, f) * 0.12);',
    '  col = mix(col, lBlue2, smoothstep(0.30, 0.92, q.y) * 0.09);',
    '  col = mix(col, lSky,   smoothstep(0.45, 0.95, r.x) * 0.08);',
    '  col = mix(col, lMist,  smoothstep(0.60, 0.98, r.y) * 0.06);',
    '  col = mix(col, lBase, 0.68);',   // 再拉回纸白，静态几乎不可察觉
    '',
    '  // ── 被搅动的液体：极淡青蓝拖尾（DeepSeek 手感，强度克制） ──',
    '  float flowMag = length(flowV) * u_flowStr;',
    '  float glow = smoothstep(0.010, 0.085, flowMag);',
    '  vec3 glowCol = vec3(0.66, 0.83, 0.94);',
    '  col = mix(col, glowCol, glow * 0.62);',
    '  col = mix(col, glowCol, u_drag * fall * 0.52);',
    '  float core = smoothstep(0.045, 0.15, flowMag);',
    '  col = mix(col, vec3(0.90, 0.96, 0.985), core * 0.55);',
    '',
    '  // 暗角',
    '  vec2 vc = p - vec2(ar * 0.5, 0.5);',
    '  float maxR = sqrt(ar * ar * 0.25 + 0.25);',
    '  float vig = smoothstep(1.18, 0.55, length(vc) / maxR * 1.35);',
    '  // 浅色版不使用暗角：会让纸白边缘发灰',
    '',
    '  // 细微抖动，消除 8bit 色带',
    '  col += (hash(gl_FragCoord.xy) - 0.5) * 0.0015;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // ── 初始化 ───────────────────────────────────────────────────────────────
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
    var kv = Math.min(1, dtv * 5);
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
    // 带小死区：手指级轻微移动不响应，正常拖动即产生明显尾迹
    var target = hasMouse ? Math.min(1, Math.max(0, speed - 0.08) * 2.4) : 0;
    // 快速拉起、缓慢回落 → 粘稠手感
    var up = Math.min(1, dt * (target > mouse.drag ? 9 : 1.8));
    mouse.drag += (target - mouse.drag) * up;

    if (hasMouse && mouse.drag > 0.02) {
      var cx = (mouse.x / ar) * gridW;
      var cy = mouse.y * gridH;
      var radius = 2.5 + Math.min(3.5, speed * 5.5);
      var s = IMPULSE * dt * Math.min(1, Math.max(0, speed - 0.08) * 2.5) * (0.35 + 0.65 * mouse.drag);
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

    if (!reduced) {
      updateMouse(dt);
      updateFlow(dt);
    }

    gl.useProgram(prog);
    gl.uniform2f(uniforms.u_res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.u_time, tMs / 1000);
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
    // 鼠标静止且拖尾平息后降到 12fps，避免常驻满帧占 GPU
    if (tMs - lastMoveT > IDLE_MS && mouse.drag < 0.02) {
      if (tMs - lastIdleFrame < 1000 / IDLE_FPS) return;
      lastIdleFrame = tMs;
    }
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
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      } else if (!reduced && !rafId) {
        lastT = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 120);
    });
  }

  function init() {
    if (!window.WebGLRenderingContext) return;
    // 触屏设备没有「鼠标搅动」，不启用：省电且避免无意义动画
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lastMoveT = performance.now();

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

    resize();
    bindEvents();

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
