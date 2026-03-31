/**
 * 轻量级鼠标跟随星星光效
 * 更简单的实现，性能更好
 */

(function() {
    'use strict';
    
    // 配置
    const config = {
        starCount: 12,
        starColors: ['#3498db', '#9b59b6', '#2ecc71', '#e74c3c', '#f1c40f'],
        maxStarSize: 5,
        minStarSize: 2,
        moveSpeed: 0.1,
        trail: 0.9
    };
    
    // 变量
    let stars = [];
    let mouseX = 0;
    let mouseY = 0;
    let animationId = null;
    let container = null;
    
    // 初始化
    function init() {
        // 创建容器
        container = document.createElement('div');
        container.id = 'mouse-stars-light';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            overflow: hidden;
        `;
        document.body.appendChild(container);
        
        // 创建星星
        for (let i = 0; i < config.starCount; i++) {
            createStar(i);
        }
        
        // 事件监听
        document.addEventListener('mousemove', handleMouseMove);
        
        // 开始动画
        animate();
        
        console.log('✨ 轻量级鼠标星星光效已启用');
    }
    
    // 创建单个星星
    function createStar(index) {
        const star = document.createElement('div');
        const size = Math.random() * (config.maxStarSize - config.minStarSize) + config.minStarSize;
        const color = config.starColors[Math.floor(Math.random() * config.starColors.length)];
        
        star.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            box-shadow: 0 0 ${size}px ${color};
            opacity: 0.7;
            transform: translate(-50%, -50%);
            transition: opacity 0.3s;
        `;
        
        // 初始位置
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        
        star.dataset.x = x;
        star.dataset.y = y;
        star.dataset.vx = 0;
        star.dataset.vy = 0;
        star.dataset.index = index;
        
        container.appendChild(star);
        stars.push(star);
        
        // 初始位置
        star.style.left = x + 'px';
        star.style.top = y + 'px';
    }
    
    // 鼠标移动处理
    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
    
    // 动画循环
    function animate() {
        // 更新每个星星
        stars.forEach((star, index) => {
            const x = parseFloat(star.dataset.x);
            const y = parseFloat(star.dataset.y);
            let vx = parseFloat(star.dataset.vx);
            let vy = parseFloat(star.dataset.vy);
            
            // 计算目标位置（围绕鼠标的圆形）
            const angle = (index / stars.length) * Math.PI * 2 + Date.now() * 0.0005;
            const radius = 80 + Math.sin(Date.now() * 0.001 + index) * 20;
            
            const targetX = mouseX + Math.cos(angle) * radius;
            const targetY = mouseY + Math.sin(angle) * radius;
            
            // 应用物理效果
            vx += (targetX - x) * config.moveSpeed;
            vy += (targetY - y) * config.moveSpeed;
            
            vx *= config.trail;
            vy *= config.trail;
            
            const newX = x + vx;
            const newY = y + vy;
            
            // 更新位置
            star.dataset.x = newX;
            star.dataset.y = newY;
            star.dataset.vx = vx;
            star.dataset.vy = vy;
            
            star.style.left = newX + 'px';
            star.style.top = newY + 'px';
            
            // 闪烁效果
            const twinkle = Math.sin(Date.now() * 0.003 + index) * 0.3 + 0.7;
            star.style.opacity = twinkle * 0.7;
            
            // 轻微缩放
            star.style.transform = `translate(-50%, -50%) scale(${0.8 + twinkle * 0.4})`;
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    // 清理函数
    function cleanup() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        document.removeEventListener('mousemove', handleMouseMove);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
    
    // 导出清理函数
    window.cleanupMouseStarsLight = cleanup;
    
    // 延迟初始化，确保页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
})();