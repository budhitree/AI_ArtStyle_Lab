import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import aiService from './src/services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
fs.ensureDirSync(UPLOADS_DIR);
// Serve the 'public' folder so uploads are accessible 
// (Vite serves public in dev, but for our backend uploads we might want a specific route or just let Vite proxy handle it if we put them in public?)
// Actually, if we put files in `public/uploads`, Vite dev server will serve them if we access /uploads/...
// BUT, we are writing to `public/uploads` at runtime. Vite might not pick them up immediately without restart in some configs, but usually public is statically served.
// Let's rely on serving them statically via Express essentially if we were running prod, but in Dev, Vite handles public.
// However, since we are running the server alongside Vite, let's also serve them from here just in case, but usually we access via relative URL.
app.use('/uploads', express.static(UPLOADS_DIR));


// Database (JSON file)
const DB_FILE = path.join(__dirname, 'db.json');
if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { users: {}, artworks: [], exhibitions: [] });
} else {
    // Ensure the db structure has all required fields
    const db = fs.readJsonSync(DB_FILE);

    // Add missing top-level collections if they don't exist
    if (!db.users) db.users = {};
    if (!db.artworks) db.artworks = [];
    if (!db.exhibitions) db.exhibitions = [];

    // Ensure artwork objects have artistId
    for (const artwork of db.artworks) {
        if (!artwork.artistId) {
            // Try to infer artistId from artist field if it's in "type_id" format
            if (artwork.artist && artwork.artist.includes('_')) {
                const parts = artwork.artist.split('_');
                if (parts.length === 2) {
                    artwork.artistId = parts[1];
                }
            }
        }
    }

    fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
}

const readDb = async () => fs.readJson(DB_FILE);
const writeDb = async (data) => fs.writeJson(DB_FILE, data, { spaces: 2 });

// 统一响应格式辅助函数
const successResponse = (data) => ({ success: true, data });
const errorResponse = (error) => ({ success: false, error });

// Multer Setup
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

// Routes

// Login
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        return res.status(400).json(errorResponse('需要账号和密码'));
    }

    const db = await readDb();

    if (!db.users[userId]) {
        return res.status(401).json(errorResponse('账号不存在'));
    }

    const user = db.users[userId];

    if (user.password !== password) {
        return res.status(401).json(errorResponse('密码错误'));
    }

    const { password: _, ...userInfo } = user;
    res.json(successResponse(userInfo));
});

// Register
app.post('/api/register', async (req, res) => {
    const { userId, password, name, userType } = req.body;

    if (!userId || !password || !name || !userType) {
        return res.status(400).json(errorResponse('请填写完整信息'));
    }

    // 验证格式
    if (userType === 'student' && !/^\d{8}$/.test(userId)) {
        return res.status(400).json(errorResponse('学号格式错误，应为8位数字'));
    }
    if (userType === 'teacher' && !/^\d{7}$/.test(userId)) {
        return res.status(400).json(errorResponse('工号格式错误，应为7位数字'));
    }

    const db = await readDb();

    if (db.users[userId]) {
        return res.status(409).json(errorResponse('该账号已存在'));
    }

    db.users[userId] = {
        id: userId,
        name: name,
        userType: userType,
        password: password,
        joined: new Date().toISOString(),
        uploads: []
    };

    await writeDb(db);

    const { password: _, ...userInfo } = db.users[userId];
    res.json(successResponse(userInfo));
});

// Get user profile
app.get('/api/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const db = await readDb();

    if (!db.users[userId]) {
        return res.status(404).json(errorResponse('用户不存在'));
    }

    const { password: _, ...userInfo } = db.users[userId];
    res.json(successResponse(userInfo));
});

// Update user profile
app.put('/api/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, oldPassword, newPassword, currentUserId } = req.body;

    if (userId !== currentUserId) {
        return res.status(403).json(errorResponse('无权修改他人信息'));
    }

    const db = await readDb();

    if (!db.users[userId]) {
        return res.status(404).json(errorResponse('用户不存在'));
    }

    const user = db.users[userId];

    if (newPassword) {
        if (!oldPassword || user.password !== oldPassword) {
            return res.status(401).json(errorResponse('原密码错误'));
        }
        user.password = newPassword;
    }

    if (name) {
        user.name = name;
    }



    await writeDb(db);

    const { password: _, ...userInfo } = user;
    res.json(successResponse(userInfo));
});





