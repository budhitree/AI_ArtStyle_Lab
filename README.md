# AI ArtStyle Lab 校园艺术创作平台

AI ArtStyle Lab 是面向校内师生的 AI 艺术创作、作品管理和线上策展平台。项目已从早期 Vite + Express demo 重构为 Nuxt 3 应用，并接入 Supabase Auth、Postgres、Storage 与服务端 API。

生产地址：

- https://ai-artstyle-lab.vercel.app

## 项目定位

平台用于把课堂作品、AI 生成作品和主题展览放到同一个线上空间中管理。

- 学生可以注册登录、上传作品、用 AI 生成作品、管理自己的作品库。
- 教师可以浏览学生作品、创建展览草稿、选择作品入展、发布线上展览。
- 管理员拥有更高权限，可查看和维护全站作品与展览。
- 公开访客可以浏览公开作品、查看作品详情、下载原图、进入沉浸模式观看。

## 技术架构

- Nuxt 3：页面路由、服务端 API、SSR/预渲染能力。
- Vue 3 + TypeScript：前端组件和类型约束。
- Pinia：登录状态和用户资料状态。
- Tailwind CSS：界面样式。
- Supabase Auth：账号注册、登录、会话保持。
- Supabase Postgres：用户资料、作品、展览、展览作品关联。
- Supabase Storage：原图、缩略图和展览素材存储。
- Volcano Ark / Seedream：AI 图片生成，由 Nuxt server route 代理。
- Vercel：生产部署。

## 账号规则

前台只显示和输入学号或工号，邮箱仅作为 Supabase Auth 后台登录标识保存。

- 学生账号：8 位学号，格式为 `4 位入学年份 + 2 位班级 + 2 位学号`，例如 `20250101`。
- 教师账号：7 位工号，格式为 `4 位学校编码 + 3 位校内编号`，例如 `2506049`。
- 注册时根据编号长度自动识别身份：8 位为学生，7 位为教师。
- 登录时支持旧迁移账号和新注册账号的后台邮箱规则，用户无需感知邮箱。

相关实现：

- `shared/account.ts`：账号格式识别、角色推断、后台邮箱转换。
- `pages/auth.vue`：登录 / 注册界面。
- `server/api/auth/register.post.ts`：注册 API。
- `stores/auth.ts`：客户端登录、注册、会话恢复。
- `supabase/migrations/007_account_code_auth.sql`：数据库侧账号字段与触发器。

## 页面与功能

### 首页 `/`

文件：`pages/index.vue`

- 展示平台标题、入口按钮、公开作品总数和展览数量。
- 首页公开作品随机排序，不固定只看最新作品。
- 推荐大图从公开作品中随机选取，并自动轮播。
- 公共画廊只展示公开作品，支持分页加载更多。
- 支持点击作品卡片查看详情。
- 支持进入公共画廊沉浸模式，播放完整公开图库，而不是只播放当前已加载列表。

### 登录注册 `/auth`

文件：`pages/auth.vue`

- 学号 / 工号登录。
- 学号 / 工号注册。
- 注册时自动识别学生或教师身份。
- 登录成功后写入 Pinia 状态，并从 Supabase session 恢复登录，避免刷新后退出。

### AI 创作 `/create`

文件：`pages/create.vue`

- 需要登录。
- 输入主体、背景、风格、补充说明和比例。
- 服务端将结构化信息组合为生成 Prompt。
- 生成结果可下载。
- 生成结果可直接保存到作品库，来源标记为 `ai`。

相关 API：

- `server/api/ai/generate.post.ts`
- `server/api/artworks/from-ai.post.ts`
- `server/utils/ai.ts`

### 上传作品 `/upload`

文件：`pages/upload.vue`

- 需要登录。
- 支持上传图片、标题、简介、Prompt / 灵感说明、公开状态。
- 客户端限制单张图片最大 12MB。
- 上传前在浏览器端生成 WebP 缩略图，减少列表和首页加载压力。
- 原图和缩略图分别写入存储，作品元数据写入数据库。

相关 API：

- `server/api/artworks/upload.post.ts`
- `server/utils/storage.ts`
- `server/utils/image.ts`

### 我的作品 `/my-works`

文件：`pages/my-works.vue`

- 需要登录。
- 展示当前用户自己的作品。
- 支持按全部、公开、仅自己可见、AI 创作、上传作品筛选。
- 支持分页加载。
- 支持编辑标题、简介、Prompt、公开状态。
- 支持删除自己的作品。

相关 API：

- `server/api/artworks.get.ts`
- `server/api/artworks/[id].patch.ts`
- `server/api/artworks/[id].delete.ts`

### 展览列表 `/exhibitions`

文件：`pages/exhibitions/index.vue`

- 展示已发布展览。
- 教师和管理员登录后可创建展览草稿。
- 教师和管理员可查看自己的展览草稿。
- 管理员可查看全部展览草稿。

相关 API：

- `server/api/exhibitions.get.ts`
- `server/api/exhibitions.post.ts`

### 展览详情与策展 `/exhibitions/[id]`

文件：`pages/exhibitions/[id].vue`

