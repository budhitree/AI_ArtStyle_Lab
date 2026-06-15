// AI 路由 - AI 图像生成
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import aiService from '../../src/services/aiService.js';
import { getDb, errorResponse, successResponse } from '../utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 频率限制配置
const rateLimitStore = {};
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

// AI 生成接口
router.post('/generate', async (req, res) => {
    try {
        const { prompt, options = {} } = req.body;
        const userId = req.body.user;

        if (!prompt) {
            return res.status(400).json(errorResponse('缺少提示词'));
        }

        // 频率限制检查
        if (userId) {
            const now = Date.now();
            if (!rateLimitStore[userId]) {
                rateLimitStore[userId] = { count: 0, startTime: now };
            }

            const userLimit = rateLimitStore[userId];
            if (now - userLimit.startTime > RATE_LIMIT_WINDOW) {
                userLimit.count = 0;
                userLimit.startTime = now;
            }

            if (userLimit.count >= RATE_LIMIT_MAX) {
                return res.status(429).json(errorResponse('请求过于频繁，请稍后再试（1 分钟最多 10 次）'));
            }

            userLimit.count++;
        }

        if (!aiService.isEnabled()) {
            return res.status(503).json(errorResponse('AI 服务未配置，请在 .env 文件中配置 VOLC_API_KEY'));
        }

        const images = await aiService.textToImage(prompt, {
            size: options.scale || '2048x2048',
            model: 'doubao-seedream-4.5',
            responseFormat: 'url',
            watermark: false,
        });

        res.json(successResponse({
            images: images,
            prompt: prompt,
        }));
    } catch (error) {
        console.error('AI 生成错误:', error);
        res.status(500).json(errorResponse(error.message || '生成失败'));
    }
});

// AI 生成图片保存到图库
router.post('/save-to-gallery', async (req, res) => {
    try {
        const { imageIds, title, prompt, user: userId, imageUrls } = req.body;

        if (!userId) {
            return res.status(400).json(errorResponse('未登录'));
        }

        if (!imageIds || imageIds.length === 0) {
            return res.status(400).json(errorResponse('未选择图片'));
        }

        const db = getDb();
        const savedArtworks = [];
        const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

        // 获取用户信息
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const displayName = user ? user.name : `Unknown_${userId}`;

        const insertArtwork = db.prepare(`
            INSERT INTO artworks (id, title, artist, artistId, desc, image, prompt, uploadedAt, inShowcase, isAIGenerated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertUpload = db.prepare(`
            INSERT INTO user_uploads (userId, artworkId, uploadedAt)
            VALUES (?, ?, ?)
        `);

        for (const imageId of imageIds) {
            const imageUrl = imageUrls[imageId];
            if (!imageUrl) continue;

            const filename = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            const localPath = path.join(UPLOADS_DIR, filename);

            try {
                await aiService.downloadImage(imageUrl, localPath);
                const localUrl = `/uploads/${filename}`;

                const artworkId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
                const now = new Date().toISOString();

                insertArtwork.run(
                    artworkId,
                    title || 'AI 生成作品',
                    displayName,
                    userId,
                    "AI Generated Art",
                    localUrl,
                    prompt,
                    now,
                    1,
                    1
                );

                insertUpload.run(userId, artworkId, now);

                savedArtworks.push({
                    id: artworkId,
                    title: title || 'AI 生成作品',
                    image: localUrl,
                    prompt: prompt
                });
            } catch (err) {
                console.error('保存图片失败:', err);
            }
        }

        res.json(successResponse({
            message: `成功保存 ${savedArtworks.length} 张作品`,
            artworks: savedArtworks
        }));
    } catch (error) {
        console.error('保存失败:', error);
        res.status(500).json(errorResponse(error.message || '保存失败'));
    }
});

export default router;
