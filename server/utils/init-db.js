// 数据库初始化脚本
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'artstyle.db');

// 确保 data 目录存在
fs.ensureDirSync(path.dirname(DB_PATH));

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用外键支持
db.pragma('foreign_keys = ON');

// 创建表结构
console.log('正在创建数据库表...');

// 用户表
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        userType TEXT NOT NULL CHECK(userType IN ('student', 'teacher', 'admin')),
        joined TEXT DEFAULT (datetime('now')),
        avatar TEXT
    )
`);
console.log('✓ 用户表已创建');

// 作品表
db.exec(`
    CREATE TABLE IF NOT EXISTS artworks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        artistId TEXT NOT NULL,
        desc TEXT,
        image TEXT NOT NULL,
        prompt TEXT,
        uploadedAt TEXT DEFAULT (datetime('now')),
        inShowcase INTEGER DEFAULT 1,
        isAIGenerated INTEGER DEFAULT 0,
        FOREIGN KEY (artistId) REFERENCES users(id) ON DELETE CASCADE
    )
`);
console.log('✓ 作品表已创建');

// 展览表
db.exec(`
    CREATE TABLE IF NOT EXISTS exhibitions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        curator TEXT,
        curatorId TEXT NOT NULL,
        coverImage TEXT,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'archived')),
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT,
        FOREIGN KEY (curatorId) REFERENCES users(id) ON DELETE CASCADE
    )
`);
console.log('✓ 展览表已创建');

// 展览作品关联表
db.exec(`
    CREATE TABLE IF NOT EXISTS exhibition_artworks (
        exhibitionId TEXT NOT NULL,
        artworkId TEXT NOT NULL,
        addedAt TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (exhibitionId, artworkId),
        FOREIGN KEY (exhibitionId) REFERENCES exhibitions(id) ON DELETE CASCADE,
        FOREIGN KEY (artworkId) REFERENCES artworks(id) ON DELETE CASCADE
    )
`);
console.log('✓ 展览作品关联表已创建');

// 用户作品关联表（记录用户上传的作品）
db.exec(`
    CREATE TABLE IF NOT EXISTS user_uploads (
        userId TEXT NOT NULL,
        artworkId TEXT NOT NULL,
        uploadedAt TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (userId, artworkId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (artworkId) REFERENCES artworks(id) ON DELETE CASCADE
    )
`);
console.log('✓ 用户作品关联表已创建');

// 创建索引（提高查询速度）
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artworks_artistId ON artworks(artistId);
    CREATE INDEX IF NOT EXISTS idx_artworks_inShowcase ON artworks(inShowcase);
    CREATE INDEX IF NOT EXISTS idx_exhibitions_curatorId ON exhibitions(curatorId);
    CREATE INDEX IF NOT EXISTS idx_exhibitions_status ON exhibitions(status);
`);
console.log('✓ 索引已创建');

// 从 JSON 数据库迁移数据（如果存在）
const JSON_DB_PATH = path.join(__dirname, '..', '..', 'db.json');
if (fs.existsSync(JSON_DB_PATH)) {
    console.log('\n正在从 JSON 数据库迁移数据...');
    const jsonData = fs.readJsonSync(JSON_DB_PATH);

    // 迁移用户
    if (jsonData.users) {
        const insertUser = db.prepare(`
            INSERT OR REPLACE INTO users (id, name, password, userType, joined, avatar)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        let userCount = 0;
        for (const [id, user] of Object.entries(jsonData.users)) {
            insertUser.run(id, user.name, user.password, user.userType, user.joined, user.avatar || null);
            userCount++;
        }
        console.log(`✓ 迁移了 ${userCount} 个用户`);
    }

    // 迁移作品
    if (jsonData.artworks) {
        const insertArtwork = db.prepare(`
            INSERT OR REPLACE INTO artworks (id, title, artist, artistId, desc, image, prompt, uploadedAt, inShowcase, isAIGenerated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let artworkCount = 0;
        for (const artwork of jsonData.artworks) {
            const inShowcase = artwork.inShowcase !== false ? 1 : 0;
            const isAIGenerated = artwork.prompt && artwork.prompt.includes('AI') ? 1 : 0;
            insertArtwork.run(
                artwork.id,
                artwork.title,
                artwork.artist,
                artwork.artistId || artwork.artist?.split('_')[1] || 'unknown',
                artwork.desc,
                artwork.image,
                artwork.prompt,
                artwork.uploadedAt,
                inShowcase,
                isAIGenerated
            );
            artworkCount++;
        }
        console.log(`✓ 迁移了 ${artworkCount} 个作品`);
    }

    // 迁移展览
    if (jsonData.exhibitions) {
        const insertExhibition = db.prepare(`
            INSERT OR REPLACE INTO exhibitions (id, title, description, curator, curatorId, coverImage, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let exhibitionCount = 0;
        for (const exhibition of jsonData.exhibitions) {
            insertExhibition.run(
                exhibition.id,
                exhibition.title,
                exhibition.description,
                exhibition.curator,
                exhibition.curatorId || 'unknown',
                exhibition.coverImage,
                exhibition.status,
                exhibition.createdAt,
                exhibition.updatedAt
            );
            exhibitionCount++;
        }
        console.log(`✓ 迁移了 ${exhibitionCount} 个展览`);

        // 迁移展览作品关联
        const insertExhibitionArtwork = db.prepare(`
            INSERT OR REPLACE INTO exhibition_artworks (exhibitionId, artworkId, addedAt)
            VALUES (?, ?, ?)
        `);
        let relationCount = 0;
        for (const exhibition of jsonData.exhibitions) {
            if (exhibition.artworks && Array.isArray(exhibition.artworks)) {
                for (const artworkId of exhibition.artworks) {
                    insertExhibitionArtwork.run(exhibition.id, artworkId, new Date().toISOString());
                    relationCount++;
                }
            }
        }
        console.log(`✓ 迁移了 ${relationCount} 个展览作品关联`);
    }

    console.log('\n✅ 数据迁移完成！');
} else {
    console.log('\nℹ️  未找到 JSON 数据库，跳过迁移');
}

// 创建默认管理员账号（可选）
try {
    const insertAdmin = db.prepare(`
        INSERT OR IGNORE INTO users (id, name, password, userType, joined)
        VALUES ('admin', '系统管理员', 'admin123', 'admin', ?)
    `);
    insertAdmin.run(new Date().toISOString());
    console.log('✓ 已创建默认管理员账号 (admin / admin123)');
} catch (err) {
    console.log('ℹ️  管理员账号可能已存在');
}

db.close();
console.log('\n✅ 数据库初始化完成！');
console.log(`📁 数据库文件位置：${DB_PATH}`);
