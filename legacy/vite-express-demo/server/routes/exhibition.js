// 展览路由 - 展览管理
import express from 'express';
import { getDb, errorResponse, successResponse } from '../utils/db.js';

const router = express.Router();

// 获取所有展览
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const exhibitions = db.prepare('SELECT * FROM exhibitions ORDER BY createdAt DESC').all();

        // 为每个展览添加作品数量
        const exhibitionsWithCount = exhibitions.map(exhibition => {
            const count = db.prepare(
                'SELECT COUNT(*) as count FROM exhibition_artworks WHERE exhibitionId = ?'
            ).get(exhibition.id);
            return {
                ...exhibition,
                artworkCount: count.count,
                artworks: db.prepare(
                    'SELECT artworkId FROM exhibition_artworks WHERE exhibitionId = ?'
                ).all(exhibition.id).map(rel => rel.artworkId)
            };
        });

        res.json(successResponse(exhibitionsWithCount));
    } catch (error) {
        console.error('获取展览列表错误:', error);
        res.status(500).json(errorResponse('获取展览列表失败：' + error.message));
    }
});

// 获取单个展览
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);

        if (!exhibition) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const artworks = db.prepare(
            'SELECT artworkId FROM exhibition_artworks WHERE exhibitionId = ?'
        ).all(id).map(rel => rel.artworkId);

        res.json(successResponse({
            ...exhibition,
            artworks
        }));
    } catch (error) {
        console.error('获取展览信息错误:', error);
        res.status(500).json(errorResponse('获取展览信息失败：' + error.message));
    }
});

// 创建展览
router.post('/', async (req, res) => {
    try {
        const { title, description, coverImage, user: userId } = req.body;

        if (!userId || !title) {
            return res.status(400).json(errorResponse('缺少必要参数'));
        }

        const db = getDb();

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (user.userType !== 'teacher' && user.userType !== 'admin') {
            return res.status(403).json(errorResponse('无权创建展览'));
        }

        const exhibitionId = `ex${Date.now()}`;
        const curator = user.name;

        const insert = db.prepare(`
            INSERT INTO exhibitions (id, title, description, curator, curatorId, coverImage, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        `);
        insert.run(
            exhibitionId, title, description || '', curator, userId,
            coverImage || '/public/images/default_exhibition_cover.png',
            new Date().toISOString(), new Date().toISOString()
        );

        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(exhibitionId);
        res.json(successResponse({
            ...exhibition,
            artworks: []
        }));
    } catch (error) {
        console.error('创建展览错误:', error);
        res.status(500).json(errorResponse('创建展览失败：' + error.message));
    }
});

// 更新展览
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, coverImage, status, artworks, user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);

        if (!exhibition) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权更新此展览'));
        }

        // 更新展览信息
        const updates = [];
        const values = [];
        if (title) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (coverImage) { updates.push('coverImage = ?'); values.push(coverImage); }
        if (status) { updates.push('status = ?'); values.push(status); }
        
        if (updates.length > 0) {
            updates.push('updatedAt = ?');
            values.push(new Date().toISOString());
            values.push(id);
            db.prepare(`UPDATE exhibitions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        // 更新作品关联
        if (artworks !== undefined) {
            // 删除旧的关联
            db.prepare('DELETE FROM exhibition_artworks WHERE exhibitionId = ?').run(id);
            
            // 添加新的关联
            const insertArtwork = db.prepare(
                'INSERT INTO exhibition_artworks (exhibitionId, artworkId, addedAt) VALUES (?, ?, ?)'
            );
            const now = new Date().toISOString();
            for (const artworkId of artworks) {
                insertArtwork.run(id, artworkId, now);
            }
        }

        const updatedExhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);
        const artworkList = db.prepare(
            'SELECT artworkId FROM exhibition_artworks WHERE exhibitionId = ?'
        ).all(id).map(rel => rel.artworkId);

        res.json(successResponse({
            ...updatedExhibition,
            artworks: artworkList
        }));
    } catch (error) {
        console.error('更新展览错误:', error);
        res.status(500).json(errorResponse('更新展览失败：' + error.message));
    }
});

// 发布展览
router.post('/:id/publish', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);

        if (!exhibition) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权发布此展览'));
        }

        db.prepare("UPDATE exhibitions SET status = 'active', updatedAt = ? WHERE id = ?")
            .run(new Date().toISOString(), id);

        const updatedExhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);
        res.json(successResponse(updatedExhibition));
    } catch (error) {
        console.error('发布展览错误:', error);
        res.status(500).json(errorResponse('发布展览失败：' + error.message));
    }
});

// 删除展览
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);

        if (!exhibition) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权删除此展览'));
        }

        db.prepare('DELETE FROM exhibitions WHERE id = ?').run(id);
        res.json(successResponse({ message: '展览已删除' }));
    } catch (error) {
        console.error('删除展览错误:', error);
        res.status(500).json(errorResponse('删除展览失败：' + error.message));
    }
});

// 添加作品到展览
router.post('/:id/artwork/:artworkId', async (req, res) => {
    try {
        const { id, artworkId } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);

        if (!exhibition) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(artworkId);
        if (!artwork) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权向此展览添加作品'));
        }

        // 检查作品是否已在展览中
        const existing = db.prepare(
            'SELECT * FROM exhibition_artworks WHERE exhibitionId = ? AND artworkId = ?'
        ).get(id, artworkId);

        if (existing) {
            return res.status(409).json(errorResponse('作品已在展览中'));
        }

        db.prepare(
            'INSERT INTO exhibition_artworks (exhibitionId, artworkId, addedAt) VALUES (?, ?, ?)'
        ).run(id, artworkId, new Date().toISOString());

        res.json(successResponse(exhibition));
    } catch (error) {
        console.error('添加作品到展览错误:', error);
        res.status(500).json(errorResponse('添加作品到展览失败：' + error.message));
    }
});

// 从展览移除作品
router.delete('/:id/artwork/:artworkId', async (req, res) => {
    try {
        const { id, artworkId } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const exhibition = db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);

        if (!exhibition) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权从此展览移除作品'));
        }

        db.prepare(
            'DELETE FROM exhibition_artworks WHERE exhibitionId = ? AND artworkId = ?'
        ).run(id, artworkId);

        res.json(successResponse(exhibition));
    } catch (error) {
        console.error('从展览移除作品错误:', error);
        res.status(500).json(errorResponse('从展览移除作品失败：' + error.message));
    }
});

export default router;
