// 认证路由 - 登录/注册
import express from 'express';
import { getDb, errorResponse, successResponse } from '../utils/db.js';

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        if (!userId || !password) {
            return res.status(400).json(errorResponse('需要账号和密码'));
        }

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(401).json(errorResponse('账号不存在'));
        }

        if (user.password !== password) {
            return res.status(401).json(errorResponse('密码错误'));
        }

        const { password: _, ...userInfo } = user;
        res.json(successResponse(userInfo));
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json(errorResponse('登录失败：' + error.message));
    }
});

// 注册
router.post('/register', async (req, res) => {
    try {
        const { userId, password, name, userType } = req.body;

        if (!userId || !password || !name || !userType) {
            return res.status(400).json(errorResponse('请填写完整信息'));
        }

        // 验证格式
        if (userType === 'student' && !/^\d{8}$/.test(userId)) {
            return res.status(400).json(errorResponse('学号格式错误，应为 8 位数字'));
        }
        if (userType === 'teacher' && !/^\d{7}$/.test(userId)) {
            return res.status(400).json(errorResponse('工号格式错误，应为 7 位数字'));
        }

        const db = getDb();

        // 检查用户是否已存在
        const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (existingUser) {
            return res.status(409).json(errorResponse('该账号已存在'));
        }

        // 插入新用户
        const insert = db.prepare(`
            INSERT INTO users (id, name, password, userType, joined)
            VALUES (?, ?, ?, ?, ?)
        `);
        insert.run(userId, name, password, userType, new Date().toISOString());

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const { password: _, ...userInfo } = user;
        res.json(successResponse(userInfo));
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json(errorResponse('注册失败：' + error.message));
    }
});

export default router;
