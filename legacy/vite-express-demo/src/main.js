import './style.css'
import './responsive.css'
import './immersive.css'
import './about.css'
import './cursor.css'
import './upload.css'
import './ai-generator.css'
import { AuthService, GalleryService } from './userManager.js'
import ExhibitionService from './services/exhibitionService.js'
import { initCursor } from './utils/cursor.js'
import { Modal } from './utils/modal.js'
import { validateUserId, validatePassword, getValidationMessage } from './utils/validation.js'
import { initDeviceDetection } from './device-detect.js'

// Curated Art Data
const defaultCollection = [];

// Initialize dynamic collection
// collection starts empty or default, then updates
let collection = defaultCollection;
let filteredCollection = []; // 用于存储筛选后的结果
let currentSearchTerm = '';

// 预设展览数据
const defaultExhibitions = [];

// 全局展览状态
let exhibitions = [...defaultExhibitions];
let currentExhibition = null;

// 当前选择的作品 ID 列表（用于展览编辑）
let selectedArtworkIds = [];

// 创建展览按钮全局引用
let createExhibitionButton = null;

// 刷新画廊数据
async function refreshGallery() {
  try {
    collection = await GalleryService.getCombinedCollection(defaultCollection);
    applyFilters();
  } catch (e) {
    console.warn("Failed to refresh gallery", e);
  }
}

// 暴露到全局，供 AI 生成器调用
window.refreshGallery = refreshGallery;

// 我的作品页面功能
let currentMyWorksTab = 'all';

async function initMyWorks() {
  const tabs = document.querySelectorAll('.my-works-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMyWorksTab = tab.dataset.tab;
      renderMyWorks();
    });
  });

  // 切换到我的作品视图时刷新数据
  const myWorksNavItem = document.querySelector('.nav-item[data-view="my-works"]');
  if (myWorksNavItem) {
    myWorksNavItem.addEventListener('click', () => {
      setTimeout(() => {
        renderMyWorks();
      }, 200);
    });
  }
}

async function renderMyWorks() {
  const grid = document.getElementById('my-works-grid');
  if (!grid) return;

  const user = AuthService.getCurrentUser();
  if (!user) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">请先登录后查看您的作品</p>';
    return;
  }

  try {
    const response = await fetch('/api/gallery');
    const result = await response.json();
    const allArtworks = result.success ? result.data : result;

    // 筛选用户作品
        let userArtworks = allArtworks.filter(artwork => artwork.artistId === user.id);

    // 按标签筛选
    if (currentMyWorksTab === 'ai-generated') {
      userArtworks = userArtworks.filter(artwork => artwork.isAIGenerated === true);
    } else if (currentMyWorksTab === 'uploaded') {
      userArtworks = userArtworks.filter(artwork => artwork.isAIGenerated !== true);
    } else if (currentMyWorksTab === 'gallery') {
      userArtworks = userArtworks.filter(artwork => artwork.inShowcase !== false);
    } else if (currentMyWorksTab === 'hidden') {
      userArtworks = userArtworks.filter(artwork => artwork.inShowcase === false);
    }

    if (userArtworks.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">暂无作品</p>';
      return;
    }

    grid.innerHTML = userArtworks.map(item => `
      <div class="my-work-item" data-id="${item.id}">
        <div class="image-container-relative">
          <img src="${item.image}" alt="${item.title}" class="my-work-image">
          <button class="remove-work-btn" title="删除作品">🗑️</button>
        </div>
        <div class="my-work-info">
          <h4 class="my-work-title">${item.title}</h4>
          <span class="my-work-type">${item.isAIGenerated ? 'AI 生成' : '手动上传'}</span>
          <p class="my-work-prompt">${item.prompt || ''}</p>
          <div class="my-work-actions">
            <button class="edit-work-btn" data-id="${item.id}">编辑</button>
            <button class="toggle-showcase-btn" data-id="${item.id}" data-show="${item.inShowcase !== false ? '1' : '0'}">${item.inShowcase !== false ? '隐藏' : '展示'}</button>
          </div>
        </div>
      </div>
    `).join('');

    // 绑定事件
    grid.querySelectorAll('.my-work-item').forEach(workItem => {
      const artworkId = workItem.dataset.id;

      // 删除按钮
      const removeBtn = workItem.querySelector('.remove-work-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleDeleteArtwork(artworkId);
        });
      }

      // 编辑按钮
      const editBtn = workItem.querySelector('.edit-work-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          openEditWorkModal(artworkId);
        });
      }

      // 切换展示状态按钮
      const toggleBtn = workItem.querySelector('.toggle-showcase-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          toggleShowcase(artworkId, toggleBtn.dataset.show === '1');
        });
      }
    });

  } catch (error) {
    console.error('加载我的作品失败:', error);
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">加载失败</p>';
  }
}

async function openEditWorkModal(artworkId) {
  const artwork = collection.find(a => a.id === artworkId);
  if (!artwork) return;

  document.getElementById('edit-work-title').value = artwork.title || '';
  document.getElementById('edit-work-prompt').value = artwork.prompt || '';
  document.getElementById('edit-work-desc').value = artwork.desc || '';

  const modal = document.getElementById('edit-work-modal');
  modal.classList.add('active');

  // 保存按钮
  const saveBtn = modal.querySelector('.save-edit-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      await saveEditWork(artworkId);
    };
  }

  // 取消按钮
  const cancelBtn = modal.querySelector('.cancel-edit-btn');
  if (cancelBtn) {
    cancelBtn.onclick = () => modal.classList.remove('active');
  }

  // 关闭按钮
  const closeBtn = modal.querySelector('.close-modal-btn');
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.remove('active');
  }
}

