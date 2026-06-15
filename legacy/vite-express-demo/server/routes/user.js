// 用户路由 - 获取/更新用户信息
import express from 'express';
import { getDb, errorResponse, successResponse } from '../utils/db.js';

const router = express.Router();

// 获取用户信息
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDb();

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        const { password: _, ...userInfo } = user;
        res.json(successResponse(userInfo));
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json(errorResponse('获取用户信息失败：' + error.message));
    }
});

// 更新用户信息
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, oldPassword, newPassword, currentUserId } = req.body;

        if (userId !== currentUserId) {
            return res.status(403).json(errorResponse('无权修改他人信息'));
        }

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        // 更新密码
        if (newPassword) {
            if (!oldPassword || user.password !== oldPassword) {
                return res.status(401).json(errorResponse('原密码错误'));
            }
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, userId);
        }

        // 更新姓名
        if (name) {
            db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
        }

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const { password: _, ...userInfo } = updatedUser;
        res.json(successResponse(userInfo));
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json(errorResponse('更新用户信息失败：' + error.message));
    }
});

export default router;
