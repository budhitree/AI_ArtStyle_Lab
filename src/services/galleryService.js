/**
 * 画廊服务
 * 处理作品上传、删除、获取
 */

import { ApiClient } from '../utils/apiClient.js';
import { AuthService } from './authService.js';

export const GalleryService = {
  /**
   * 上传作品
   * @param {File} file - 图片文件
   * @param {string} title - 作品标题
   * @param {string} prompt - 提示词
   * @param {boolean} addToGallery - 是否添加到画廊
   * @returns {Promise<Object>} 上传的作品信息
   */
  async uploadArtwork(file, title, prompt, desc, addToGallery = false) {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('未登录');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    formData.append('prompt', prompt);
    formData.append('desc', desc);
    formData.append('user', user.id);
    formData.append('addToGallery', addToGallery);

    try {
      // 修复：使用正确的上传路径
      const response = await ApiClient.upload('/api/gallery/upload', formData);
      return response.data;
    } catch (error) {
      console.error('Upload artwork error:', error);
      const errorMessage = error.message || (error.response?.data?.error || '上传失败');
      throw new Error(errorMessage);
    }
  },

  /**
   * 删除作品
   * @param {string} artworkId - 作品ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteArtwork(artworkId) {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('未登录');

    try {
      const response = await ApiClient.delete(`/api/artwork/${artworkId}`, {
        user: user.id
      });
      return response.data; // 提取 data 字段
    } catch (error) {
      console.error('Delete artwork error:', error);
      throw new Error(error.message || '删除失败');
    }
  },

  /**
   * 更新作品（包括标题、提示词、展示状态等）
   * @param {string} artworkId - 作品ID
   * @param {Object} updates - 更新字段
   * @returns {Promise<Object>} 更新后的作品信息
   */
  async updateArtwork(artworkId, updates) {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('未登录');

    try {
      const response = await ApiClient.put(`/api/artwork/${artworkId}`, {
        ...updates,
        user: user.id
      });
      return response.data; // 提取 data 字段，与 uploadArtwork 保持一致
    } catch (error) {
      console.error('Update artwork error:', error);
      // 更详细的错误信息
      const errorMessage = error.message || (error.response?.error || '更新失败');
      throw new Error(errorMessage);
    }
  },

  /**
   * 获取合并的画廊集合（服务器作品 + 默认作品）
   * @param {Array} defaultCollection - 默认作品集合
   * @returns {Promise<Array>} 合并后的作品数组
   */
  async getCombinedCollection(defaultCollection) {
    try {
      const response = await ApiClient.get('/api/gallery');
      
      // 处理不同的响应格式
      let serverArtworks = [];
      
      if (Array.isArray(response)) {
        // 直接返回的是艺术作品数组
        serverArtworks = response;
      } else if (response.success && Array.isArray(response.data)) {
        // 返回的是 { success: true, data: [...] }
        serverArtworks = response.data;
      } else if (response.data && Array.isArray(response.data)) {
        // 返回的是 { data: [...] }
        serverArtworks = response.data;
      } else {
        console.error('Invalid response format from gallery API:', response);
        serverArtworks = [];
      }
      
      // 确保所有服务器返回的作品都有 inShowcase 字段
      const processedServerArtworks = serverArtworks.map(artwork => ({
        ...artwork,
        inShowcase: artwork.inShowcase !== undefined ? artwork.inShowcase : true
      }));
      
      // 合并服务器返回的作品和默认作品，确保不会重复
      const combinedArtworks = [...processedServerArtworks];
      
      // 添加默认作品中不存在于服务器返回的作品中的作品
      defaultCollection.forEach(defaultArtwork => {
        if (!combinedArtworks.some(serverArtwork => serverArtwork.id === defaultArtwork.id)) {
          combinedArtworks.push({
            ...defaultArtwork,
            inShowcase: defaultArtwork.inShowcase !== undefined ? defaultArtwork.inShowcase : true
          });
        }
      });
      
      return combinedArtworks;
    } catch (error) {
      console.error('Gallery fetch error:', error);
      return defaultCollection.map(artwork => ({
        ...artwork,
        id: artwork.id || `default_${artwork.title}`,
        inShowcase: artwork.inShowcase !== undefined ? artwork.inShowcase : true
      }));
    }
  }
};