async function saveEditWork(artworkId) {
  const user = AuthService.getCurrentUser();
  if (!user) { alert('请先登录'); return; }

  const newTitle = document.getElementById('edit-work-title').value.trim();
  const newPrompt = document.getElementById('edit-work-prompt').value.trim();
  const newDesc = document.getElementById('edit-work-desc').value.trim();

  if (!newTitle) {
    alert('请输入作品标题');
    return;
  }

  try {
    await GalleryService.updateArtwork(artworkId, {
      title: newTitle,
      prompt: newPrompt,
      desc: newDesc
    });

    // 更新本地数据
    const artwork = collection.find(a => a.id === artworkId);
    if (artwork) {
      artwork.title = newTitle;
      artwork.prompt = newPrompt;
      artwork.desc = newDesc;
    }

    document.getElementById('edit-work-modal').classList.remove('active');
    renderMyWorks();
    alert('作品已更新');
  } catch (error) {
    alert('更新失败：' + error.message);
  }
}

async function toggleShowcase(artworkId, isCurrentlyInShowcase) {
  const user = AuthService.getCurrentUser();
  if (!user) { alert('请先登录'); return; }

  try {
    await GalleryService.updateArtwork(artworkId, {
      inShowcase: !isCurrentlyInShowcase
    });

    // 刷新画廊数据，确保从API获取最新状态
    await refreshGallery();
    
    // 重新渲染我的作品页面
    renderMyWorks();
    
    // 找到对应的按钮并改变样式
    const toggleBtn = document.querySelector(`.toggle-showcase-btn[data-id="${artworkId}"]`);
    if (toggleBtn) {
      // 更新按钮文本
      toggleBtn.textContent = !isCurrentlyInShowcase ? '隐藏' : '展示';
      // 更新按钮数据属性
      toggleBtn.dataset.show = !isCurrentlyInShowcase ? '1' : '0';
      // 添加临时的成功样式
      toggleBtn.style.backgroundColor = '#4CAF50';
      toggleBtn.style.color = 'white';
      // 2秒后恢复原始样式
      setTimeout(() => {
        toggleBtn.style.backgroundColor = '';
        toggleBtn.style.color = '';
      }, 2000);
    }
  } catch (error) {
    alert('操作失败：' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 检查用户登录状态
  const currentUser = AuthService.getCurrentUser();

  // 如果未登录，显示登录模态框
  if (!currentUser) {
    // 延迟一点以确保 DOM 完全加载
    setTimeout(() => {
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('active');
        // 切换到登录标签页
        const loginTab = document.querySelector('[data-tab="login"]');
        if (loginTab) {
          loginTab.click();
        }
      }
    }, 100);
  }

  // Async load user content
  try {
    collection = await GalleryService.getCombinedCollection(defaultCollection);
    filteredCollection = collection;
  } catch (e) {
    console.warn("Failed to load local gallery", e);
  }

  renderGallery();
  initObserve();
  initModal();
  initNavbar();
  initImmersiveMode();
  initParallax();
  initCursor();
  initAuth();
  initUpload();
  initProfile();
  initSearch();
  initExhibitions();
  initExhibitionManagement();
  initMyWorks();
  updateNavbar();
});

// 沉浸模式逻辑
let currentIndex = 0;
let isPlaying = false;
let autoPlayTimer = null;
let intervalSeconds = 5;

function initImmersiveMode() {
  const startBtn = document.getElementById('start-immersive');
  const viewer = document.getElementById('immersive-viewer');
  if (!viewer) return;

  const closeBtn = document.getElementById('immersive-close-btn') || viewer.querySelector('.immersive-close');
  const settingsBtn = document.getElementById('immersive-settings-btn');
  const prevBtn = document.getElementById('prev-art');
  const nextBtn = document.getElementById('next-art');

  // 新增控制
  const playBtn = document.getElementById('toggle-autoplay-btn') || document.getElementById('toggle-play');
  const intervalInput = document.getElementById('autoplay-interval-select') || document.getElementById('autoplay-interval');

  if (!startBtn) return;

  startBtn.addEventListener('click', () => {
    openImmersive(0);
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeImmersive);
  }

  // 设置按钮事件绑定
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const settingsModal = document.getElementById('immersive-settings-modal');
      const settingsOverlay = document.getElementById('settings-overlay');
      if (settingsModal && settingsOverlay) {
        settingsModal.classList.add('active');
        settingsOverlay.classList.add('active');
      }
    });
  }

  // 设置模态框关闭按钮
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      const settingsModal = document.getElementById('immersive-settings-modal');
      const settingsOverlay = document.getElementById('settings-overlay');
      if (settingsModal && settingsOverlay) {
        settingsModal.classList.remove('active');
        settingsOverlay.classList.remove('active');
      }
    });
  }

  // 设置遮罩层点击关闭
  const settingsOverlay = document.getElementById('settings-overlay');
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', () => {
      const settingsModal = document.getElementById('immersive-settings-modal');
      if (settingsModal) {
        settingsModal.classList.remove('active');
        settingsOverlay.classList.remove('active');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      stopAutoPlay();
      navigateImmersive(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopAutoPlay();
      navigateImmersive(1);
    });
  }

  // 播放/暂停 切换
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (isPlaying) stopAutoPlay();
      else startAutoPlay();
    });
  }

  // 时间间隔输入
  if (intervalInput) {
    intervalInput.addEventListener('change', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 2) val = 2; // 最小 2秒
      if (val > 60) val = 60;
      intervalSeconds = val;
      e.target.value = val;

      // 如果正在播放，重启计时器以应用新间隔
      if (isPlaying) {
        stopAutoPlay();
        startAutoPlay();
      }
    });
    // 防止交互时隐藏
    intervalInput.addEventListener('focus', () => {
      if (idleTimer) clearTimeout(idleTimer);
    });
  }

  // 键盘导航
  document.addEventListener('keydown', (e) => {
    if (!viewer.classList.contains('active')) return;

    resetIdleTimer();

    if (e.key === 'Escape') closeImmersive();
    if (e.key === 'ArrowLeft') { stopAutoPlay(); navigateImmersive(-1); }
    if (e.key === 'ArrowRight') { stopAutoPlay(); navigateImmersive(1); }
    if (e.key === ' ') { // 空格键切换
      e.preventDefault();
      if (isPlaying) stopAutoPlay();
      else startAutoPlay();
    }
  });

  // 空闲检测
  viewer.addEventListener('mousemove', resetIdleTimer);
  viewer.addEventListener('click', resetIdleTimer);

  // 点击图片翻页功能
  const immersiveImg = document.getElementById('immersive-img');
  if (immersiveImg) {
    immersiveImg.addEventListener('click', () => {
      stopAutoPlay();
      navigateImmersive(1);
    });
  }
}

