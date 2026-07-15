/**
 * 鼠标跟随星星光效
 * - 鼠标不动时：星星散落在页面各处，缓慢漂移
 * - 鼠标移动时：星星从各处汇聚到鼠标周围，形成跟随光晕
 */

(function() {
    'use strict';

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // 创建星星容器
        const starsContainer = document.createElement('div');
        starsContainer.id = 'mouse-stars-container';
        starsContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        document.body.appendChild(starsContainer);

        // 星星配置
        const config = {
            count: 8,             // 星星数量
            size: { min: 2, max: 6 },
            color: '#3498db',
            colors: [
                '#3498db', // 蓝色
                '#9b59b6', // 紫色
                '#2ecc71', // 绿色
                '#e74c3c', // 红色
                '#f1c40f', // 黄色
                '#1abc9c'  // 青色
            ],
            orbitRadius: 45,       // 鼠标周围轨道半径
            scatterSpeed: 0.015,   // 散落时的漂移速度
            convergeSpeed: 0.25,   // 汇聚到鼠标的速度
            followSpeed: 0.12,     // 跟随鼠标时的轨道速度
            idleTimeout: 600,      // 多久不动算"静止"（毫秒）
            scatterInterval: 4000, // 静止时重新散落目标的间隔（毫秒）
            trailLength: 20,
            blur: 2,
            twinkle: true,
            twinkleSpeed: 0.05
        };

        // 星星数组
        const stars = [];
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let mouseIdle = true;          // 鼠标是否静止
        let idleTimer = null;          // 静止检测定时器
        let lastScatterTime = 0;       // 上次更新散落目标的时间
        let animationId = null;

        // 为每个星星生成一个散落目标位置
        function randomScatterTarget(star) {
            // 留一些边距，避免星星跑到屏幕边缘外
            const margin = 40;
            star.dataset.scatterX = margin + Math.random() * (window.innerWidth - margin * 2);
            star.dataset.scatterY = margin + Math.random() * (window.innerHeight - margin * 2);
        }

        // 创建星星
        function createStars() {
            for (let i = 0; i < config.count; i++) {
                const star = document.createElement('div');
                const size = Math.random() * (config.size.max - config.size.min) + config.size.min;
                const color = config.colors[Math.floor(Math.random() * config.colors.length)];

                star.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: ${color};
                    border-radius: 50%;
                    box-shadow: 0 0 ${config.blur}px ${config.blur}px ${color};
                    opacity: ${Math.random() * 0.7 + 0.3};
                    transform: translate(-50%, -50%);
                    will-change: transform, opacity, left, top;
                `;

                // 初始散落位置
                star.dataset.x = Math.random() * window.innerWidth;
                star.dataset.y = Math.random() * window.innerHeight;
                star.dataset.baseSpeed = (Math.random() * 0.3 + 0.2).toFixed(3);
                star.dataset.twinklePhase = Math.random() * Math.PI * 2;
                randomScatterTarget(star);

                starsContainer.appendChild(star);
                stars.push(star);
            }
        }

        // 动画循环
        function updateStars(timestamp) {
            const isIdle = mouseIdle;

            stars.forEach((star, index) => {
                let targetX, targetY, lerpSpeed;
                const baseSpeed = parseFloat(star.dataset.baseSpeed);

                if (isIdle) {
                    // ---- 散落模式：飘向页面各处的目标位置 ----
                    targetX = parseFloat(star.dataset.scatterX);
                    targetY = parseFloat(star.dataset.scatterY);
                    // 缓慢漂移，每颗星速度略有不同
                    lerpSpeed = config.scatterSpeed * (0.6 + baseSpeed);
                } else {
                    // ---- 跟随模式：汇聚到鼠标周围轨道 ----
                    const angle = (index / stars.length) * Math.PI * 2 + timestamp * 0.0001;
                    const radius = config.orbitRadius + Math.sin(timestamp * 0.001 + index) * 10;
                    targetX = mouseX + Math.cos(angle) * radius;
                    targetY = mouseY + Math.sin(angle) * radius;

                    // 根据距离动态调整速度：离鼠标越远，汇聚越快
                    const dx = targetX - parseFloat(star.dataset.x);
                    const dy = targetY - parseFloat(star.dataset.y);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 150) {
                        // 距离远 → 快速汇聚
                        lerpSpeed = config.convergeSpeed;
                    } else {
                        // 已经靠近 → 平滑跟随
                        lerpSpeed = config.followSpeed * (0.7 + baseSpeed);
                    }
                }

                // 平滑插值移动
                let currentX = parseFloat(star.dataset.x);
                let currentY = parseFloat(star.dataset.y);
                currentX += (targetX - currentX) * lerpSpeed;
                currentY += (targetY - currentY) * lerpSpeed;

                star.dataset.x = currentX;
                star.dataset.y = currentY;

                star.style.left = currentX + 'px';
                star.style.top = currentY + 'px';

                // 闪烁效果
                if (config.twinkle) {
                    const twinkle = Math.sin(timestamp * config.twinkleSpeed + parseFloat(star.dataset.twinklePhase)) * 0.3 + 0.7;
                    star.style.opacity = twinkle;
                    star.style.transform = `translate(-50%, -50%) scale(${0.8 + twinkle * 0.4})`;
                }

                // 颜色渐变
                const hueShift = Math.sin(timestamp * 0.001 + index) * 30;
                star.style.filter = `hue-rotate(${hueShift}deg) brightness(${1.2 + Math.sin(timestamp * 0.002) * 0.2})`;
            });

            // 静止时定期刷新散落目标，让星星持续缓慢漂移
            if (isIdle && timestamp - lastScatterTime > config.scatterInterval) {
                lastScatterTime = timestamp;
                // 只更新一部分星星的目标，避免同时跳动
                const count = Math.max(1, Math.floor(stars.length / 3));
                for (let i = 0; i < count; i++) {
                    const idx = Math.floor(Math.random() * stars.length);
                    randomScatterTarget(stars[idx]);
                }
            }

            animationId = requestAnimationFrame(updateStars);
        }

        // 鼠标移动事件
        function handleMouseMove(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // 从静止切换到移动
            if (mouseIdle) {
                mouseIdle = false;
            }

            // 重置静止检测定时器
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                mouseIdle = true;
                lastScatterTime = 0; // 立即允许更新散落目标
            }, config.idleTimeout);
        }

        // 鼠标离开窗口
        function handleMouseLeave() {
            mouseIdle = true;
            clearTimeout(idleTimer);
            lastScatterTime = 0;
        }

        // 鼠标进入窗口
        function handleMouseEnter(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }

        // 窗口大小变化
        function handleResize() {
            // 更新所有星星的散落目标，适配新窗口大小
            stars.forEach(star => {
                randomScatterTarget(star);
            });
        }

        // 初始化
        createStars();
        lastScatterTime = performance.now();
        animationId = requestAnimationFrame(updateStars);

        // 事件监听
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);
        window.addEventListener('resize', handleResize);

        // 清理函数
        window.cleanupMouseStars = function() {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            clearTimeout(idleTimer);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
            window.removeEventListener('resize', handleResize);

            if (starsContainer.parentNode) {
                starsContainer.parentNode.removeChild(starsContainer);
            }
        };

        // 添加 CSS
        const style = document.createElement('style');
        style.textContent = `
            /* 打印时隐藏 */
            @media print {
                #mouse-stars-container {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        console.log('✨ 鼠标星星光效已启用！（静止散落 → 移动汇聚）');
    }
})();
