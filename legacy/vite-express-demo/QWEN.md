# AI ArtStyle Lab - 项目架构文档

## 项目概述

**AI ArtStyle Lab** 是一个功能完整的 AI 艺术创作与管理平台，集成了火山引擎 Seedream 4.5 AI 图像生成服务，支持作品管理、展览策划、用户权限管理等功能。

### 核心功能
- 🖼️ **作品画廊** - 浏览、搜索、筛选艺术作品
- 🤖 **AI 艺术创作** - 四维度提示词构建（主体、背景、风格、补充）
- 📤 **作品上传** - 支持本地上传和 AI 生成作品保存
- 👤 **个人中心** - 管理个人信息和作品
- 🎭 **展览系统** - 创建和管理主题展览
- 🔐 **用户认证** - 学生/教师/管理员三级权限
- 📱 **响应式设计** - 支持 iPad Mini、PC 等设备

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **后端运行时** | Node.js (ES Modules) | 18+ |
| **后端框架** | Express.js | 5.x |
| **文件上传** | Multer | 2.x |
| **数据库** | SQLite (better-sqlite3) | 最新 |
| **构建工具** | Vite | 7.x |
| **前端** | 原生 JavaScript (ES6+) | - |
| **样式** | CSS3 (原生) | - |
| **AI 服务** | 火山引擎 Seedream 4.5 | - |

---

## 项目结构

```
AI_ArtStyle_Lab/
├── server.js                    # Express 服务器主文件（路由组装）
├── index.html                   # 主页（画廊、展览、个人中心）
├── create.html                  # AI 创作页面
├── upload.html                  # 作品上传页面
├── package.json                 # 项目配置和依赖
├── .env                         # 环境变量配置
├── .gitignore                   # Git 忽略配置
├── start.bat                    # 一键启动脚本（Windows）
│
├── server/                      # 后端模块
│   ├── data/
│   │   └── artstyle.db         # SQLite 数据库（运行时生成）
│   ├── routes/
│   │   ├── auth.js             # 认证路由（登录/注册）
│   │   ├── user.js             # 用户路由
│   │   ├── artwork.js          # 作品路由
│   │   ├── exhibition.js       # 展览路由
│   │   └── ai.js               # AI 生成路由
│   └── utils/
│       ├── db.js               # 数据库工具模块
│       └── init-db.js          # 数据库初始化脚本
│
├── src/                         # 前端源码
│   ├── main.js                  # 主应用逻辑
│   ├── create.js                # AI 创作页面逻辑
│   ├── upload.js                # 上传页面逻辑
│   ├── device-detect.js         # 设备检测模块
│   ├── responsive.css           # 响应式适配样式
│   ├── userManager.js           # 用户管理服务
│   │
│   ├── services/
│   │   ├── aiService.js         # AI 图像生成服务
│   │   ├── authService.js       # 用户认证服务
│   │   ├── galleryService.js    # 画廊管理服务
│   │   ├── exhibitionService.js # 展览服务
│   │   └── studentService.js    # 学生管理服务
│   │
│   ├── utils/
│   │   ├── apiClient.js         # API 请求客户端
│   │   ├── modal.js             # 模态框工具
│   │   ├── progressBar.js       # 进度条工具
│   │   ├── validation.js        # 输入验证工具
│   │   └── cursor.js            # 光标效果工具
│   │
│   └── *.css                    # 样式文件
│
└── public/                      # 静态资源
    ├── uploads/                 # 用户上传的作品图片
    └── images/                  # 默认图片资源
```

---

## 数据库设计

### SQLite 数据库 (`server/data/artstyle.db`)

#### 表结构