// 空闲逻辑
let idleTimer = null;
function resetIdleTimer() {
  const viewer = document.getElementById('immersive-viewer');
  if (!viewer.classList.contains('active')) return;

  viewer.classList.remove('hide-ui');

  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT') return;
    viewer.classList.add('hide-ui');
  }, 3000); // 3秒超时
}

function startAutoPlay() {
  if (isPlaying) return;
  const playBtn = document.getElementById('toggle-autoplay-btn') || document.getElementById('toggle-play');
  isPlaying = true;
  if (playBtn) {
    playBtn.textContent = '⏸ 暂停';
    playBtn.classList.add('playing');
  }

  autoPlayTimer = setInterval(() => {
    navigateImmersive(1);
  }, intervalSeconds * 1000);
}

function stopAutoPlay() {
  if (!isPlaying) return;
  const playBtn = document.getElementById('toggle-autoplay-btn') || document.getElementById('toggle-play');
  isPlaying = false;
  if (playBtn) {
    playBtn.textContent = '▶ 播放';
    playBtn.classList.remove('playing');
  }

  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

function openImmersive(index) {
  const viewer = document.getElementById('immersive-viewer');
  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
  currentIndex = index;
  updateImmersiveContent();

  // 重置播放状态
  stopAutoPlay();
  resetIdleTimer();
}

function closeImmersive() {
  const viewer = document.getElementById('immersive-viewer');
  viewer.classList.remove('active');
  document.body.style.overflow = '';
  stopAutoPlay();
  // 清除展览模式状态
  window.currentExhibitionArtworks = null;
  window.currentExhibitionIndex = 0;
}

function navigateImmersive(direction) {
  // 检查是否是展览模式
  const isExhibitionMode = window.currentExhibitionArtworks && window.currentExhibitionArtworks.length > 0;

  if (isExhibitionMode) {
    window.currentExhibitionIndex += direction;
    const displayCollection = window.currentExhibitionArtworks;
    if (window.currentExhibitionIndex < 0) window.currentExhibitionIndex = displayCollection.length - 1;
    if (window.currentExhibitionIndex >= displayCollection.length) window.currentExhibitionIndex = 0;
  } else {
    currentIndex += direction;
    const displayCollection = filteredCollection.length > 0 ? filteredCollection : collection;
    if (currentIndex < 0) currentIndex = displayCollection.length - 1;
    if (currentIndex >= displayCollection.length) currentIndex = 0;
  }

  updateImmersiveContent();
}

function updateImmersiveContent() {
  // 检查是否是展览模式
  const isExhibitionMode = window.currentExhibitionArtworks && window.currentExhibitionArtworks.length > 0;

  // 使用筛选后的集合或展览作品
  const displayCollection = isExhibitionMode
    ? window.currentExhibitionArtworks
    : (filteredCollection.length > 0 ? filteredCollection : collection);

  const index = isExhibitionMode ? window.currentExhibitionIndex : currentIndex;
  const item = displayCollection[index];
  const img = document.getElementById('immersive-img');
  const title = document.getElementById('immersive-title');
  const artist = document.getElementById('immersive-artist');
  const prompt = document.getElementById('immersive-prompt');
  const counterCurrent = document.getElementById('current-index');
  const counterTotal = document.getElementById('total-count');

  // 简单过渡
  img.style.opacity = 0;
  title.style.opacity = 0;
  artist.style.opacity = 0;
  prompt.style.opacity = 0;

  setTimeout(() => {
    img.src = item.image;
    title.textContent = item.title || 'Untitled';
    artist.textContent = item.artist || 'Unknown Artist';
    prompt.textContent = item.desc || '';
    counterCurrent.textContent = index + 1;
    counterTotal.textContent = displayCollection.length;

    const fadeIn = () => {
      img.style.opacity = 1;
      title.style.opacity = 1;
      artist.style.opacity = 1;
      prompt.style.opacity = 1;
    };

    if (img.complete) {
      fadeIn();
    } else {
      img.onload = fadeIn;
    }
  }, 200);
}

// 画廊函数
function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const currentUser = AuthService.getCurrentUser();
  const isAdmin = currentUser?.id === 'admin';

  // 使用筛选后的集合
  const displayCollection = filteredCollection;

  if (displayCollection.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">没有找到匹配的作品</p>';
    return;
  }

  grid.innerHTML = displayCollection.map((item, index) => {
    // 检查是否是当前用户的作品或管理员
        const isOwner = currentUser && item.artistId === currentUser.id;
        const canDelete = isAdmin || isOwner;
    const deleteBtn = canDelete ? `<button class="delete-btn" data-id="${item.id}" title="删除作品">🗑️</button>` : '';

    return `
    <article class="art-piece" style="transition-delay: ${index * 100}ms">
      <div class="image-container">
        <img src="${item.image}" alt="${item.title}" class="art-image" loading="lazy">
        ${deleteBtn}
      </div>
      <div class="art-info">
        <h3 class="art-title">${item.title}</h3>
        <span class="art-artist">${item.artist}</span>
      </div>
    </article>
  `;
  }).join('');

  // 渲染后附加其事件监听器
  const items = grid.querySelectorAll('.art-piece');
  items.forEach((item, index) => {
    // 点击图片容器打开模态框
    const imgContainer = item.querySelector('.image-container');
    const img = imgContainer.querySelector('.art-image');
    img.addEventListener('click', () => openModal(displayCollection[index]));

    // 删除按钮事件
    const deleteBtn = item.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const artworkId = deleteBtn.dataset.id;
        await handleDeleteArtwork(artworkId);
      });
    }
  });
}

