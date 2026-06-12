// 作品路由 - 上传/获取/更新/删除作品
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, errorResponse, successResponse } from '../utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer 设置
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage });

// ===== 路由顺序：具体路由在前，动态路由在后 =====

// 上传作品
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const { title, prompt, desc, user: userId, addToGallery } = req.body;
        const file = req.file;

        if (!file || !userId) {
            return res.status(400).json(errorResponse('缺少文件或用户 ID'));
        }

        const db = getDb();

        // 验证用户是否存在
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        const imageUrl = `/uploads/${file.filename}`;
        const displayName = user.name;
        const inShowcaseValue = addToGallery !== 'false' && addToGallery !== '0';

        const newArt = {
            id: Date.now().toString(),
            title: title || 'Untitled',
            artist: displayName,
            artistId: userId,
            desc: desc || "Student Submission",
            image: imageUrl,
            prompt: prompt,
            uploadedAt: new Date().toISOString(),
            inShowcase: inShowcaseValue ? 1 : 0
        };

        // 插入作品
        const insert = db.prepare(`
            INSERT INTO artworks (id, title, artist, artistId, desc, image, prompt, uploadedAt, inShowcase)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insert.run(
            newArt.id, newArt.title, newArt.artist, newArt.artistId,
            newArt.desc, newArt.image, newArt.prompt, newArt.uploadedAt, newArt.inShowcase
        );

        // 记录用户作品关联
        const insertUpload = db.prepare(`
            INSERT INTO user_uploads (userId, artworkId, uploadedAt)
            VALUES (?, ?, ?)
        `);
        insertUpload.run(userId, newArt.id, newArt.uploadedAt);

        res.json(successResponse(newArt));
    } catch (error) {
        console.error('上传作品错误:', error);
        res.status(500).json(errorResponse('上传失败：' + error.message));
    }
});

// 获取所有作品
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const artworks = db.prepare('SELECT * FROM artworks ORDER BY uploadedAt DESC').all();

        const processedArtworks = artworks.map(artwork => ({
            ...artwork,
            inShowcase: artwork.inShowcase !== 0
        }));

        res.json(successResponse(processedArtworks));
    } catch (error) {
        console.error('获取作品列表错误:', error);
        res.status(500).json(errorResponse('获取作品列表失败：' + error.message));
    }
});

// 获取单个作品
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);

        if (!artwork) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        res.json(successResponse({
            ...artwork,
            inShowcase: artwork.inShowcase !== 0
        }));
    } catch (error) {
        console.error('获取作品错误:', error);
        res.status(500).json(errorResponse('获取作品失败：' + error.message));
    }
});

// 更新作品
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, prompt, desc, inShowcase, user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);

        if (!artwork) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        // 验证权限
        const isAdmin = userId === 'admin';
        const isOwner = artwork.artistId === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json(errorResponse('无权更新此作品'));
        }

        // 更新作品
        const updates = [];
        const values = [];
        if (title) { updates.push('title = ?'); values.push(title); }
        if (prompt !== undefined) { updates.push('prompt = ?'); values.push(prompt); }
        if (desc !== undefined) { updates.push('desc = ?'); values.push(desc); }
        if (inShowcase !== undefined) { updates.push('inShowcase = ?'); values.push(inShowcase ? 1 : 0); }

        if (updates.length > 0) {
            values.push(id);
            db.prepare(`UPDATE artworks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        const updatedArtwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
        res.json(successResponse({
            ...updatedArtwork,
            inShowcase: updatedArtwork.inShowcase !== 0
        }));
    } catch (error) {
        console.error('更新作品错误:', error);
        res.status(500).json(errorResponse('更新失败：' + error.message));
    }
});

// 删除作品
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);

        if (!artwork) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        // 验证权限
        const isAdmin = userId === 'admin';
        const isOwner = artwork.artistId === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json(errorResponse('无权删除此作品'));
        }

        // 删除作品（外键会自动删除关联记录）
        db.prepare('DELETE FROM artworks WHERE id = ?').run(id);

        res.json(successResponse({ message: '作品已删除' }));
    } catch (error) {
        console.error('删除作品错误:', error);
        res.status(500).json(errorResponse('删除失败：' + error.message));
    }
});

export default router;