// 学生管理API
// 获取所有学生（管理员）
app.get('/api/students', async (req, res) => {
    try {
        const { user: userId } = req.query;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        const user = db.users[userId];
        let students = [];

        if (user.userType === 'admin') {
            // 管理员可以看到所有学生
            for (const [id, userInfo] of Object.entries(db.users)) {
                if (userInfo.userType === 'student') {
                    const { password: _, ...studentInfo } = userInfo;
                    students.push({ id, ...studentInfo });
                }
            }
        } else {
            return res.status(403).json(errorResponse('无权查看学生列表'));
        }

        res.json(successResponse(students));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('获取学生列表失败'));
    }
});

// 更新学生信息（学生本人或管理员）
app.put('/api/student/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.users[id]) {
            return res.status(404).json(errorResponse('学生不存在'));
        }

        const requestingUser = db.users[userId];
        const targetStudent = db.users[id];

        // 验证权限：学生本人或管理员可以更新学生信息
        if (id !== userId && requestingUser.userType !== 'admin') {
            return res.status(403).json(errorResponse('无权修改他人信息'));
        }

        // 更新学生信息
        if (name) {
            targetStudent.name = name;
        }

        await writeDb(db);

        const { password: _, ...updatedStudent } = targetStudent;
        res.json(successResponse(updatedStudent));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('更新学生信息失败'));
    }
});

// 删除学生（管理员）
app.delete('/api/student/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.users[id]) {
            return res.status(404).json(errorResponse('学生不存在'));
        }

        const requestingUser = db.users[userId];
        const targetStudent = db.users[id];

        // 验证权限：只有管理员可以删除学生
        if (requestingUser.userType !== 'admin') {
            return res.status(403).json(errorResponse('无权删除学生'));
        }

        // 从数据库中删除学生
        delete db.users[id];

        // 从作品中移除与该学生关联的记录
        if (db.artworks) {
            db.artworks = db.artworks.filter(artwork => artwork.artistId !== id);
        }

        await writeDb(db);

        res.json(successResponse({ message: '学生已删除' }));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('删除学生失败'));
    }
});

// 展览管理API
// 获取所有展览
app.get('/api/exhibitions', async (req, res) => {
    try {
        const db = await readDb();
        const exhibitions = db.exhibitions || [];

        res.json(successResponse(exhibitions));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('获取展览列表失败'));
    }
});

// 获取特定展览
app.get('/api/exhibition/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await readDb();

        if (!db.exhibitions || !db.exhibitions.find(e => e.id === id)) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibition = db.exhibitions.find(e => e.id === id);

        res.json(successResponse(exhibition));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('获取展览信息失败'));
    }
});

// 创建展览（教师或管理员）
app.post('/api/exhibition', async (req, res) => {
    try {
        const { title, description, coverImage, user: userId } = req.body;

        if (!userId || !title) {
            return res.status(400).json(errorResponse('缺少必要参数'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        const user = db.users[userId];

        // 验证权限：只有教师或管理员可以创建展览
        if (user.userType !== 'teacher' && user.userType !== 'admin') {
            return res.status(403).json(errorResponse('无权创建展览'));
        }

        // 生成新的展览ID
        const exhibitionId = `ex${Date.now()}`;

        // 获取策展人信息
        const curator = user.name || `用户_${userId}`;

        // 创建新展览
        const newExhibition = {
            id: exhibitionId,
            title: title,
            description: description || '',
            curator: curator,
            curatorId: userId,
            artworks: [],
            coverImage: coverImage || '/public/images/default_exhibition_cover.png',
            status: 'draft', // 默认为草稿状态
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!db.exhibitions) {
            db.exhibitions = [];
        }

        db.exhibitions.push(newExhibition);

        await writeDb(db);

        res.json(successResponse(newExhibition));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('创建展览失败'));
    }
});

// 更新展览（展览创建者或管理员）
app.put('/api/exhibition/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, coverImage, status, artworks, user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.exhibitions) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibitionIndex = db.exhibitions.findIndex(e => e.id === id);

        if (exhibitionIndex === -1) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibition = db.exhibitions[exhibitionIndex];
        const user = db.users[userId];

        // 验证权限：只有管理员或展览创建者可以更新展览
        if (user.userType !== 'admin') {
            // 如果不是管理员，检查是否是展览创建者
            // 如果 exhibition.curatorId 不存在，允许教师用户编辑（兼容预设展览）
            if (exhibition.curatorId && exhibition.curatorId !== userId) {
                return res.status(403).json(errorResponse('无权更新此展览'));
            }
            // 如果是教师，允许编辑（兼容预设展览）
            if (user.userType !== 'teacher' && !exhibition.curatorId) {
                return res.status(403).json(errorResponse('无权更新此展览'));
            }
        }

        // 更新展览信息
        if (title) {
            exhibition.title = title;
        }
        if (description !== undefined) {
            exhibition.description = description;
        }
        if (coverImage) {
            exhibition.coverImage = coverImage;
        }
        if (status) {
            exhibition.status = status;
        }
        if (artworks !== undefined) {
            exhibition.artworks = artworks;
        }

        exhibition.updatedAt = new Date().toISOString();

        await writeDb(db);

        res.json(successResponse(exhibition));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('更新展览失败'));
    }
});