// Intersection Observer 淡入动画
function initObserve() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // 仅动画一次
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  const pieces = document.querySelectorAll('.art-piece');
  pieces.forEach(p => observer.observe(p));
}

function initModal() {
  // 常规模态框逻辑
  const modal = document.getElementById('modal');
  const closeBtn = document.querySelector('.close-modal');

  if (!modal) return;

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    document.body.style.overflow = ''; // 恢复滚动
  });

  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-inner')) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

function openModal(item) {
  const modal = document.getElementById('modal');
  const img = document.getElementById('modal-image');
  const title = document.getElementById('modal-title');
  const artist = document.getElementById('modal-artist');
  const desc = document.getElementById('modal-desc');
  const prompt = document.getElementById('modal-prompt');

  if (!modal) return;

  img.src = item.image;
  title.textContent = item.title;
  artist.textContent = `作者：${item.artist}`;
  desc.textContent = item.desc;
  prompt.textContent = `提示词：${item.prompt}`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden'; // 锁定滚动
}

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  if (!navbar) return;

  // View Switching Logic
  function switchView(viewId) {
    // 1. Update Tabs
    navItems.forEach(item => {
      if (item.dataset.view === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Update Sections
    sections.forEach(section => {
      if (section.id === `view-${viewId}`) {
        section.style.display = 'block';
        // Small delay to allow display:block to apply before opacity transition if we added one
        requestAnimationFrame(() => {
          section.style.opacity = '1';
          section.style.transform = 'translateY(0)';
        });
      } else {
        section.style.opacity = '0';
        section.style.transform = 'translateY(10px)';
        setTimeout(() => {
          if (section.style.opacity === '0') section.style.display = 'none';
        }, 500); // Wait for transition
      }
    });

    // 3. Navbar Style handling
    if (viewId === 'home') {
      navbar.classList.remove('scrolled');
      // Only scroll effect on home if we kept the scroll within the view container? 
      // For now, Home is effectively 100vh, so no scroll needed usually.
    } else {
      navbar.classList.add('scrolled');
    }

    // Scroll to top when switching views
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle special view initialization
    if (viewId === 'exhibitions') {
      loadExhibitionsFromServer();
      showCreateExhibitionButton();
    }
  }

  // Bind Click Events
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.dataset.view;
      switchView(viewId);
    });
  });

  // Handle CTA buttons that link to views
  document.querySelectorAll('.nav-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = btn.dataset.target;
      if (target) switchView(target);
    });
  });

  // Handle URL hash on load
  /*
  const hash = window.location.hash.slice(1);
  if (hash && ['home', 'gallery', 'about'].includes(hash)) {
      switchView(hash);
  }
  */
}

function initParallax() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    // 背景以滚动速度的 40% 移动
    heroBg.style.transform = `translateY(${scrolled * 0.4}px)`;
  });
}

// initCursor 现在从 utils/cursor.js 导入

// 搜索功能
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.toLowerCase().trim();
    applyFilters();
  });
}



// 应用所有筛选条件
function applyFilters() {
  filteredCollection = collection.filter(item => {
    // 搜索词筛选（匹配 prompt、title、artist、desc）
    const matchesSearch = !currentSearchTerm ||
      (item.prompt && item.prompt.toLowerCase().includes(currentSearchTerm)) ||
      (item.title && item.title.toLowerCase().includes(currentSearchTerm)) ||
      (item.artist && item.artist.toLowerCase().includes(currentSearchTerm)) ||
      (item.desc && item.desc.toLowerCase().includes(currentSearchTerm));

    // 只显示在画廊中展示的作品（inShowcase为true）
    const isInShowcase = item.inShowcase === true;

    return matchesSearch && isInShowcase;
  });

  renderGallery();
  initObserve();
}

// 删除作品处理函数
async function handleDeleteArtwork(artworkId) {
  if (!confirm('确定要删除这件作品吗？此操作无法撤销。')) {
    return;
  }

  try {
    await GalleryService.deleteArtwork(artworkId);

    // 从集合中移除
    const index = collection.findIndex(item => item.id === artworkId);
    if (index !== -1) {
      collection.splice(index, 1);
    }

    // 重新应用筛选
    applyFilters();

    alert('作品已删除');
  } catch (err) {
    alert('删除失败: ' + err.message);
  }
}

// 更新导航栏状态
function updateNavbar() {
  const user = AuthService.getCurrentUser();
  const navUserBtn = document.getElementById('nav-user-btn');
  const navUploadBtn = document.getElementById('nav-upload-btn');

  if (user) {
    const typeLabels = {
      'student': '学生',
      'teacher': '教师',
      'admin': '管理员'
    };
    const typeLabel = typeLabels[user.userType] || '用户';
    navUserBtn.textContent = `${typeLabel}: ${user.name}`;

    // 显示上传按钮
    if (navUploadBtn) {
      navUploadBtn.style.display = 'inline-block';
    }
  } else {
    navUserBtn.textContent = '登录';

    // 隐藏上传按钮
    if (navUploadBtn) {
      navUploadBtn.style.display = 'none';
    }
  }
}