**users** - 用户表
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    userType TEXT NOT NULL CHECK(userType IN ('student', 'teacher', 'admin')),
    joined TEXT DEFAULT (datetime('now')),
    avatar TEXT
);
```

**artworks** - 作品表
```sql
CREATE TABLE artworks (
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
);
```

**exhibitions** - 展览表
```sql
CREATE TABLE exhibitions (
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
);
```

**exhibition_artworks** - 展览作品关联表
```sql
CREATE TABLE exhibition_artworks (
    exhibitionId TEXT NOT NULL,
    artworkId TEXT NOT NULL,
    addedAt TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (exhibitionId, artworkId),
    FOREIGN KEY (exhibitionId) REFERENCES exhibitions(id) ON DELETE CASCADE,
    FOREIGN KEY (artworkId) REFERENCES artworks(id) ON DELETE CASCADE
);
```

**user_uploads** - 用户上传记录表
```sql
CREATE TABLE user_uploads (
    userId TEXT NOT NULL,
    artworkId TEXT NOT NULL,
    uploadedAt TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (userId, artworkId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (artworkId) REFERENCES artworks(id) ON DELETE CASCADE
);
```

---

## API 端点

### 用户认证
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/login` | POST | 用户登录 |
| `/api/register` | POST | 用户注册 |
| `/api/user/:userId` | GET | 获取用户信息 |
| `/api/user/:userId` | PUT | 更新用户信息 |

### 作品管理
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/gallery` | GET | 获取所有作品 |
| `/api/gallery/upload` | POST | 上传作品 |
| `/api/gallery/:id` | GET/PUT/DELETE | 作品操作 |
| `/api/artwork/:id` | GET/PUT/DELETE | 兼容旧版前端 |
| `/api/works` | GET | 获取指定用户作品 |

### AI 生成
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/ai/generate` | POST | 生成 AI 图像（带频率限制） |
| `/api/ai/save-to-gallery` | POST | 保存 AI 作品到图库 |

### 展览管理
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/exhibitions` | GET | 获取所有展览 |
| `/api/exhibitions/:id` | GET/PUT/DELETE | 展览操作 |
| `/api/exhibitions/:id/publish` | POST | 发布展览 |
| `/api/exhibitions/:id/artwork/:artworkId` | POST/DELETE | 添加/移除作品 |

### 学生管理
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/students` | GET | 获取学生列表 |
| `/api/student/:id` | PUT | 更新学生信息 |
| `/api/student/:id` | DELETE | 删除学生 |

---

## 环境变量配置

复制 `.env.example` 为 `.env`：

```env
# 火山引擎 AI 服务配置
VOLC_API_KEY=你的 API 密钥
VOLC_SEEDREAM_ENDPOINT=你的端点 ID

# 服务器配置
PORT=3000
```

---

## 构建和运行

### 开发模式
```bash
# 终端 1: 启动前端开发服务器（Vite）
npm run dev
# 访问：http://localhost:5173

# 终端 2: 启动后端 API 服务器（Express）
npm start
# 访问：http://localhost:3000
```

### 一键启动（Windows）
```bash
start.bat
```

### 生产模式
```bash
# 构建并启动
npm run prod
```

---

## 设备适配

### 响应式断点

| 设备 | 屏幕宽度 | 布局 |
|------|----------|------|
| 手机 | < 768px | 单栏，导航堆叠 |
| iPad Mini | 768px - 1024px | 两栏，导航优化 |
| PC | > 1024px | 多栏，完整布局 |
| 大屏 PC | > 1400px | 宽屏优化 |

### iPad Mini 优化
- 导航栏：Logo 和按钮缩小，防止换行
- 画廊网格：2-3 列自适应
- 触摸区域：≥44px（iOS 标准）
- 字体大小：16px（防止 iOS 自动缩放）

---

## 安全特性

### AI 频率限制
- **限制**：1 分钟最多 10 次请求
- **范围**：按用户 ID 独立计算
- **重置**：超过 1 分钟自动重置

### 权限验证
- **学生**：仅管理自己的作品
- **教师**：可创建展览、管理学生
- **管理员**：所有权限

### 输入验证
- 学号格式：8 位数字
- 工号格式：7 位数字
- 文件类型：图片格式验证
- 用户存在性：上传前验证

---

## 测试账号

```
学生账号：20250101 / 123456
教师账号：20250001 / 123456
管理员：admin / admin123
```

---

## 开发规范

### 代码风格
- **模块化**: ES6 模块 (`import`/`export`)
- **服务层**: 业务逻辑分离到 `services/`
- **统一 API**: 使用 `apiClient` 进行请求

### 目录约定
- `server/routes/` - 后端路由
- `server/utils/` - 后端工具
- `src/services/` - 前端服务
- `src/utils/` - 前端工具

### 响应格式
```javascript
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "error": "错误信息"
}
```

---

## 常见问题

### 1. AI 生成功能不可用
检查 `.env` 中的 `VOLC_API_KEY` 和 `VOLC_SEEDREAM_ENDPOINT`

### 2. 上传图片无法显示
确认 `public/uploads` 目录有写入权限

### 3. 数据库初始化
```bash
node server/utils/init-db.js
```

### 4. 控制台报错 `Unchecked runtime.lastError`
这是 Chrome 扩展导致的，不影响功能，可忽略

---

## 版本历史

### v2.0 (当前版本)
- ✅ 迁移到 SQLite 数据库
- ✅ 后端代码模块化
- ✅ iPad Mini 响应式适配
- ✅ AI 频率限制
- ✅ 触摸设备优化
- ✅ 一键启动脚本

### v1.0
- JSON 文件数据库
- 单文件 server.js
- 仅 PC 端支持

---

**AI ArtStyle Lab** - 让 AI 与艺术完美融合
