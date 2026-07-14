/**
 * 流星划过效果
 * 独立于鼠标位置，随机在页面上划过
 */
(function() {
    'use strict';

    const config = {
        interval: { min: 2000, max: 6000 },  // 流星出现间隔 (ms)
        duration: { min: 1200, max: 2200 },   // 流星飞行时长 (ms)
        size: { min: 80, max: 180 },          // 流星拖尾长度 (px)
        width: { min: 1.5, max: 3 },          // 流星线条粗细 (px)
        maxPerBurst: 3,                        // 每次最多同时出现几颗
    };

    let container = null;

    function init() {
        container = document.createElement('div');
        container.id = 'shooting-stars-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9997;
            overflow: hidden;
        `;
        document.body.appendChild(container);

        scheduleNext();
        console.log('🌠 流星效果已启用');
    }

    function scheduleNext() {
        const delay = config.interval.min + Math.random() * (config.interval.max - config.interval.min);
        setTimeout(() => {
            spawnBurst();
            scheduleNext();
        }, delay);
    }

    function spawnBurst() {
        const count = 1 + Math.floor(Math.random() * config.maxPerBurst);
        for (let i = 0; i < count; i++) {
            setTimeout(() => createShootingStar(), Math.random() * 400);
        }
    }

    function createShootingStar() {
        const star = document.createElement('div');

        // 随机起点和方向
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight * 0.6;
        const angle = (Math.random() - 0.5) * 0.6 - 0.3; // 偏向下落
        const length = config.size.min + Math.random() * (config.size.max - config.size.min);
        const endX = startX + Math.cos(angle) * length * 2;
        const endY = startY + Math.sin(angle) * length * 2;
        const lineWidth = config.width.min + Math.random() * (config.width.max - config.width.min);
        const duration = config.duration.min + Math.random() * (config.duration.max - config.duration.min);

        // 颜色：白/浅蓝/浅金
        const colors = ['#ffffff', '#a0d8ef', '#ffefd5', '#e0f0ff', '#ffe4b5'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        star.style.cssText = `
            position: absolute;
            left: ${startX}px;
            top: ${startY}px;
            width: ${length}px;
            height: ${lineWidth}px;
            --angle: ${angle}rad;
            background: linear-gradient(90deg,
                transparent 0%,
                rgba(255,255,255,0.1) 30%,
                ${color} 70%,
                rgba(255,255,255,0.9) 100%
            );
            border-radius: ${lineWidth}px;
            transform-origin: left center;
            opacity: 0;
            animation: shooting-star-fly ${duration}ms ease-out forwards;
            filter: blur(0.5px);
            box-shadow: 0 0 ${lineWidth * 2}px ${lineWidth}px ${color};
        `;

        container.appendChild(star);

        // 动画结束后清理
        setTimeout(() => {
            if (star.parentNode) star.parentNode.removeChild(star);
        }, duration + 100);
    }

    // 注入 keyframes
    if (!document.getElementById('shooting-stars-style')) {
        const style = document.createElement('style');
        style.id = 'shooting-stars-style';
        style.textContent = `
            @keyframes shooting-star-fly {
                0% {
                    opacity: 0;
                    transform: rotate(var(--angle, 0.3rad)) scaleX(0.3);
                    transform-origin: left center;
                }
                15% {
                    opacity: 0.9;
                }
                70% {
                    opacity: 0.6;
                }
                100% {
                    opacity: 0;
                    transform: rotate(var(--angle, 0.3rad)) scaleX(1);
                    transform-origin: left center;
                }
            }
            @media print {
                #shooting-stars-container {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 延迟初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 200);
    }
})();
