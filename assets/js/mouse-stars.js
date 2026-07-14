/**
 * 鼠标跟随星星光效
 * 添加到现有网站，不改变原有结构和样式
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
            count: 8,           // 星星数量
            size: { min: 2, max: 6 }, // 星星大小范围（像素）
            color: '#3498db',    // 主色调（蓝色，与你的网站主题匹配）
            colors: [            // 可选颜色数组（随机选择）
                '#3498db', // 蓝色
                '#9b59b6', // 紫色
                '#2ecc71', // 绿色
                '#e74c3c', // 红色
                '#f1c40f', // 黄色
                '#1abc9c'  // 青色
            ],
            speed: 0.5,          // 移动速度（0-1）
            trailLength: 20,     // 轨迹长度
            blur: 2,             // 模糊效果
            twinkle: true,       // 闪烁效果
            twinkleSpeed: 0.05   // 闪烁速度
        };
        
        // 星星数组
        const stars = [];
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let animationId = null;
        
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
                    transition: opacity 0.3s ease;
                    will-change: transform, opacity;
                `;
                
                // 初始位置随机
                star.dataset.x = Math.random() * window.innerWidth;
                star.dataset.y = Math.random() * window.innerHeight;
                star.dataset.targetX = star.dataset.x;
                star.dataset.targetY = star.dataset.y;
                star.dataset.speed = Math.random() * 0.3 + 0.2;
                star.dataset.twinklePhase = Math.random() * Math.PI * 2;
                
                starsContainer.appendChild(star);
                stars.push(star);
            }
        }
        
        // 更新星星位置
        function updateStars() {
            const centerX = mouseX;
            const centerY = mouseY;
            
            stars.forEach((star, index) => {
                // 计算目标位置（围绕鼠标的圆形分布）
                const angle = (index / stars.length) * Math.PI * 2 + Date.now() * 0.0001;
                const radius = 42 + Math.sin(Date.now() * 0.001 + index) * 10;
                
                const targetX = centerX + Math.cos(angle) * radius;
                const targetY = centerY + Math.sin(angle) * radius;
                
                // 平滑移动到目标位置
                let currentX = parseFloat(star.dataset.x);
                let currentY = parseFloat(star.dataset.y);
                
                const speed = parseFloat(star.dataset.speed) * config.speed;
                currentX += (targetX - currentX) * speed;
                currentY += (targetY - currentY) * speed;
                
                star.dataset.x = currentX;
                star.dataset.y = currentY;
                
                // 应用位置
                star.style.left = currentX + 'px';
                star.style.top = currentY + 'px';
                
                // 闪烁效果
                if (config.twinkle) {
                    const twinkle = Math.sin(Date.now() * config.twinkleSpeed + star.dataset.twinklePhase) * 0.3 + 0.7;
                    star.style.opacity = twinkle;
                    star.style.transform = `translate(-50%, -50%) scale(${0.8 + twinkle * 0.4})`;
                }
                
                // 颜色渐变效果
                const hueShift = Math.sin(Date.now() * 0.001 + index) * 30;
                star.style.filter = `hue-rotate(${hueShift}deg) brightness(${1.2 + Math.sin(Date.now() * 0.002) * 0.2})`;
            });
            
            animationId = requestAnimationFrame(updateStars);
        }
        
        // 鼠标移动事件
        function handleMouseMove(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }
        
        // 鼠标离开窗口时隐藏星星
        function handleMouseLeave() {
            stars.forEach(star => {
                star.style.opacity = '0.1';
            });
        }
        
        // 鼠标进入窗口时显示星星
        function handleMouseEnter() {
            stars.forEach(star => {
                star.style.opacity = '0.8';
            });
        }
        
        // 窗口大小变化时重新定位
        function handleResize() {
            stars.forEach(star => {
                const x = parseFloat(star.dataset.x);
                const y = parseFloat(star.dataset.y);
                
                // 保持相对位置
                star.dataset.x = (x / window.innerWidth) * window.innerWidth;
                star.dataset.y = (y / window.innerHeight) * window.innerHeight;
            });
        }
        
        // 初始化
        createStars();
        updateStars();
        
        // 添加事件监听
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);
        window.addEventListener('resize', handleResize);
        
        // 清理函数
        window.cleanupMouseStars = function() {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
            window.removeEventListener('resize', handleResize);
            
            if (starsContainer.parentNode) {
                starsContainer.parentNode.removeChild(starsContainer);
            }
        };
        
        // 添加CSS样式
        const style = document.createElement('style');
        style.textContent = `
            /* 平滑过渡效果 */
            #mouse-stars-container div {
                transition: left 0.1s linear, top 0.1s linear, opacity 0.3s ease, transform 0.3s ease;
            }
            
            /* 减少低性能设备上的效果 */
            @media (prefers-reduced-motion: reduce) {
                #mouse-stars-container div {
                    transition: none;
                }
            }
            
            /* 打印时隐藏 */
            @media print {
                #mouse-stars-container {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        console.log('✨ 鼠标星星光效已启用！使用 window.cleanupMouseStars() 可以禁用此效果。');
    }
})();