// 认证模态框逻辑（登录/注册）
function initAuth() {
  const authModal = document.getElementById('auth-modal');
  const closeBtn = document.querySelector('.close-auth');

  if (!authModal) return;

  // 关闭按钮
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      authModal.classList.remove('active');
    });
  }

  // 标签页切换
  const tabs = authModal.querySelectorAll('.tab-btn');
  const contents = authModal.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.remove('hidden');
      }
    });
  });

  // 登录按钮
  const loginBtn = document.getElementById('do-login-btn');
  const loginInput = document.getElementById('login-id');
  const loginPassword = document.getElementById('login-password');

  if (loginBtn && loginInput && loginPassword) {
    // 登录按钮点击事件
    loginBtn.addEventListener('click', async () => {
      const id = loginInput.value.trim();
      const password = loginPassword.value.trim();

      if (!id || !password) {
        alert('请输入账号和密码');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = "登录中...";
      try {
        const user = await AuthService.login(id, password);


        alert(`欢迎, ${user.name}!`);

        // 关闭模态框
        authModal.classList.remove('active');

        // 更新导航栏
        updateNavbar();

        // 刷新画廊以显示用户相关内容
        await refreshGallery();
      } catch (e) {
        alert("登录失败：" + e.message);
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "登录";
      }
    });

    // 密码输入框回车键事件
    loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginBtn.click();
      }
    });

    // 账号输入框回车键事件
    loginInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginPassword.focus();
      }
    });
  }

  // 用户类型切换
  const registerType = document.getElementById('register-type');
  const registerIdLabel = document.getElementById('register-id-label');
  const registerIdInput = document.getElementById('register-id');

  if (registerType) {
    registerType.addEventListener('change', (e) => {
      if (e.target.value === 'student') {
        registerIdLabel.textContent = '学号（8位数字）';
        registerIdInput.placeholder = '例如：20250101';
      } else {
        registerIdLabel.textContent = '工号（7位数字）';
        registerIdInput.placeholder = '例如：2506049';
      }
    });
  }

  // 注册按钮
  const registerBtn = document.getElementById('do-register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
      const userType = document.getElementById('register-type').value;
      const userId = document.getElementById('register-id').value.trim();
      const name = document.getElementById('register-name').value.trim();
      const password = document.getElementById('register-password').value.trim();
      const passwordConfirm = document.getElementById('register-password-confirm').value.trim();

      if (!userId || !name || !password || !passwordConfirm) {
        alert('请填写完整信息');
        return;
      }

      // 使用统一的验证模块
      if (!validateUserId(userId, userType)) {
        alert(getValidationMessage('userId', userType));
        return;
      }

      if (!validatePassword(password)) {
        alert(getValidationMessage('password'));
        return;
      }

      if (password !== passwordConfirm) {
        alert('两次输入的密码不一致');
        return;
      }

      registerBtn.disabled = true;
      registerBtn.textContent = "注册中...";
      try {
        const user = await AuthService.register(userId, password, name, userType);


        alert(`注册成功！欢迎, ${user.name}!`);

        // 关闭模态框
        authModal.classList.remove('active');

        // 更新导航栏
        updateNavbar();

        // 刷新画廊以显示用户相关内容
        await refreshGallery();
      } catch (e) {
        alert("注册失败：" + e.message);
      } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "注册";
      }
    });
  }

  // 跳转链接
  const gotoRegister = document.getElementById('goto-register');
  if (gotoRegister) {
    gotoRegister.addEventListener('click', (e) => {
      e.preventDefault();
      const registerTab = authModal.querySelector('[data-tab="register"]');
      if (registerTab) registerTab.click();
    });
  }

  const gotoLoginFromRegister = document.getElementById('goto-login-from-register');
  if (gotoLoginFromRegister) {
    gotoLoginFromRegister.addEventListener('click', (e) => {
      e.preventDefault();
      const loginTab = authModal.querySelector('[data-tab="login"]');
      if (loginTab) loginTab.click();
    });
  }
}

// 上传作品逻辑
function initUpload() {
  const navUploadBtn = document.getElementById('nav-upload-btn');

  if (!navUploadBtn) return;

  // 跳转到上传页面
  navUploadBtn.addEventListener('click', () => {
    window.location.href = '/upload.html';
  });
}

