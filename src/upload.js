import { AuthService } from './userManager.js'
import { initCursor } from './utils/cursor.js'
import { ApiClient } from './utils/apiClient.js'

// --- Upload Page Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
        // 未登录，重定向到首页
        alert('请先登录后再使用上传功能');
        window.location.href = '/';
        return;
    }

    initCursor();
    initUploadPageFunctions();
});

function initUploadPageFunctions() {
    const artFile = document.getElementById('art-file');
    const dropArea = document.getElementById('drop-area');
    const previewImg = document.getElementById('preview-img');
    const artTitle = document.getElementById('art-title');
    const artPrompt = document.getElementById('art-prompt');
    const artDesc = document.getElementById('art-desc');
    const addToGallery = document.getElementById('add-to-gallery');
    const submitBtn = document.getElementById('submit-art-btn');
    const statusDisplay = document.getElementById('status-display');
    const previewContainer = document.getElementById('preview-container');
    const aiResultsWrapper = document.getElementById('ai-results-wrapper');
    const emptyState = document.querySelector('.empty-state');
    const resultsGrid = document.getElementById('results-grid');

    let uploadedImage = null;

    // 从URL参数中加载图片和提示词
    loadFromUrlParams();

    // 初始化文件上传区域
    initFileUpload();

    // 初始化表单提交
    submitBtn.addEventListener('click', async () => {
        await handleSubmit();
    });

    // 初始化文件上传
    function initFileUpload() {
        // 点击上传
        dropArea.addEventListener('click', () => {
            artFile.click();
        });

        // 拖拽上传
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.style.border = '2px dashed #333';
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.style.border = '2px dashed #ccc';
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.style.border = '2px dashed #ccc';
            
            if (e.dataTransfer.files.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        // 文件选择
        artFile.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });
    }

    // 处理文件
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('请上传图片文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            previewImg.src = imageUrl;
            previewImg.style.display = 'block';
            
            // 保存上传的图片，同时保存原始文件对象
            uploadedImage = {
                id: Date.now().toString(),
                url: imageUrl,
                file: file // 保存原始文件对象
            };
            
            // 显示预览
            showPreview(imageUrl);
        };
        reader.readAsDataURL(file);
    }

    // 显示预览
    function showPreview(imageUrl) {
        emptyState.classList.add('hidden');
        aiResultsWrapper.classList.remove('hidden');
        
        resultsGrid.innerHTML = `
            <div class="result-item">
                <img src="${imageUrl}" />
            </div>
        `;
    }

    // 处理表单提交
    async function handleSubmit() {
        if (!uploadedImage) {
            showStatus('请先上传图片', 'error');
            return;
        }

        if (!artTitle.value.trim()) {
            showStatus('请输入作品标题', 'error');
            return;
        }

        const user = AuthService.getCurrentUser();
        if (!user) {
            showStatus('请先登录', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '上传中...';

        try {
            // 构建上传数据
            const uploadData = {
                title: artTitle.value.trim(),
                description: artDesc.value.trim(),
                prompt: artPrompt.value.trim(),
                userId: user.id || user,
                addToGallery: addToGallery.checked
            };

            // 上传到服务器
            let response;
            if (uploadedImage.fromUrl) {
                // 从URL加载的图片，使用特殊处理
                // 这里我们需要先将图片从URL下载到本地，然后再上传
                // 但由于安全限制，我们无法直接从其他域名下载图片
                // 因此，我们需要修改服务器端代码来支持从URL上传
                // 暂时使用一个简单的方法，将图片URL作为参数传递给服务器
                response = await ApiClient.post('/api/ai/save-to-gallery', {
                    imageIds: [uploadedImage.id],
                    title: uploadData.title,
                    prompt: uploadData.prompt,
                    user: uploadData.userId,
                    imageUrls: {
                        [uploadedImage.id]: uploadedImage.imageUrl
                    }
                });
            } else {
                // 使用FormData格式上传，因为服务器端的/upload端点使用multer处理文件上传
                const formData = new FormData();
                formData.append('image', uploadedImage.file); // 使用原始文件对象
                formData.append('title', uploadData.title);
                formData.append('prompt', uploadData.prompt);
                formData.append('desc', uploadData.description);
                formData.append('user', uploadData.userId);
                formData.append('addToGallery', uploadData.addToGallery ? 'true' : 'false');
                
                response = await ApiClient.upload('/api/upload', formData);
            }

            if (response.success) {
                showStatus('上传成功！作品已保存到您的作品库', 'info');
                // 重置表单
                setTimeout(() => {
                    resetForm();
                }, 2000);
            } else {
                showStatus('上传失败: ' + (response.error || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('上传失败:', error);
            showStatus('上传失败: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '提交';
        }
    }

    // 重置表单
    function resetForm() {
        artFile.value = '';
        previewImg.src = '';
        previewImg.style.display = 'none';
        artTitle.value = '';
        artPrompt.value = '';
        artDesc.value = '';
        addToGallery.checked = true;
        uploadedImage = null;
        selectedImages.clear();
        
        emptyState.classList.remove('hidden');
        aiResultsWrapper.classList.add('hidden');
        updateActionButtons();
        showStatus('', 'info');
    }

    // 显示状态信息
    function showStatus(message, type = 'info') {
        if (!statusDisplay) return;
        
        statusDisplay.textContent = message;
        statusDisplay.className = `status-msg ${type}`;
        statusDisplay.classList.remove('hidden');
        
        if (type !== 'error') {
            setTimeout(() => {
                statusDisplay.classList.add('hidden');
            }, 3000);
        }
    }

    // 初始化表单样式
    function initFormStyles() {
        // 添加表单元素样式
        const formInputs = document.querySelectorAll('.form-input, .form-textarea');
        formInputs.forEach(input => {
            input.classList.add('nexus-input');
        });

        // 添加文件上传区域样式
        dropArea.style.border = '2px dashed #ccc';
        dropArea.style.borderRadius = '8px';
        dropArea.style.padding = '2rem';
        dropArea.style.textAlign = 'center';
        dropArea.style.cursor = 'pointer';
        dropArea.style.transition = 'border-color 0.3s ease';
    }

    // 从URL参数中加载图片和提示词
    function loadFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const imageUrl = urlParams.get('image');
        const prompt = urlParams.get('prompt');

        if (imageUrl) {
            // 解码URL参数
            const decodedImageUrl = decodeURIComponent(imageUrl);
            const decodedPrompt = prompt ? decodeURIComponent(prompt) : '';

            // 设置图片预览
            previewImg.src = decodedImageUrl;
            previewImg.style.display = 'block';

            // 保存上传的图片
            uploadedImage = {
                id: Date.now().toString(),
                url: decodedImageUrl,
                fromUrl: true, // 标记为从URL加载
                imageUrl: decodedImageUrl // 保存原始URL
            };

            // 填充提示词
            if (decodedPrompt) {
                artPrompt.value = decodedPrompt;
            }

            // 显示预览
            showPreview(decodedImageUrl);
        }
    }

    // 初始化表单样式
    initFormStyles();
}
