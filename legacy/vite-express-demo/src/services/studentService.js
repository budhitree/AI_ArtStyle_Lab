/**
 * Student Management Service
 * 提供学生管理功能的API调用服务
 */

export default class StudentService {
  static BASE_URL = '/api';

  /**
   * 获取所有学生（根据权限）
   */
  static async getAllStudents(userId, classId = null) {
    try {
      let url = `${this.BASE_URL}/students`;
      if (classId) {
        url += `?classId=${classId}&user=${userId}`;
      } else {
        url += `?user=${userId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '获取学生列表失败');
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新学生信息
   */
  static async updateStudent(studentId, updates, currentUserId) {
    try {
      const response = await fetch(`${this.BASE_URL}/student/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          user: currentUserId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '更新学生信息失败');
      }
    } catch (error) {
      console.error('更新学生信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除学生
   */
  static async deleteStudent(studentId, currentUserId) {
    try {
      const response = await fetch(`${this.BASE_URL}/student/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: currentUserId
        }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '删除学生失败');
      }
    } catch (error) {
      console.error('删除学生失败:', error);
      throw error;
    }
  }
}