- 公开访客可查看已发布展览。
- 草稿仅策展人或管理员可打开。
- 展示展览封面、标题、描述、策展人、状态和作品数量。
- 支持展览作品详情查看。
- 支持展览沉浸模式观看。
- 策展人可编辑展览标题、描述、封面。
- 策展人可发布或删除展览。
- 教师策展时可看到学生作品和自己的作品，并用小缩略图快速选入。
- 管理员策展时可看到全部作品。
- 展览作品 ID 会去重，避免重复挂同一张图。

相关 API：

- `server/api/exhibitions/[id].get.ts`
- `server/api/exhibitions/[id].patch.ts`
- `server/api/exhibitions/[id].delete.ts`
- `server/api/exhibitions/[id]/publish.post.ts`

### 作品详情弹窗

文件：`components/ArtworkViewer.vue`

- 展示作品原图、标题、简介、创作者、来源、Prompt。
- 支持下载原图。
- 关闭时恢复页面滚动。

### 沉浸模式

文件：`components/ImmersiveViewer.vue`

- 全屏黑底播放作品。
- 支持上一张、下一张、键盘方向键、Esc 退出、空格切换自动播放。
- 支持设置自动播放和播放速度。
- 打开时预加载 5 张图片，并随播放继续向后预加载。
- 自动播放时隐藏顶部设置 / 退出按钮和左右切换控件。
- 作品名称、作者和 Prompt / 描述在播放时保持显示。

## 数据模型

核心类型定义在 `shared/types.ts`。

### profiles

用户资料表。

- `id`：关联 Supabase Auth user id。
- `email`：后台认证邮箱。
- `account_code`：前台账号编号，即学号或工号。
- `name`：展示名称。
- `role`：`student`、`teacher`、`admin`。
- `avatar_url`：头像地址。

### artworks

作品表。

- `title`：作品标题。
- `description`：作品简介。
- `prompt`：AI Prompt 或灵感说明。
- `image_url`：原图地址。
- `thumbnail_url`：缩略图地址。
- `owner_id`：作者。
- `source_type`：`upload` 或 `ai`。
- `visibility`：`public` 或 `private`。

### exhibitions

展览表。

- `title`：展览标题。
- `description`：展览说明。
- `cover_image_url`：封面图。
- `status`：`draft` 或 `published`。
- `curator_id`：策展人。

### exhibition_artworks

展览作品关联表。

- `exhibition_id`：展览 ID。
- `artwork_id`：作品 ID。
- 用于记录一场展览包含哪些作品。

## 权限规则

主要规则实现于 `server/utils/repository.ts`、`server/utils/auth.ts` 和数据库 RLS 迁移中。

- 未登录用户：只能查看公开作品和已发布展览。
- 学生：可创建、编辑、删除自己的作品；不可创建展览。
- 教师：可创建和管理自己的展览；策展时可选择学生作品和自己的作品。
- 管理员：可访问和维护全部作品与展览。
- 作品编辑权限：作者本人或管理员。
- 展览编辑权限：策展人本人或管理员。
- 草稿展览：仅策展人或管理员可见。

## API 概览

- `GET /api/bootstrap`：首页初始化数据、公开作品总数、当前用户资料。
- `GET /api/me`：当前登录用户资料。
- `POST /api/auth/register`：按学号 / 工号创建 Supabase Auth 用户和 profile。
- `GET /api/artworks`：作品列表，支持 public、mine、curation、ids、exclude、limit、offset、random、visibility、source_type。
- `POST /api/artworks/upload`：上传作品。
- `POST /api/artworks/from-ai`：保存 AI 生成结果到作品库。
- `PATCH /api/artworks/:id`：更新作品。
- `DELETE /api/artworks/:id`：删除作品。
- `POST /api/ai/generate`：生成 AI 图片。
- `GET /api/exhibitions`：展览列表。
- `POST /api/exhibitions`：创建展览草稿。
- `GET /api/exhibitions/:id`：展览详情。
- `PATCH /api/exhibitions/:id`：更新展览。
- `DELETE /api/exhibitions/:id`：删除展览。
- `POST /api/exhibitions/:id/publish`：发布展览。

## 运行模式

项目支持两种模式。

### Demo / Legacy 回退模式

未配置 Supabase 时启用。

- 使用 `shared/demo-data.ts` 或旧数据快照。
- 可浏览页面和体验核心流程。
- 适合本地初次开发和没有云端配置时调试界面。

### Supabase 正式模式

配置 Supabase 环境变量后启用。

- Auth、数据库和存储都走真实云端。
- 生产站点使用该模式。
- 需要执行数据库迁移并配置 Storage bucket。

## 环境变量

复制 `.env.example` 为 `.env`，按需填入：

```bash
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=artworks
SUPABASE_EXHIBITION_BUCKET=exhibitions

VOLC_API_KEY=
VOLC_SEEDREAM_ENDPOINT=
VOLC_API_BASE=https://ark.cn-beijing.volces.com/api/v3/images/generations
```

说明：

