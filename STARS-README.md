# 鼠标星星光效使用说明

## 效果说明
这个功能为你的学术网站添加了鼠标跟随的星星光效，当用户移动鼠标时，会有彩色星星跟随光标移动。

## 文件说明
- `assets/js/mouse-stars.js` - 完整效果版本（包含闪烁、颜色变化等）
- `assets/js/mouse-stars-light.js` - 轻量级版本（性能更好，推荐使用）
- `test-stars.html` - 效果测试页面
- `_includes/head/custom.html` - 已添加脚本引用（使用轻量版）

## 如何测试效果
1. 打开 `test-stars.html` 文件
2. 移动鼠标查看效果
3. 点击按钮切换不同版本
4. 选择你喜欢的效果

## 应用到网站
效果已经自动应用到你的网站。当你访问网站时，鼠标星星效果会自动启用。

## 如何禁用效果
如果你想要禁用这个效果，有以下几种方法：

### 方法1：临时禁用（在浏览器控制台）
```javascript
// 如果使用的是完整版
if (window.cleanupMouseStars) {
    window.cleanupMouseStars();
}

// 如果使用的是轻量版
if (window.cleanupMouseStarsLight) {
    window.cleanupMouseStarsLight();
}
```

### 方法2：永久禁用（修改代码）
编辑 `_includes/head/custom.html` 文件，注释或删除以下行：
```html
<!-- 鼠标跟随星星光效 -->
<script src="{{ base_path }}/assets/js/mouse-stars.js" defer></script>
<style>
    /* 确保星星效果不影响内容交互 */
    #mouse-stars-container {
        pointer-events: none !important;
    }
</style>
```

### 方法3：切换不同版本
编辑 `_includes/head/custom.html`，修改脚本引用：
```html
<!-- 使用完整版 -->
<script src="{{ base_path }}/assets/js/mouse-stars.js" defer></script>

<!-- 或使用轻量版（当前使用） -->
<script src="{{ base_path }}/assets/js/mouse-stars-light.js" defer></script>
```

## 效果特点
1. **不干扰内容**：星星层在内容下方，不会影响点击和交互
2. **性能优化**：使用 requestAnimationFrame 实现平滑动画
3. **响应式设计**：适应不同屏幕尺寸
4. **可访问性**：对 prefers-reduced-motion 用户友好
5. **打印友好**：打印页面时自动隐藏

## 自定义配置
如果你想调整效果，可以编辑对应的 JavaScript 文件中的 `config` 对象：

### 完整版配置（mouse-stars.js）
```javascript
const config = {
    count: 15,           // 星星数量
    size: { min: 2, max: 6 }, // 星星大小
    color: '#3498db',    // 主色调
    speed: 0.5,          // 移动速度
    trailLength: 20,     // 轨迹长度
    twinkle: true,       // 是否闪烁
    twinkleSpeed: 0.05   // 闪烁速度
};
```

### 轻量版配置（mouse-stars-light.js）
```javascript
const config = {
    starCount: 12,       // 星星数量
    starColors: ['#3498db', '#9b59b6', '#2ecc71'], // 颜色数组
    maxStarSize: 5,      // 最大尺寸
    minStarSize: 2,      // 最小尺寸
    moveSpeed: 0.1,      // 移动速度
    trail: 0.9           // 轨迹效果
};
```

## 浏览器兼容性
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项
1. 效果在移动设备上会自动简化（触摸设备无鼠标）
2. 低性能设备上效果会自动降级
3. 不影响网站的核心功能和SEO
4. 代码已压缩，加载速度快

## 更新日志
- 2024-03-31: 初始版本发布
  - 完整效果版本
  - 轻量效果版本
  - 测试页面
  - 说明文档

---

**提示**：推荐使用轻量版（mouse-stars-light.js），它在保持良好视觉效果的同时有更好的性能表现。