import { AuthService } from './userManager.js'
import { initCursor } from './utils/cursor.js'
import { ProgressBar } from './utils/progressBar.js'
import { validatePrompt } from './utils/validation.js'
import { ApiClient } from './utils/apiClient.js'

// --- Custom AI Logic for Create Page ---

document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
        // 未登录，重定向到首页
        alert('请先登录后再使用 AI 创作功能');
        window.location.href = '/';
        return;
    }

    initCursor();
    initCreatePageFunctions();
});

function initCreatePageFunctions() {
    const btnGenerate = document.getElementById('btn-generate');
    const statusDisplay = document.getElementById('status-display');
    const previewContainer = document.getElementById('preview-container');
    const aiResultsWrapper = document.getElementById('ai-results-wrapper');
    const emptyState = document.querySelector('.empty-state');
    const progressOverlay = document.getElementById('ai-progress-overlay');
    const historyGrid = document.getElementById('history-grid');

    // 使用 ProgressBar 类
    const progressBar = new ProgressBar('progress-fill');

    // Inputs
    const inputSubject = document.getElementById('input-subject');
    const inputBackground = document.getElementById('input-background');
    const inputStylePreset = document.getElementById('input-style-preset');
    const inputStyleCustom = document.getElementById('input-style-custom');
    const inputSupplement = document.getElementById('input-supplement');
    const inputScale = document.getElementById('ai-scale');

    // Result Actions
    let btnDownload = document.getElementById('download-selected-btn');
    let btnSave = document.getElementById('save-to-gallery-btn');

    let currentImages = []; // Array of image objects
    let selectedImages = new Set();
    let currentPrompt = "";
    let historyImages = []; // 历史图片数组

    // 加载历史图片
    loadHistoryImages();

    // 加载历史图片
    async function loadHistoryImages() {
        try {
            const user = AuthService.getCurrentUser();
            if (!user) return;
            
            console.log('Current user:', user);
            
            // 使用包含用户ID的键名存储历史记录
            const historyKey = `nexus_ai_history_${user.id || user}`;
            console.log('History key:', historyKey);
            
            // 清理所有旧的历史记录数据
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('nexus_ai_history')) {
                    localStorage.removeItem(key);
                    console.log('Removed old history key:', key);
                }
            }
            
            // 尝试从API加载用户的作品
            console.log('Loading works from API for user:', user.id || user);
            const response = await ApiClient.get('/api/works', {
                userId: user.id || user,
                category: 'AI生成'
            });

            console.log('API response:', response);
            
            if (response.success && response.data) {
                console.log('Loaded works:', response.data);
                historyImages = response.data.map(work => ({
                    id: work.id,
                    url: work.image,  // 修复：API 返回的是 image 不是 url
                    title: work.title,
                    prompt: work.prompt,
                    createdAt: work.uploadedAt  // 修复：API 返回的是 uploadedAt
                }));
                // 保存到本地存储
                localStorage.setItem(historyKey, JSON.stringify(historyImages));
                console.log('Saved works to localStorage:', historyImages);
                renderHistoryImages();
            } else {
                // 如果API没有返回数据，清空历史记录
                historyImages = [];
                localStorage.setItem(historyKey, JSON.stringify(historyImages));
                renderHistoryImages();
                console.log('No works found for user:', user.id || user);
            }
        } catch (error) {
            console.error('加载历史图片失败:', error);
        }
    }

    // 将历史作品加载到生成区
    function loadHistoryItemToGenerate(historyItem) {
        console.log('Loading history item to generate:', historyItem);
        
        // 清空当前状态
        selectedImages.clear();
        
        // 将历史作品设置为当前图片
        currentImages = [{
            id: historyItem.id,
            url: historyItem.url,
            filename: historyItem.filename // 保存文件名
        }];
        
        // 保存提示词
        currentPrompt = historyItem.prompt || '';
        
        // 渲染结果
        renderResults(currentImages);
        
        // 显示成功提示
        updateStatus('已从历史记录加载作品', 'info');
    }

    // 渲染历史图片
    function renderHistoryImages() {
        if (!historyGrid) return;

        if (historyImages.length === 0) {
            historyGrid.innerHTML = '<div class="empty-history">暂无历史作品</div>';
            return;
        }

        // 按时间倒序排序
        const sortedHistory = [...historyImages].sort((a, b) => 
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        historyGrid.innerHTML = sortedHistory.map(img => `
            <div class="history-item" data-id="${img.id}">
                <img src="${img.url}" title="${img.title || '历史作品'}" />
            </div>
        `).join('');

        // 添加点击事件
        historyGrid.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const historyItem = historyImages.find(img => img.id === id);
                if (historyItem) {
                    // 将历史作品加载到生成区
                    loadHistoryItemToGenerate(historyItem);
                }
            });
        });
    }

    // 保存图片到历史记录
    function saveToHistory(image) {
        const user = AuthService.getCurrentUser();
        if (!user) return;
        
        // 使用包含用户ID的键名存储历史记录
        const historyKey = `nexus_ai_history_${user.id || user}`;
        
        // 生成文件名
        const filename = generateValidFilenameWithDate(currentPrompt) + '.jpg';
        
        const historyItem = {
            id: image.id || Date.now().toString(),
            url: image.url,
            title: '', // 暂时为空，后续可以从上传时获取
            prompt: currentPrompt,
            filename: filename,
            createdAt: new Date().toISOString()
        };

        // 添加到历史记录
        historyImages.unshift(historyItem);
        
        // 限制历史记录数量
        if (historyImages.length > 20) {
            historyImages = historyImages.slice(0, 20);
        }

        // 保存到本地存储
        localStorage.setItem(historyKey, JSON.stringify(historyImages));
        
        // 重新渲染历史图片
        renderHistoryImages();
    }

    function updateStatus(msg, type = 'info') {
        statusDisplay.textContent = msg;
        statusDisplay.className = `status-msg ${type}`;
        statusDisplay.classList.remove('hidden');
        if (type !== 'error') {
            setTimeout(() => statusDisplay.classList.add('hidden'), 5000);
        }
    }

    updateStatus('ready', '准备就绪，请填写左侧信息开始创作');
    initPromptSuggestions();

    // --- Suggestions & History ---
    const defaultSuggestions = [
        "柔和光影", "8k分辨率", "赛博朋克", "极简主义", "电影质感",
        "虚幻引擎5", "大师级作品", "辛烷渲染", "特写镜头"
    ];
    let promptHistory = JSON.parse(localStorage.getItem('nexus_prompt_history') || '{}');

    function initPromptSuggestions() {
        const container = document.getElementById('prompt-chips');
        if (!container) return;

        container.innerHTML = '';

        // 1. Frequent History (Usage >= 3)
        const frequent = Object.entries(promptHistory)
            .filter(([_, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1]) // Sort by frequency
            .slice(0, 5) // Top 5
            .map(([word]) => word);

        frequent.forEach(word => {
            const chip = createChip(word, true);
            container.appendChild(chip);
        });

        // 2. Default Suggestions (exclude frequent to avoid dupes)
        defaultSuggestions.filter(w => !frequent.includes(w)).forEach(word => {
            const chip = createChip(word, false);
            container.appendChild(chip);
        });
    }

    function createChip(text, isHistory) {
        const chip = document.createElement('span');
        chip.className = `prompt-chip ${isHistory ? 'history' : ''}`;
        chip.textContent = text;
        chip.title = isHistory ? '常用提示词' : '推荐提示词';

        chip.addEventListener('click', () => {
            const current = inputSupplement.value.trim();
            if (current) {
                if (!current.includes(text)) {
                    inputSupplement.value = current + ', ' + text;
                }
            } else {
                inputSupplement.value = text;
            }
            // Feedback animation
            chip.style.transform = 'scale(0.95)';
            setTimeout(() => chip.style.transform = '', 100);
        });

        return chip;
    }

    function trackPromptUsage(fullPrompt) {
        // Split prompt by comma and track each meaningful part
        const parts = fullPrompt.split(/[,，]/).map(p => p.trim()).filter(p => p.length > 1);
        let changed = false;

        parts.forEach(part => {
            // Skip structural prefixes if accidentally included (though UI separates them)
            if (part.startsWith('Subject:') || part.startsWith('Style:')) return;

            promptHistory[part] = (promptHistory[part] || 0) + 1;
            changed = true;
        });

        if (changed) {
            localStorage.setItem('nexus_prompt_history', JSON.stringify(promptHistory));
            // Refresh chips next time or now? Maybe too distracting to refresh now.
            // Let's refresh on next page load or explicitly if needed.
        }
    }

    // --- Logic ---
    function buildPrompt() {
        const parts = [];
        if (inputSubject.value.trim()) parts.push(`Subject: ${inputSubject.value.trim()}`);
        if (inputBackground.value.trim()) parts.push(`Background: ${inputBackground.value.trim()}`);

        let style = inputStyleCustom.value.trim();
        if (!style && inputStylePreset.value) {
            style = inputStylePreset.value;
        } else if (style && inputStylePreset.value) {
            style = `${inputStylePreset.value}, ${style}`;
        }
        if (style) parts.push(`Style: ${style}`);

        if (inputSupplement.value.trim()) parts.push(`Details: ${inputSupplement.value.trim()}`);

        return parts.join(', ');
    }

    // 构建用于显示的提示词（不带标签）
    function buildDisplayPrompt() {
        const parts = [];
        if (inputSubject.value.trim()) parts.push(inputSubject.value.trim());
        if (inputBackground.value.trim()) parts.push(inputBackground.value.trim());

        let style = inputStyleCustom.value.trim();
        if (!style && inputStylePreset.value) {
            style = inputStylePreset.value;
        } else if (style && inputStylePreset.value) {
            style = `${inputStylePreset.value}, ${style}`;
        }
        if (style) parts.push(style);

        if (inputSupplement.value.trim()) parts.push(inputSupplement.value.trim());

        return parts.join(', ');
    }

    btnGenerate.addEventListener('click', async () => {
        const prompt = buildPrompt();
        const displayPrompt = buildDisplayPrompt(); // 用于显示的提示词

        if (prompt.length < 10) {
            updateStatus('⚠️ 请填写更多细节，描述太短可能无法生成高质量作品', 'error');
            return;
        }

        trackPromptUsage(inputSupplement.value); // Track usage
        trackPromptUsage(inputSubject.value);

        const scale = inputScale.value;

        // UI Interaction
        btnGenerate.disabled = true;
        progressOverlay.classList.remove('hidden');
        progressBar.start(); // 使用 ProgressBar 类

        try {
            await new Promise(r => setTimeout(r, 500)); // Sim start delay

            // 使用 ApiClient
            const data = await ApiClient.post('/api/ai/generate', {
                prompt: prompt,
                options: {
                    scale: scale,
                    model: 'doubao-seedream-4.5'
                }
            });

            progressBar.complete(); // 完成进度条

            // Success
            currentImages = data.data.images;
            currentPrompt = displayPrompt; // 保存显示用的提示词

            // 为每个图片对象添加文件名属性
            currentImages = currentImages.map(image => {
                // 生成文件名
                const filename = generateValidFilenameWithDate(currentPrompt) + '.jpg';
                return {
                    ...image,
                    filename: filename
                };
            });

            // 保存生成的图片到历史记录
            currentImages.forEach(image => {
                saveToHistory(image);
            });

            renderResults(currentImages);

        } catch (e) {
            console.error(e);
            updateStatus(`Error: ${e.message}`, 'error');
        } finally {
            setTimeout(() => {
                progressOverlay.classList.add('hidden');
                progressBar.reset();
                btnGenerate.disabled = false;
            }, 500);
        }
    });

    function renderResults(images) {
        emptyState.classList.add('hidden');
        aiResultsWrapper.classList.remove('hidden');

        const grid = document.getElementById('results-grid');
        grid.innerHTML = images.map((img, idx) => `
            <div class="result-item" data-id="${img.id}">
                <img src="${img.url}" />
            </div>
        `).join('');

        // 确保 currentImages 被正确设置
        currentImages = images;

        // 自动选中唯一的图片
        if (images.length === 1) {
            selectedImages.clear();
            selectedImages.add(images[0].id);
            const item = grid.querySelector('.result-item');
            if (item) {
                item.classList.add('selected');
            }
        } else {
            // Bind clicks for multiple images
            grid.querySelectorAll('.result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    if (selectedImages.has(id)) {
                        selectedImages.delete(id);
                        item.classList.remove('selected');
                    } else {
                        selectedImages.add(id);
                        item.classList.add('selected');
                    }
                    updateActionButtons();
                });
            });
            selectedImages.clear();
        }

        // 强制更新按钮状态
        setTimeout(() => {
            updateActionButtons();
        }, 100);
    }

    function updateActionButtons() {
        console.log('updateActionButtons called');
        console.log('selectedImages.size:', selectedImages.size);
        console.log('currentImages.length:', currentImages.length);
        
        const hasSelection = selectedImages.size > 0 || currentImages.length === 1;
        btnDownload.disabled = !hasSelection;
        btnSave.disabled = !hasSelection;

        console.log('hasSelection:', hasSelection);
        console.log('btnDownload.disabled:', btnDownload.disabled);
        console.log('btnSave.disabled:', btnSave.disabled);

        btnDownload.textContent = hasSelection ? `下载` : '下载';
        btnSave.textContent = hasSelection ? `上传到作品库` : '上传到作品库';
    }

    // 初始化时强制更新按钮状态
    setTimeout(() => {
        updateActionButtons();
    }, 500);

    // 上传到作品库
    btnSave.addEventListener('click', async () => {
        const user = AuthService.getCurrentUser();
        if (!user) {
            alert('请先登录再保存作品（请返回首页登录）');
            return;
        }

        // 获取图片（如果有选中的就用选中的，否则用第一张）
        let image;
        if (selectedImages.size > 0) {
            const selectedImagesList = Array.from(selectedImages);
            image = currentImages.find(img => img.id === selectedImagesList[0]);
        } else if (currentImages.length > 0) {
            image = currentImages[0];
        }

        if (!image) {
            alert('未找到图片');
            return;
        }

        // 跳转到上传页面，并传递图片URL和提示词
        const imageUrl = encodeURIComponent(image.url);
        const prompt = encodeURIComponent(currentPrompt);
        window.location.href = `/upload.html?image=${imageUrl}&prompt=${prompt}`;
    });

    // 下载功能
    btnDownload.addEventListener('click', async () => {
        btnDownload.disabled = true;
        const originalText = btnDownload.textContent;
        btnDownload.textContent = '下载中...';

        try {
            // 确定要下载的图片
            let imagesToDownload;
            if (selectedImages.size > 0) {
                imagesToDownload = Array.from(selectedImages).map(id => 
                    currentImages.find(img => img.id === id)
                ).filter(Boolean);
            } else if (currentImages.length > 0) {
                imagesToDownload = [currentImages[0]];
            } else {
                alert('未找到图片');
                return;
            }

            // 下载图片
            for (let i = 0; i < imagesToDownload.length; i++) {
                const image = imagesToDownload[i];
                if (image) {
                    if (imagesToDownload.length > 1) {
                        btnDownload.textContent = `下载中 (${i + 1}/${imagesToDownload.length})`;
                    }
                    // 使用图片对象中存储的文件名，如果没有则生成新的
                    const filename = image.filename || generateValidFilenameWithDate(currentPrompt) + '.jpg';
                    await downloadImage(image.url, filename);
                    // 添加延迟避免浏览器阻止多个下载
                    if (i < imagesToDownload.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

            alert(`成功下载 ${imagesToDownload.length} 张图片！`);
        } catch (e) {
            console.error('下载失败:', e);
            alert('下载失败: ' + e.message);
        } finally {
            btnDownload.disabled = false;
            btnDownload.textContent = originalText;
        }
    });

    // 生成带日期时间的有效文件名
    function generateValidFilenameWithDate(text) {
        // 处理提示词：如果太长则取前10个字
        let promptPart = text;
        if (promptPart.length > 10) {
            promptPart = promptPart.substring(0, 10);
        }
        
        // 移除无效字符
        promptPart = promptPart.replace(/[<>:"/\\|?*]/g, ' ');
        // 替换空格为下划线
        promptPart = promptPart.replace(/\s+/g, '_');
        // 移除首尾下划线
        promptPart = promptPart.trim('_');
        // 如果提示词为空，使用默认名称
        if (!promptPart) {
            promptPart = 'ai_generated_art';
        }
        
        // 生成日期时间部分：YYYYMMDD_hh_mm
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const dateTimePart = `${year}${month}${day}_${hours}_${minutes}`;
        
        // 组合文件名
        return `${promptPart}_${dateTimePart}`;
    }

    // 下载单张图片的辅助函数
    async function downloadImage(url, filename) {
        try {
            console.log('Downloading image:', url, filename);
            
            // 检查URL是否有效
            if (!url) {
                throw new Error('图片URL无效');
            }
            
            // 使用Canvas方法绕过CORS限制
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // 关键：设置crossOrigin为anonymous
            img.crossOrigin = 'anonymous';
            
            // 等待图片加载
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            
            // 设置Canvas尺寸
            canvas.width = img.width;
            canvas.height = img.height;
            
            // 绘制图片到Canvas
            ctx.drawImage(img, 0, 0);
            
            // 将Canvas转换为Blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg');
            });
            
            if (!blob) {
                throw new Error('无法创建图片Blob');
            }

            // 创建下载链接
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // 直接设置blob URL和下载属性
            a.href = blobUrl;
            
            // 对于中文字符的文件名，使用decodeURIComponent确保正确显示
            a.download = decodeURIComponent(encodeURIComponent(filename));
            
            document.body.appendChild(a);
            a.click();

            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);
        } catch (error) {
            console.error('下载图片失败:', error);
            
            // 如果Canvas方法失败，尝试直接创建下载链接
            try {
                console.log('尝试使用直接链接方法...');
                const a = document.createElement('a');
                a.href = url;
                // 对于中文字符的文件名，使用decodeURIComponent确保正确显示
                a.download = decodeURIComponent(encodeURIComponent(filename));
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                }, 100);
            } catch (directError) {
                console.error('直接链接方法也失败:', directError);
                throw new Error('无法下载图片，请尝试右键保存图片');
            }
        }
    }

    // 确保按钮事件监听器正确绑定
    function ensureButtonListeners() {
        console.log('Ensuring button listeners...');
        
        // 重新绑定所有按钮事件监听器
        if (btnRegenerate) {
            // 移除旧的事件监听器
            const newBtnRegenerate = btnRegenerate.cloneNode(true);
            btnRegenerate.parentNode.replaceChild(newBtnRegenerate, btnRegenerate);
            btnRegenerate = newBtnRegenerate;
            
            // 绑定新的事件监听器
            btnRegenerate.addEventListener('click', () => {
                console.log('Retry button clicked');
                // 清空结果，回到初始状态
                emptyState.classList.remove('hidden');
                aiResultsWrapper.classList.add('hidden');
                selectedImages.clear();
                updateActionButtons();
            });
        }
        
        if (btnDownload) {
            // 移除旧的事件监听器
            const newBtnDownload = btnDownload.cloneNode(true);
            btnDownload.parentNode.replaceChild(newBtnDownload, btnDownload);
            btnDownload = newBtnDownload;
            
            // 绑定新的事件监听器
            btnDownload.addEventListener('click', async () => {
                console.log('Download button clicked');
                btnDownload.disabled = true;
                const originalText = btnDownload.textContent;
                btnDownload.textContent = '下载中...';

                try {
                    // 确定要下载的图片
                    let imagesToDownload;
                    if (selectedImages.size > 0) {
                        imagesToDownload = Array.from(selectedImages).map(id => 
                            currentImages.find(img => img.id === id)
                        ).filter(Boolean);
                    } else if (currentImages.length > 0) {
                        imagesToDownload = [currentImages[0]];
                    } else {
                        alert('未找到图片');
                        return;
                    }

                    // 下载图片
                    for (let i = 0; i < imagesToDownload.length; i++) {
                        const image = imagesToDownload[i];
                        if (image) {
                            if (imagesToDownload.length > 1) {
                                btnDownload.textContent = `下载中 (${i + 1}/${imagesToDownload.length})`;
                            }
                            // 使用图片对象中存储的文件名，如果没有则生成新的
                            const filename = image.filename || generateValidFilenameWithDate(currentPrompt) + '.jpg';
                            await downloadImage(image.url, filename);
                            // 添加延迟避免浏览器阻止多个下载
                            if (i < imagesToDownload.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }
                    }

                    alert(`成功下载 ${imagesToDownload.length} 张图片！`);
                } catch (e) {
                    console.error('下载失败:', e);
                    alert('下载失败: ' + e.message);
                } finally {
                    btnDownload.disabled = false;
                    btnDownload.textContent = originalText;
                }
            });
        }
        
        if (btnSave) {
            // 移除旧的事件监听器
            const newBtnSave = btnSave.cloneNode(true);
            btnSave.parentNode.replaceChild(newBtnSave, btnSave);
            btnSave = newBtnSave;
            
            // 绑定新的事件监听器
                btnSave.addEventListener('click', async () => {
                    console.log('Upload button clicked');
                    const user = AuthService.getCurrentUser();
                    if (!user) {
                        alert('请先登录再保存作品（请返回首页登录）');
                        return;
                    }

                    // 获取图片（如果有选中的就用选中的，否则用第一张）
                    let image;
                    if (selectedImages.size > 0) {
                        const selectedImagesList = Array.from(selectedImages);
                        image = currentImages.find(img => img.id === selectedImagesList[0]);
                    } else if (currentImages.length > 0) {
                        image = currentImages[0];
                    }

                    if (!image) {
                        alert('未找到图片');
                        return;
                    }

                    // 跳转到上传页面，并传递图片URL和提示词
                    const imageUrl = encodeURIComponent(image.url);
                    const prompt = encodeURIComponent(currentPrompt);
                    window.location.href = `/upload.html?image=${imageUrl}&prompt=${prompt}`;
                });
        }
    }

    // 初始化时确保按钮事件监听器正确绑定
    setTimeout(() => {
        ensureButtonListeners();
    }, 1000);



}