// 个人中心模态框逻辑
function initProfile() {
  const profileModal = document.getElementById('profile-modal');
  const navUserBtn = document.getElementById('nav-user-btn');
  const closeBtn = document.querySelector('.close-profile');
  const closeProfileBtn = document.querySelector('.close-profile-btn');

  if (!profileModal || !navUserBtn) return;

  // 打开个人中心
  navUserBtn.addEventListener('click', () => {
    const user = AuthService.getCurrentUser();
    if (!user) {
      // 未登录，打开登录模态框
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('active');
      }
      return;
    }

    // 已登录，打开个人中心
    profileModal.classList.add('active');
    loadProfileData();
  });

  // 关闭按钮
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      profileModal.classList.remove('active');
    });
  }

  // 关闭按钮（另一个选择器）
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => {
      profileModal.classList.remove('active');
    });
  }

  // 更新姓名
  const updateNameBtn = document.getElementById('update-name-btn');
  if (updateNameBtn) {
    updateNameBtn.addEventListener('click', async () => {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      const newName = document.getElementById('profile-new-name').value.trim();
      if (!newName) {
        alert('请输入新姓名');
        return;
      }

      try {
        const updatedUser = await AuthService.updateProfile(user.id, { name: newName });
        document.getElementById('profile-name').textContent = updatedUser.name;
        document.getElementById('profile-new-name').value = '';
        updateNavbar();
        alert('姓名更新成功！');
      } catch (e) {
        alert('更新失败: ' + e.message);
      }
    });
  }

  // 更新密码
  const updatePasswordBtn = document.getElementById('update-password-btn');
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', async () => {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      const oldPassword = document.getElementById('profile-old-password').value.trim();
      const newPassword = document.getElementById('profile-new-password').value.trim();
      const confirmPassword = document.getElementById('profile-new-password-confirm').value.trim();

      if (!oldPassword || !newPassword || !confirmPassword) {
        alert('请填写完整信息');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
      }

      if (newPassword.length < 6) {
        alert('密码至少需要6位');
        return;
      }

      try {
        await AuthService.updateProfile(user.id, {
          oldPassword: oldPassword,
          newPassword: newPassword
        });

        document.getElementById('profile-old-password').value = '';
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-new-password-confirm').value = '';

        alert('密码更新成功！');
      } catch (e) {
        alert('更新失败: ' + e.message);
      }
    });
  }

  // 退出登录
  const logoutBtn = document.getElementById('logout-btn-compact');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？')) {
        // 更新导航栏状态
        const navUserBtn = document.getElementById('nav-user-btn');
        const navUploadBtn = document.getElementById('nav-upload-btn');
        if (navUserBtn) navUserBtn.textContent = '登录';
        if (navUploadBtn) navUploadBtn.style.display = 'none';
        // 关闭个人中心弹窗
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.remove('active');
        AuthService.logout(); // 调用原始方法，内部会 reload
      }
    });
  }

  // 编辑资料按钮
  const editProfileBtn = document.getElementById('edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      const editPanel = document.getElementById('edit-profile-panel');
      if (editPanel) {
        editPanel.classList.toggle('hidden');
      }
    });
  }
}

// 加载个人信息数据
function loadProfileData() {
  const user = AuthService.getCurrentUser();
  if (!user) return;

  // 显示用户信息
  document.getElementById('profile-id').textContent = user.id;
  document.getElementById('profile-name').textContent = user.name;

  const typeLabels = {
    'student': '学生',
    'teacher': '教师',
    'admin': '管理员'
  };
  document.getElementById('profile-type').textContent = typeLabels[user.userType] || user.userType;

  const joinedDate = new Date(user.joined).toLocaleDateString('zh-CN');
  document.getElementById('profile-joined').textContent = joinedDate;
}



// ==================== 主题展览 ====================

// 从后端加载展览数据
async function loadExhibitionsFromServer() {
  try {
    const response = await fetch('/api/exhibitions');
    const result = await response.json();
    console.log('API 响应:', result);

    if (result.success && Array.isArray(result.data)) {
      const serverExhibitions = result.data;
      console.log('从服务器加载到', serverExhibitions.length, '个展览');

      // 只保留服务器返回的展览数据
      exhibitions = [];

      for (const ex of serverExhibitions) {
        if (!exhibitions.find(e => e.id === ex.id)) {
          exhibitions.push(ex);
        }
      }
      console.log('合并后展览总数:', exhibitions.length);

      renderExhibitionsList();
      showCreateExhibitionButton();
    }
  } catch (error) {
    console.error('加载展览数据失败:', error);
  }
}

function initExhibitions() {
  loadExhibitionsFromServer();

  const backBtn = document.getElementById('back-to-exhibitions');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('exhibitions-list-view').style.display = 'block';
      document.getElementById('exhibition-detail-view').style.display = 'none';
      currentExhibition = null;
      loadExhibitionsFromServer();
      showCreateExhibitionButton();
    });
  }

  showCreateExhibitionButton();
}

function showCreateExhibitionButton() {
  const currentUser = AuthService.getCurrentUser();
  if (!currentUser || (currentUser.userType !== 'teacher' && currentUser.userType !== 'admin')) {
    return;
  }

  const exhibitionsSection = document.querySelector('.exhibitions-section');
  if (!exhibitionsSection) return;

  const sectionHeader = exhibitionsSection.querySelector('.section-header');
  if (!sectionHeader) return;

  const existingBtn = document.getElementById('create-exhibition-btn');

  if (existingBtn) {
    existingBtn.style.display = 'inline-flex';
  } else if (createExhibitionButton) {
    sectionHeader.parentNode.insertBefore(createExhibitionButton, sectionHeader.nextSibling);
  }
}

function renderExhibitionsList() {
  const grid = document.getElementById('exhibitions-grid');
  if (!grid) return;

  const currentUser = AuthService.getCurrentUser();
  const isTeacherOrAdmin = currentUser && (currentUser.userType === 'teacher' || currentUser.userType === 'admin');

  console.log('渲染展览列表，当前展览数量:', exhibitions.length);

  if (exhibitions.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">暂无展览</p>';
    return;
  }

  grid.innerHTML = exhibitions.map(ex => {
    const canEdit = isTeacherOrAdmin && (
      currentUser.userType === 'admin' ||
      !ex.curatorId ||
      currentUser.id === ex.curatorId
    );

    const actionButtons = canEdit ? `
      <div class="exhibition-card-actions">
        <button class="edit-btn" data-id="${ex.id}">编辑</button>
        <button class="delete-btn" data-id="${ex.id}" title="删除展览">🗑️</button>
      </div>
    ` : '';

    return `
    <div class="exhibition-card" data-id="${ex.id}">
      <img src="${ex.coverImage || (ex.artworks.length > 0 ? (collection.find(a => a.id === ex.artworks[0])?.image || '/public/images/art1.png') : '/public/images/art1.png')}" class="exhibition-card-image" alt="${ex.title}">
      <div class="exhibition-card-content">
        <h3 class="exhibition-card-title">${ex.title}</h3>
        <p class="exhibition-card-desc">${ex.description}</p>
        <div class="exhibition-card-meta">
          <span>策展人：${ex.curator}</span>
          <span class="exhibition-card-count">${ex.artworks.length} 件作品</span>
        </div>
        ${actionButtons}
      </div>
    </div>
  `}).join('');

  grid.querySelectorAll('.exhibition-card').forEach((card, index) => {
    // 添加淡入动画效果
    setTimeout(() => {
      card.classList.add('visible');
    }, index * 100);
    
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn') || e.target.classList.contains('delete-btn')) return;
      const exId = card.dataset.id;
      const exhibition = exhibitions.find(e => e.id === exId);
      if (exhibition) openExhibitionDetail(exhibition);
    });

    const editBtn = card.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const exId = editBtn.dataset.id;
        const exhibition = exhibitions.find(ex => ex.id === exId);
        if (exhibition) openEditExhibitionModal(exhibition);
      });
    }

    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteExhibitionModal(e.currentTarget.dataset.id);
      });
    }
  });
}