- `NUXT_PUBLIC_SUPABASE_URL` 和 `NUXT_PUBLIC_SUPABASE_ANON_KEY` 会暴露给浏览器，用于 Supabase 客户端登录。
- `SUPABASE_SERVICE_ROLE_KEY` 只允许服务端使用，不得提交到 Git。
- `VOLC_API_KEY` 只允许服务端使用，不得提交到 Git。
- 如果 Supabase 变量缺失，会回退到 demo / legacy 模式。

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

- http://localhost:3000

常用命令：

```bash
npm run typecheck
npm run build
npm run preview
npm run migrate:legacy
npm run migrate:legacy -- --write
```

## Supabase 初始化

1. 创建 Supabase 项目。
2. 在 SQL Editor 中按顺序执行 `supabase/migrations/` 下的迁移文件。
3. 确认存在公开访问所需的 Storage bucket：
   - `artworks`
   - `exhibitions`
4. 开启 Auth Email provider。
5. 将 Supabase URL、anon key、service role key 写入本地 `.env` 和 Vercel 环境变量。
6. 在生产部署后测试注册、登录、上传、AI 保存、策展发布。

当前迁移文件：

- `001_init.sql`：基础表结构、枚举、RLS、触发器。
- `002_add_artwork_thumbnails.sql`：作品缩略图字段。
- `003_reset_current_app_schema.sql`：当前正式表结构重置。
- `004_harden_profile_trigger.sql`：profile 触发器加固。
- `005_ensure_storage_buckets.sql`：Storage bucket 初始化。
- `006_tighten_supabase_security.sql`：安全策略加固。
- `007_account_code_auth.sql`：学号 / 工号账号体系。

## 旧数据迁移

迁移脚本位于 `scripts/migrate-legacy.mjs`。

脚本会优先读取以下任一路径中的旧 SQLite 数据库：

- `server/data/artstyle.db`
- `legacy/vite-express-demo/server/data/artstyle.db`
- `legacy/vite-express-demo/data-source/data/artstyle.db`

只导出、不写远端：

```bash
npm run migrate:legacy
```

输出目录：

- `migration-output/legacy-export.json`
- `migration-output/asset-manifest.json`

写入 Supabase：

```bash
npm run migrate:legacy -- --write
```

迁移说明：

- 旧用户会创建为 Supabase Auth 用户。
- 旧用户资料会写入 `profiles`。
- 旧作品会写入 `artworks`，图片会上传到 Supabase Storage。
- 旧展览会写入 `exhibitions` 和 `exhibition_artworks`。
- 迁移后应要求旧用户重置密码或由管理员统一分发新密码。

## 性能处理

当前已做的图片性能优化：

- 上传时生成缩略图，列表和首页优先使用 `thumbnail_url`。
- 首页公开作品随机取样，不一次性渲染全库。
- 公共画廊分页加载。
- 我的作品分页加载。
- 策展作品库每页加载 48 张小缩略图。
- 沉浸模式打开后先预加载 5 张，再随播放继续预加载。
- 首页 bootstrap 禁用缓存，避免用户态和随机作品被错误缓存。
- 非随机公开作品接口带短 CDN 缓存。

后续如果图片继续增多，优先考虑：

- 服务端统一生成多尺寸缩略图。
- Storage/CDN 层增加图片变换或缓存策略。
- 作品列表使用虚拟滚动。
- 为 `artworks.visibility`、`artworks.owner_id`、`artworks.created_at`、`profiles.role` 增加或确认索引。

## 目录说明

- `app/`：Nuxt app 入口和全局样式。
- `pages/`：页面路由。
- `components/`：复用组件。
- `composables/`：API、Supabase client、运行模式等组合函数。
- `stores/`：Pinia 状态。
- `middleware/`：页面权限中间件。
- `plugins/`：Supabase 和登录初始化插件。
- `server/api/`：Nuxt 服务端 API。
- `server/utils/`：鉴权、仓储、存储、AI、图片工具和回退状态。
- `shared/`：前后端共享类型、标签、账号规则、demo 数据。
- `supabase/migrations/`：数据库迁移。
- `scripts/`：旧数据迁移脚本。
- `legacy/`：旧 Vite/Express demo 归档，仅作历史参考。
- `migration-output/`：旧数据导出结果。

## 部署

生产部署使用 Vercel。

```bash
npm run build
npx vercel --prod --yes
```

部署前检查：

- `npm run typecheck`
- `npm run build`
- Vercel 环境变量已同步。
- Supabase 迁移已执行。
- 生产站点登录、上传、首页、展览、沉浸模式可用。

部署后检查：

```bash
npx vercel logs https://ai-artstyle-lab.vercel.app --level error --since 30m
```

## 当前状态

截至 2026-06-15，桌面端核心流程基本完善：

- 正式 Supabase 登录和注册可用。
- 旧数据迁移链路已建立。
- 首页、公共画廊、作品详情、原图下载、随机展示和沉浸模式已完成。
- 上传、AI 创作、我的作品管理已完成。
- 教师策展、作品去重、小缩略图选图、展览发布已完成。
- 仍需持续检查移动端适配、大量图片下的加载性能、生产环境权限策略和真实课堂使用流程。
