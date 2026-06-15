/**
 * Exhibition Management Service
 * 提供展览管理功能的API调用服务
 */

export default class ExhibitionService {
  static BASE_URL = '/api';

  /**
   * 获取所有展览
   */
  static async getAllExhibitions() {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibitions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '获取展览列表失败');
      }
    } catch (error) {
      console.error('获取展览列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定展览
   */
  static async getExhibition(exhibitionId) {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibition/${exhibitionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '获取展览信息失败');
      }
    } catch (error) {
      console.error('获取展览信息失败:', error);
      throw error;
    }
  }

  /**
   * 创建新展览
   */
  static async createExhibition(title, description, coverImage, userId) {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          description: description,
          coverImage: coverImage,
          user: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '创建展览失败');
      }
    } catch (error) {
      console.error('创建展览失败:', error);
      throw error;
    }
  }

  /**
   * 更新展览
   */
  static async updateExhibition(exhibitionId, updates, userId) {
    try {
      console.log('ExhibitionService.updateExhibition 调用:', {
        exhibitionId,
        updates,
        userId
      });

      const response = await fetch(`${this.BASE_URL}/exhibition/${exhibitionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          user: userId
        }),
      });

      console.log('更新展览响应状态:', response.status);

      const result = await response.json();
      console.log('更新展览响应数据:', result);

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '更新展览失败');
      }
    } catch (error) {
      console.error('更新展览失败:', error);
      throw error;
    }
  }

  /**
   * 发布展览
   */
  static async publishExhibition(exhibitionId, userId) {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibition/${exhibitionId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '发布展览失败');
      }
    } catch (error) {
      console.error('发布展览失败:', error);
      throw error;
    }
  }

  /**
   * 删除展览
   */
  static async deleteExhibition(exhibitionId, userId) {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibition/${exhibitionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '删除展览失败');
      }
    } catch (error) {
      console.error('删除展览失败:', error);
      throw error;
    }
  }

  /**
   * 添加作品到展览
   */
  static async addArtworkToExhibition(exhibitionId, artworkId, userId) {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibition/${exhibitionId}/artwork/${artworkId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '添加作品到展览失败');
      }
    } catch (error) {
      console.error('添加作品到展览失败:', error);
      throw error;
    }
  }

  /**
   * 从展览移除作品
   */
  static async removeArtworkFromExhibition(exhibitionId, artworkId, userId) {
    try {
      const response = await fetch(`${this.BASE_URL}/exhibition/${exhibitionId}/artwork/${artworkId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '从展览移除作品失败');
      }
    } catch (error) {
      console.error('从展览移除作品失败:', error);
      throw error;
    }
  }
}