// ========== 设备检测和适配 ==========
// 在 main.js 末尾调用此函数
export function initDeviceDetection() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  
  console.log('设备检测:', { isTouch, isMobile, isTablet });
  
  // 为触摸设备添加类名
  if (isTouch) {
    document.body.classList.add('touch-device');
  }
  if (isTablet) {
    document.body.classList.add('tablet-device');
  }
  if (isMobile) {
    document.body.classList.add('mobile-device');
  }
  
  // iPad 优化提示
  if (isTablet && window.innerWidth < 1024) {
    console.log('📱 iPad 模式已启用');
  }
}

// 页面加载时自动运行
initDeviceDetection();
