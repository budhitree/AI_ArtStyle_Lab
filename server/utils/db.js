// SQLite 数据库模块
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'artstyle.db');

// 创建数据库连接（单例模式）
let dbInstance = null;

export function getDb() {
    if (!dbInstance) {
        dbInstance = new Database(DB_PATH);
        // 启用外键支持
        dbInstance.pragma('foreign_keys = ON');
        // 启用 WAL 模式（提高并发性能）
        dbInstance.pragma('journal_mode = WAL');
    }
    return dbInstance;
}

// 初始化数据库（确保表存在）
export function initDb() {
    const db = getDb();
    
    // 检查表是否存在
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    
    if (!tableExists) {
        console.log('数据库表不存在，请运行：node server/utils/init-db.js');
        process.exit(1);
    }
    
    return db;
}

// 读取数据库（兼容旧代码）
export async function readDb() {
    const db = getDb();
    
    const users = {};
    const userRows = db.prepare('SELECT * FROM users').all();
    for (const user of userRows) {
        users[user.id] = user;
    }
    
    const artworks = db.prepare('SELECT * FROM artworks').all();
    const exhibitions = db.prepare('SELECT * FROM exhibitions').all();
    
    // 为每个展览添加作品列表
    const exhibitionArtworks = db.prepare('SELECT * FROM exhibition_artworks').all();
    for (const exhibition of exhibitions) {
        exhibition.artworks = exhibitionArtworks
            .filter(rel => rel.exhibitionId === exhibition.id)
            .map(rel => rel.artworkId);
    }
    
    return { users, artworks, exhibitions };
}

// 写入数据库（兼容旧代码，实际不使用）
export async function writeDb(data) {
    // SQLite 不需要整体写入，每个操作单独执行
    console.warn('警告：writeDb 在 SQLite 模式下不应被调用');
}

// 统一响应格式
export function successResponse(data) {
    return { success: true, data };
}

export function errorResponse(error) {
    return { success: false, error };
}