// 发布展览（展览创建者或管理员）
app.post('/api/exhibition/:id/publish', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.exhibitions) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibitionIndex = db.exhibitions.findIndex(e => e.id === id);

        if (exhibitionIndex === -1) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibition = db.exhibitions[exhibitionIndex];
        const user = db.users[userId];

        // 验证权限：只有管理员或展览创建者可以发布展览
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权发布此展览'));
        }

        // 更新展览状态为激活
        exhibition.status = 'active';
        exhibition.updatedAt = new Date().toISOString();

        await writeDb(db);

        res.json(successResponse(exhibition));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('发布展览失败'));
    }
});

// 删除展览（展览创建者或管理员）
app.delete('/api/exhibition/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.exhibitions) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibitionIndex = db.exhibitions.findIndex(e => e.id === id);

        if (exhibitionIndex === -1) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibition = db.exhibitions[exhibitionIndex];
        const user = db.users[userId];

        // 验证权限：只有管理员或展览创建者可以删除展览
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权删除此展览'));
        }

        // 从数据库中删除展览
        db.exhibitions.splice(exhibitionIndex, 1);

        await writeDb(db);

        res.json(successResponse({ message: '展览已删除' }));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('删除展览失败'));
    }
});

// 添加作品到展览（教师或管理员）
app.post('/api/exhibition/:id/artwork/:artworkId', async (req, res) => {
    try {
        const { id, artworkId } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.exhibitions) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibitionIndex = db.exhibitions.findIndex(e => e.id === id);

        if (exhibitionIndex === -1) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const artwork = db.artworks.find(a => a.id === artworkId);

        if (!artwork) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        const exhibition = db.exhibitions[exhibitionIndex];
        const user = db.users[userId];

        // 验证权限：只有管理员或展览创建者可以添加作品
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权向此展览添加作品'));
        }

        // 检查作品是否已经在展览中
        if (exhibition.artworks.includes(artworkId)) {
            return res.status(409).json(errorResponse('作品已在展览中'));
        }

        // 添加作品到展览
        exhibition.artworks.push(artworkId);

        await writeDb(db);

        res.json(successResponse(exhibition));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('添加作品到展览失败'));
    }
});

// 从展览移除作品（教师或管理员）
app.delete('/api/exhibition/:id/artwork/:artworkId', async (req, res) => {
    try {
        const { id, artworkId } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();

        if (!db.users[userId]) {
            return res.status(404).json(errorResponse('用户不存在'));
        }

        if (!db.exhibitions) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibitionIndex = db.exhibitions.findIndex(e => e.id === id);

        if (exhibitionIndex === -1) {
            return res.status(404).json(errorResponse('展览不存在'));
        }

        const exhibition = db.exhibitions[exhibitionIndex];
        const user = db.users[userId];

        // 验证权限：只有管理员或展览创建者可以从展览移除作品
        if (user.userType !== 'admin' && exhibition.curatorId !== userId) {
            return res.status(403).json(errorResponse('无权从此展览移除作品'));
        }

        // 从展览中移除作品
        exhibition.artworks = exhibition.artworks.filter(aId => aId !== artworkId);

        await writeDb(db);

        res.json(successResponse(exhibition));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('从展览移除作品失败'));
    }
});

// Upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        const { title, prompt, desc, user: userId, addToGallery } = req.body;
        const file = req.file;

        if (!file || !userId) {
            return res.status(400).json(errorResponse('缺少文件或用户ID'));
        }

        const db = await readDb();

        // Construct public URL
        const imageUrl = `/uploads/${file.filename}`;

        // 获取用户真实姓名
        const user = db.users[userId];
        const displayName = user ? user.name : `Unknown_${userId}`;

        // 作品默认进入画廊，除非明确选择不加入
        const inShowcaseValue = addToGallery !== 'false' && addToGallery !== '0';

        const newArt = {
            id: Date.now().toString(),
            title: title || 'Untitled',
            artist: displayName,
            artistId: userId, // 存储用户ID以便正确验证权限
            desc: desc || "Student Submission",
            image: imageUrl,
            prompt: prompt,
            uploadedAt: new Date().toISOString(),
            inShowcase: inShowcaseValue
        };

        db.artworks.push(newArt);

        // Also update user record
        if (db.users[userId]) {
            if (!db.users[userId].uploads) db.users[userId].uploads = [];
            db.users[userId].uploads.push(newArt.id);
        }

        await writeDb(db);

        res.json(successResponse(newArt));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('上传失败'));
    }
});