function openExhibitionDetail(exhibition) {
  currentExhibition = exhibition;
  document.getElementById('exhibitions-list-view').style.display = 'none';
  document.getElementById('exhibition-detail-view').style.display = 'block';

  document.getElementById('exhibition-title').textContent = exhibition.title;
  document.getElementById('exhibition-description').textContent = exhibition.description;
  document.getElementById('exhibition-curator').textContent = exhibition.curator;

  const exArtworks = exhibition.artworks.map(id => collection.find(a => a.id === id)).filter(Boolean);
  const artworksGrid = document.getElementById('exhibition-artworks-grid');

  if (exArtworks.length === 0) {
    artworksGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">此展览暂无作品</p>';
  } else {
    artworksGrid.innerHTML = exArtworks.map(item => `
      <div class="gallery-item" data-title="${item.title}">
        <img src="${item.image}" alt="${item.title}">
        <div class="gallery-item-overlay">
          <h4>${item.title}</h4>
          <p>${item.artist || '未知艺术家'}</p>
        </div>
      </div>
    `).join('');

    // 绑定图片点击事件打开详情
    artworksGrid.querySelectorAll('.gallery-item img').forEach((img, index) => {
      img.addEventListener('click', () => {
        openExhibitionImmersive(index, exArtworks);
      });
    });

    // 添加淡入动画效果
    artworksGrid.querySelectorAll('.gallery-item').forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('visible');
      }, index * 100);
    });
  }

  // 沉浸模式按钮
  const immersionsBtn = document.getElementById('exhibition-immersive-btn');
  if (immersionsBtn) {
    immersionsBtn.onclick = () => {
      if (exArtworks.length > 0) {
        openExhibitionImmersive(0, exArtworks);
      } else {
        alert('此展览暂无作品');
      }
    };
  }
  
  // 返回按钮
  const backBtn = document.getElementById('back-to-exhibitions');
  if (backBtn) {
    backBtn.onclick = () => {
      document.getElementById('exhibitions-list-view').style.display = 'block';
      document.getElementById('exhibition-detail-view').style.display = 'none';
      currentExhibition = null;
      loadExhibitionsFromServer();
      showCreateExhibitionButton();
    };
  }
}

// 展览沉浸模式
function openExhibitionImmersive(index, artworks) {
  const viewer = document.getElementById('immersive-viewer');
  if (!viewer) return;

  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';

  // 临时存储展览作品数据
  window.currentExhibitionArtworks = artworks;
  window.currentExhibitionIndex = index;

  // 更新沉浸模式内容
  updateImmersiveContent();

  // 重置播放状态
  stopAutoPlay();
  resetIdleTimer();
}

async function openCreateExhibitionModal() {
  const currentUser = AuthService.getCurrentUser();
  if (!currentUser) { alert('请先登录'); return; }

  document.getElementById('exhibition-modal-title').textContent = '创建新展览';
  document.getElementById('edit-exhibition-id').value = '';
  document.getElementById('exhibition-title-input').value = '';
  document.getElementById('exhibition-desc-input').value = '';
  document.getElementById('exhibition-cover-input').value = '';
  selectedArtworkIds = [];

  await renderArtworkSelector();

  document.getElementById('exhibition-edit-modal').classList.add('active');
}

async function openEditExhibitionModal(exhibition) {
  const currentUser = AuthService.getCurrentUser();
  if (!currentUser) { alert('请先登录'); return; }

  console.log('打开编辑展览:', exhibition);
  document.getElementById('exhibition-modal-title').textContent = '编辑展览';
  document.getElementById('edit-exhibition-id').value = exhibition.id;
  document.getElementById('exhibition-title-input').value = exhibition.title;
  document.getElementById('exhibition-desc-input').value = exhibition.description;
  document.getElementById('exhibition-cover-input').value = exhibition.coverImage || '';
  selectedArtworkIds = [...exhibition.artworks];

  await renderArtworkSelector();

  document.getElementById('exhibition-edit-modal').classList.add('active');
}

async function renderArtworkSelector() {
  const container = document.getElementById('exhibition-artwork-selector');
  const countEl = document.getElementById('selected-artworks-count');
  if (!container) return;

  try {
    const response = await fetch('/api/gallery');
    const result = await response.json();
    const allArtworks = result.success ? result.data : result;
    const showcaseArtworks = allArtworks.filter(artwork => artwork.inShowcase !== false);

    if (showcaseArtworks.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">画廊中暂无可选择的作</p>';
      if (countEl) countEl.innerHTML = '已选择 <span>0</span> 件作品';
      return;
    }

    container.innerHTML = showcaseArtworks.map(artwork => {
      const isSelected = selectedArtworkIds.includes(artwork.id);
      return `<div class="artwork-selector-item ${isSelected ? 'selected' : ''}" data-artwork-id="${artwork.id}">
        <img src="${artwork.image}" alt="${artwork.title}">
        <div class="artwork-title-overlay">${artwork.title}</div>
      </div>`;
    }).join('');

    container.querySelectorAll('.artwork-selector-item').forEach(item => {
      item.addEventListener('click', () => {
        const artworkId = item.dataset.artworkId;
        const index = selectedArtworkIds.indexOf(artworkId);
        if (index === -1) { selectedArtworkIds.push(artworkId); item.classList.add('selected'); }
        else { selectedArtworkIds.splice(index, 1); item.classList.remove('selected'); }
        updateSelectedCount();
      });
    });

    updateSelectedCount();
  } catch (error) {
    console.error('加载作品选择器失败:', error);
  }
}

