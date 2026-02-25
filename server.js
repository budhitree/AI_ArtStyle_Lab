// AI ArtStyle Lab - 主服务器文件
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './server/utils/db.js';

// 导入路由
import authRouter from './server/routes/auth.js';
import userRouter from './server/routes/user.js';
import artworkRouter from './server/routes/artwork.js';
import exhibitionRouter from './server/routes/exhibition.js';
import aiRouter from './server/routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库
initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的图片）
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
fs.ensureDirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

// 使用路由（注意顺序：具体路由在前，动态路由在后）
app.use('/api', authRouter);              // /api/login, /api/register
app.use('/api/user', userRouter);         // /api/user/:userId
app.use('/api/gallery', artworkRouter);   // /api/gallery, /api/gallery/:id, /api/gallery/upload
app.use('/api/artwork', artworkRouter);   // 兼容旧版前端：/api/artwork/:id
app.use('/api/exhibitions', exhibitionRouter);  // /api/exhibitions, /api/exhibitions/:id
app.use('/api/ai', aiRouter);             // /api/ai/generate, /api/ai/save-to-gallery

// 兼容旧版前端：/api/works?userId=xxx
app.get('/api/works', async (req, res) => {
    try {
        const { userId } = req.query;
        const { readDb, errorResponse, successResponse } = await import('./server/utils/db.js');

        const db = await readDb();
        let artworks = db.artworks || [];

        // 如果指定了 userId，只返回该用户的作品
        if (userId) {
            artworks = artworks.filter(art => art.artistId === userId);
        }

        // 处理数据格式
        const processedArtworks = artworks.map(artwork => {
            if (!artwork.artistId && artwork.artist && artwork.artist.includes('_')) {
                const parts = artwork.artist.split('_');
                if (parts.length === 2) {
                    return {
                        ...artwork,
                        artistId: parts[1],
                        artist: db.users[parts[1]] ? db.users[parts[1]].name : artwork.artist,
                        inShowcase: artwork.inShowcase !== undefined ? artwork.inShowcase : true
                    };
                }
            }
            return {
                ...artwork,
                inShowcase: artwork.inShowcase !== undefined ? artwork.inShowcase : true
            };
        });

        res.json(successResponse(processedArtworks.reverse()));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('获取作品失败'));
    }
});

// 学生管理路由
app.get('/api/students', async (req, res) => {
    try {
        const { user: userId } = req.query;
        const { getDb, errorResponse, successResponse } = await import('./server/utils/db.js');

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        let students = [];
        if (user.userType === 'admin') {
            const studentRows = db.prepare("SELECT * FROM users WHERE userType = 'student'").all();
            students = studentRows.map(s => {
                const { password: _, ...studentInfo } = s;
                return { id: s.id, ...studentInfo };
            });
        } else {
            return res.status(403).json(errorResponse('无权查看学生列表'));
        }

        res.json(successResponse(students));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('获取学生列表失败'));
    }
});

app.put('/api/student/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, user: userId } = req.body;
        const { getDb, errorResponse, successResponse } = await import('./server/utils/db.js');

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const requestingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const targetStudent = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        if (!requestingUser || !targetStudent) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (id !== userId && requestingUser.userType !== 'admin') {
            return res.status(403).json(errorResponse('无权修改他人信息'));
        }

        if (name) {
            db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
        }

        const updatedStudent = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        const { password: _, ...studentInfo } = updatedStudent;
        res.json(successResponse({ id: id, ...studentInfo }));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('更新学生信息失败'));
    }
});

app.delete('/api/student/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;
        const { getDb, errorResponse, successResponse } = await import('./server/utils/db.js');

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = getDb();
        const requestingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const targetStudent = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        if (!requestingUser || !targetStudent) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (requestingUser.userType !== 'admin') {
            return res.status(403).json(errorResponse('无权删除学生'));
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json(successResponse({ message: '学生已删除' }));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('删除学生失败'));
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║     AI ArtStyle Lab - Backend Server          ║
╠═══════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}       ║
║  API Endpoints:                               ║
║    - /api/login, /api/register                ║
║    - /api/user/:userId                        ║
║    - /api/gallery, /api/gallery/upload        ║
║    - /api/exhibitions                         ║
║    - /api/ai/generate                         ║
╚═══════════════════════════════════════════════╝
    `);
});