// Gallery (Combined)
app.get('/api/gallery', async (req, res) => {
    try {
        const db = await readDb();

        // 对于没有 artistId 的旧数据，我们需要尝试从 artist 字段解析出用户ID
        // 并确保所有作品都有 inShowcase 字段
        const processedArtworks = db.artworks.map(artwork => {
            if (!artwork.artistId && artwork.artist && artwork.artist.includes('_')) {
                // 尝试从 "Type_ID" 格式的 artist 字段中提取 ID
                const parts = artwork.artist.split('_');
                if (parts.length === 2) {
                    return {
                        ...artwork,
                        artistId: parts[1],
                        // 使用实际用户名替换原来的 "Type_ID" 格式
                        artist: db.users[parts[1]] ? db.users[parts[1]].name : artwork.artist,
                        // 确保作品有 inShowcase 字段（默认为true）
                        inShowcase: artwork.inShowcase !== undefined ? artwork.inShowcase : true
                    };
                }
            }

            // 对于已有 artistId 的作品，确保有 inShowcase 字段
            return {
                ...artwork,
                inShowcase: artwork.inShowcase !== undefined ? artwork.inShowcase : true
            };
        });

        // Return mostly newest first
        res.json(successResponse(processedArtworks.reverse()));
    } catch (err) {
        console.error('Gallery fetch error:', err);
        res.status(500).json(errorResponse('获取画廊失败'));
    }
});

// Update artwork
app.put('/api/artwork/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, prompt, desc, inShowcase, user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();
        const artworkIndex = db.artworks.findIndex(art => art.id === id);

        if (artworkIndex === -1) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        const artwork = db.artworks[artworkIndex];

        // 验证权限：作者或管理员可以更新
        const isAdmin = userId === 'admin';
        const isOwner = artwork.artistId === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json(errorResponse('无权更新此作品'));
        }

        // 更新作品信息
        if (title) {
            artwork.title = title;
        }
        if (prompt !== undefined) {
            artwork.prompt = prompt;
        }
        if (desc !== undefined) {
            artwork.desc = desc;
        }
        if (inShowcase !== undefined) {
            // 确保 inShowcase 是布尔值
            artwork.inShowcase = Boolean(inShowcase);
        }

        await writeDb(db);

        res.json(successResponse(artwork));
    } catch (err) {
        console.error('Update artwork error:', err);
        // 确保始终返回JSON格式
        res.status(500).json(errorResponse('更新失败'));
    }
});

// Get artwork by ID
app.get('/api/artwork/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const db = await readDb();
        const artwork = db.artworks.find(art => art.id === id);

        if (!artwork) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        res.json(successResponse(artwork));
    } catch (err) {
        console.error(err);
        res.status(500).json(errorResponse('获取作品失败'));
    }
});

// Delete artwork
app.delete('/api/artwork/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user: userId } = req.body;

        if (!userId) {
            return res.status(401).json(errorResponse('未登录'));
        }

        const db = await readDb();
        const artworkIndex = db.artworks.findIndex(art => art.id === id);

        if (artworkIndex === -1) {
            return res.status(404).json(errorResponse('作品不存在'));
        }

        const artwork = db.artworks[artworkIndex];

        // 验证权限：作者或管理员可以删除
        const isAdmin = userId === 'admin';
        const isOwner = artwork.artistId === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json(errorResponse('无权删除此作品'));
        }

        // 删除作品
        db.artworks.splice(artworkIndex, 1);

        // 从用户的上传记录中删除
        if (db.users[userId]) {
            if (db.users[userId].uploads) {
                db.users[userId].uploads = db.users[userId].uploads.filter(artId => artId !== id);
            }
        }

        await writeDb(db);

        res.json(successResponse({ message: '作品删除成功' }));
    } catch (err) {
        console.error('Delete artwork error:', err);
        // 确保始终返回JSON格式
        res.status(500).json(errorResponse('删除失败'));
    }
});

// 获取所有学生列表（仅管理员）
app.get('/api/students', async (req, res) => {
    try {
        const db = await readDb();
        const students = Object.keys(db.users).filter(id => id !== 'admin').map(id => ({
            id: id,
            name: db.users[id].name
        }));
        res.json(successResponse(students));
    } catch (err) {
        res.status(500).json(errorResponse('获取学生列表失败'));
    }
});