function updateSelectedCount() {
  const countEl = document.getElementById('selected-artworks-count');
  if (countEl) countEl.innerHTML = `已选择 <span>${selectedArtworkIds.length}</span> 件作品`;
}



async function handleExhibitionSubmit() {
  const modal = document.getElementById('exhibition-edit-modal');
  const currentUser = AuthService.getCurrentUser();
  if (!currentUser) { alert('请先登录'); return; }

  const exhibitionId = document.getElementById('edit-exhibition-id').value;
  const title = document.getElementById('exhibition-title-input').value;
  const description = document.getElementById('exhibition-desc-input').value;
  let coverImage = document.getElementById('exhibition-cover-input').value;

  if (!title.trim()) { alert('请填写展览标题'); return; }

  if (!coverImage && selectedArtworkIds.length > 0) {
    const firstArtwork = collection.find(a => a.id === selectedArtworkIds[0]);
    if (firstArtwork) coverImage = firstArtwork.image;
  }

  console.log('提交展览数据:', { exhibitionId, title, description, coverImage, artworks: selectedArtworkIds });

  try {
    if (exhibitionId) {
      const updatedExhibition = await ExhibitionService.updateExhibition(exhibitionId, { title, description, coverImage, artworks: selectedArtworkIds }, currentUser.id);
      console.log('展览更新成功:', updatedExhibition);
      modal.classList.remove('active');
      await loadExhibitionsFromServer();
      alert('展览更新成功！');
    } else {
      const newExhibition = await ExhibitionService.createExhibition(title, description, coverImage || '/public/images/art1.png', currentUser.id);
      console.log('新展览创建成功:', newExhibition);

      if (selectedArtworkIds.length > 0) {
        try {
          await ExhibitionService.updateExhibition(newExhibition.id, { artworks: selectedArtworkIds }, currentUser.id);
        } catch (err) {
          console.error('批量添加作品失败:', err);
          for (const artworkId of selectedArtworkIds) {
            try { await ExhibitionService.addArtworkToExhibition(newExhibition.id, artworkId, currentUser.id); }
            catch (err2) { console.error(`添加作品 ${artworkId} 失败:`, err2.message); }
          }
        }
      }

      modal.classList.remove('active');
      await loadExhibitionsFromServer();
      alert('展览创建成功！');
    }
  } catch (error) {
    console.error('保存展览失败:', error);
    alert('保存展览失败：' + error.message);
  }
}

function openDeleteExhibitionModal(exhibitionId) {
  const modal = document.getElementById('exhibition-delete-modal');
  if (!modal) return;
  document.getElementById('delete-exhibition-id').value = exhibitionId;
  modal.classList.add('active');
}

function initExhibitionEditModal() {
  const modal = document.getElementById('exhibition-edit-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.close-modal-btn');
  const cancelBtn = modal.querySelector('.cancel-edit-btn');
  const form = document.getElementById('exhibition-edit-form');

  const closeModal = () => modal.classList.remove('active');

  if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); };
  if (cancelBtn) cancelBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); };
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  if (form) form.onsubmit = async (e) => { e.preventDefault(); await handleExhibitionSubmit(); };
}

function initExhibitionDeleteModal() {
  const modal = document.getElementById('exhibition-delete-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.close-modal-btn');
  const cancelBtn = modal.querySelector('.cancel-delete-btn');
  const confirmBtn = modal.querySelector('.confirm-delete-btn');

  const closeModal = () => modal.classList.remove('active');

  if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); };
  if (cancelBtn) cancelBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); };
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      const exhibitionId = document.getElementById('delete-exhibition-id').value;
      const currentUser = AuthService.getCurrentUser();
      try {
        await ExhibitionService.deleteExhibition(exhibitionId, currentUser.id);
        closeModal();
        await loadExhibitionsFromServer();
        alert('展览已删除');
      } catch (error) {
        console.error('删除展览失败:', error);
        alert('删除展览失败：' + error.message);
      }
    };
  }
}

function initExhibitionManagement() {
  initExhibitionEditModal();
  initExhibitionDeleteModal();

  // 在切换到展览视图时动态创建按钮
  const navItem = document.querySelector('.nav-item[data-view="exhibitions"]');
  if (navItem) {
    navItem.addEventListener('click', () => {
      setTimeout(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return;

        if (currentUser.userType === 'teacher' || currentUser.userType === 'admin') {
          let createBtn = document.getElementById('create-exhibition-btn');
          if (!createBtn) {
            const exhibitionsSection = document.querySelector('.exhibitions-section');
            if (exhibitionsSection) {
              const sectionHeader = exhibitionsSection.querySelector('.section-header');
              if (sectionHeader) {
                createBtn = document.createElement('button');
                createBtn.id = 'create-exhibition-btn';
                createBtn.className = 'btn btn-primary';
                createBtn.textContent = '创建展览';
                createBtn.style.cssText = 'margin: 2rem 4rem; padding: 0.75rem 2rem; display: inline-flex;';
                createBtn.onclick = openCreateExhibitionModal;
                sectionHeader.appendChild(createBtn);
                createExhibitionButton = createBtn;
              }
            }
          } else {
            createBtn.style.display = 'inline-flex';
          }
        }
      }, 100);
    });
  }
}

// 初始化设备检测
initDeviceDetection();

