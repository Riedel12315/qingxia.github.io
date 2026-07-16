/**
 * Realistic shooting stars — glowing head + tapered tail, diagonal flight
 */
(function() {
    'use strict';

    var config = {
        intervalMin: 2500,
        intervalMax: 7000,
        durationMin: 900,
        durationMax: 1800,
        tailMin: 100,
        tailMax: 250,
        maxPerBurst: 4,
        minPerBurst: 2,
    };

    var container = null;

    function init() {
        container = document.createElement('div');
        container.id = 'shooting-stars-container';
        container.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'pointer-events:none;z-index:9997;overflow:hidden;';
        document.body.appendChild(container);
        scheduleNext();
    }

    function scheduleNext() {
        var delay = config.intervalMin + Math.random() * (config.intervalMax - config.intervalMin);
        setTimeout(function () {
            spawnBurst();
            scheduleNext();
        }, delay);
    }

    function spawnBurst() {
        var count = config.minPerBurst + Math.floor(Math.random() * (config.maxPerBurst - config.minPerBurst + 1));
        for (var i = 0; i < count; i++) {
            setTimeout(function () { createMeteor(); }, Math.random() * 500);
        }
    }

    function createMeteor() {
        var startX = Math.random() * window.innerWidth;
        var startY = Math.random() * window.innerHeight * 0.5;
        // Diagonal fall: angle between -20° and -55° from horizontal
        var angle = -(0.35 + Math.random() * 0.6);
        var tailLen = config.tailMin + Math.random() * (config.tailMax - config.tailMin);
        var duration = config.durationMin + Math.random() * (config.durationMax - config.durationMin);
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);

        // Adaptive colors: bright on dark bg, vivid on light bg
        var isLight = document.body.classList.contains('light-mode') ||
                      document.documentElement.classList.contains('light-mode');
        var colors = isLight ?
            ['#4A90D9', '#7B68EE', '#FF6B8A', '#5B9BD5', '#9370DB', '#FF85A2', '#6495ED', '#C71585'] :
            ['#ffffff', '#ffe8d0', '#e0f0ff', '#fff5e0', '#d0e8ff', '#fff0d0'];
        var color = colors[Math.floor(Math.random() * colors.length)];

        // ── Glowing head (small bright dot) ──
        var head = document.createElement('div');
        head.style.cssText =
            'position:absolute;' +
            'left:' + startX + 'px;' +
            'top:' + startY + 'px;' +
            'width:4px;height:4px;' +
            'margin-left:-2px;margin-top:-2px;' +
            'border-radius:50%;' +
            'background:' + color + ';' +
            'box-shadow: 0 0 6px 2px ' + color + ', 0 0 14px 4px rgba(255,255,255,0.5);' +
            'opacity:0;' +
            'animation: meteor-head ' + duration + 'ms ease-out forwards;';

        // ── Tapered tail (gradient line behind the head) ──
        var tail = document.createElement('div');
        tail.style.cssText =
            'position:absolute;' +
            'left:' + startX + 'px;' +
            'top:' + startY + 'px;' +
            'width:' + tailLen + 'px;' +
            'height:1.5px;' +
            'background: linear-gradient(90deg, ' +
                'transparent 0%, ' +
                'rgba(255,255,255,0.05) 20%, ' +
                'rgba(255,255,255,0.2) 50%, ' +
                color + ' 85%, ' +
                'rgba(255,255,255,0.95) 100%);' +
            'border-radius:1px;' +
            'transform-origin: right center;' +
            'opacity:0;' +
            'animation: meteor-tail ' + duration + 'ms ease-out forwards;' +
            'filter: blur(0.3px);';

        container.appendChild(tail);
        container.appendChild(head);

        // Store angle for animation
        head.style.setProperty('--angle', angle + 'rad');
        head.style.setProperty('--tail-len', tailLen + 'px');
        tail.style.setProperty('--angle', angle + 'rad');
        tail.style.setProperty('--tail-len', tailLen + 'px');

        // ── Animate both together ──
        var startTime = performance.now();

        function animateMeteor(ts) {
            var elapsed = ts - startTime;
            var progress = Math.min(elapsed / duration, 1);

            // Ease out
            var eased = 1 - Math.pow(1 - progress, 3);

            var dist = (tailLen + 300) * eased;
            var cx = startX + cosA * dist;
            var cy = startY + sinA * dist;

            // Fade curve: quick in, slow out
            var opacity;
            if (progress < 0.08) {
                opacity = progress / 0.08;
            } else if (progress < 0.7) {
                opacity = 1;
            } else {
                opacity = 1 - (progress - 0.7) / 0.3;
            }

            head.style.left = cx + 'px';
            head.style.top = cy + 'px';
            head.style.opacity = opacity;

            tail.style.left = (cx - cosA * tailLen) + 'px';
            tail.style.top = (cy - sinA * tailLen) + 'px';
            tail.style.opacity = opacity * 0.8;
            tail.style.transform = 'rotate(' + angle + 'rad)';

            if (progress < 1) {
                requestAnimationFrame(animateMeteor);
            } else {
                if (head.parentNode) head.parentNode.removeChild(head);
                if (tail.parentNode) tail.parentNode.removeChild(tail);
            }
        }

        requestAnimationFrame(animateMeteor);
    }

    // Inject keyframes for glow pulse
    if (!document.getElementById('meteor-style')) {
        var style = document.createElement('style');
        style.id = 'meteor-style';
        style.textContent =
            '@keyframes meteor-head {' +
                '0%{opacity:0;transform:scale(0.3)}' +
                '10%{opacity:1;transform:scale(1.3)}' +
                '30%{opacity:1;transform:scale(1)}' +
                '70%{opacity:0.8;transform:scale(0.9)}' +
                '100%{opacity:0;transform:scale(0.2)}' +
            '}' +
            '@keyframes meteor-tail {' +
                '0%{opacity:0}' +
                '12%{opacity:0.9}' +
                '65%{opacity:0.5}' +
                '100%{opacity:0}' +
            '}' +
            '@media print { #shooting-stars-container { display:none !important; } }';
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 300);
    }
})();