// AI生成接口
app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, options = {} } = req.body;

        if (!prompt) {
            return res.status(400).json(errorResponse('缺少提示词'));
        }

        if (!aiService.isEnabled()) {
            return res.status(503).json(errorResponse('AI服务未配置，请在 .env 文件中配置 VOLC_API_KEY'));
        }

        // 使用文生图接口
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
        console.error('AI生成错误:', error);
        res.status(500).json(errorResponse(error.message || '生成失败'));
    }
});

// AI生成图片保存到图库
app.post('/api/ai/save-to-gallery', async (req, res) => {
    try {
        const { imageIds, title, prompt, user: userId, imageUrls } = req.body;

        if (!userId) {
            return res.status(400).json(errorResponse('未登录'));
        }

        if (!imageIds || imageIds.length === 0) {
            return res.status(400).json(errorResponse('未选择图片'));
        }

        const db = await readDb();
        const savedArtworks = [];

        for (const imageId of imageIds) {
            const imageUrl = imageUrls[imageId];
            if (!imageUrl) continue;

            // 下载图片到本地
            const filename = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            const localPath = path.join(UPLOADS_DIR, filename);

            try {
                await aiService.downloadImage(imageUrl, localPath);
                const localUrl = `/uploads/${filename}`;

                // 保存到数据库
                const user = db.users[userId];
                const displayName = user ? user.name : `Unknown_${userId}`;

                const newArt = {
                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                    title: title || 'AI生成作品',
                    artist: displayName,
                    artistId: userId, // 存储用户ID以便正确验证权限
                    desc: "AI Generated Art",
                    image: localUrl,
                    prompt: prompt,
                    uploadedAt: new Date().toISOString()
                };

                db.artworks.push(newArt);

                // 更新用户记录
                if (db.users[userId]) {
                    if (!db.users[userId].uploads) db.users[userId].uploads = [];
                    db.users[userId].uploads.push(newArt.id);
                }

                savedArtworks.push(newArt);
            } catch (downloadError) {
                console.error(`下载图片失败 ${imageId}:`, downloadError);
                // 继续处理其他图片
                continue;
            }
        }

        if (savedArtworks.length === 0) {
            return res.status(500).json(errorResponse('保存失败，所有图片都无法下载'));
        }

        await writeDb(db);

        res.json(successResponse({
            message: `成功保存 ${savedArtworks.length} 张作品到图库`,
            artworks: savedArtworks
        }));
    } catch (error) {
        console.error('保存AI作品错误:', error);
        res.status(500).json(errorResponse(error.message || '保存失败'));
    }
});

// 获取用户作品列表
app.get('/api/works', async (req, res) => {
    try {
        const { userId, category } = req.query;

        console.log('Received /api/works request:', { userId, category });

        if (!userId) {
            return res.status(400).json(errorResponse('缺少用户ID'));
        }

        const db = await readDb();
        
        // 过滤出指定用户的作品
        let userWorks = db.artworks.filter(artwork => artwork.artistId === userId);
        console.log('Filtered works by userId:', userWorks.length);
        
        // 如果指定了类别，进一步过滤
        if (category) {
            userWorks = userWorks.filter(artwork => {
                // 对于AI生成的作品，我们可以通过是否有prompt字段来判断
                if (category === 'AI生成') {
                    return artwork.prompt !== undefined;
                }
                return true;
            });
            console.log('Filtered works by category:', userWorks.length);
        }
        
        // 转换为前端期望的格式
        const formattedWorks = userWorks.map(work => ({
            id: work.id,
            url: work.image,
            title: work.title,
            prompt: work.prompt,
            createdAt: work.uploadedAt
        }));

        console.log('Returning works:', formattedWorks);
        res.json(successResponse(formattedWorks));
    } catch (error) {
        console.error('获取用户作品失败:', error);
        res.status(500).json(errorResponse(error.message || '获取作品失败'));
    }
});

// 纯后端API服务，不提供前端文件
// 只提供上传文件的静态访问
app.use('/uploads', express.static(UPLOADS_DIR));

// 根路径返回API信息
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AI ArtStyle Lab API Server',
        version: '1.0.0',
        endpoints: {
            auth: '/api/login, /api/register',
            gallery: '/api/gallery, /api/artwork/:id',
            exhibitions: '/api/exhibitions, /api/exhibition/:id',
            upload: '/api/upload',
            ai: '/api/ai/generate'
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`网络访问: http://0.0.0.0:${PORT}`);
    if (aiService.isEnabled()) {
        console.log('✅ AI 服务已启用 (Seedream 4.5)');
    } else {
        console.log('⚠️  AI生成功能未配置，请在 .env 中设置 VOLC_API_KEY');
    }
});
