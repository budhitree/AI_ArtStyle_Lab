# AI ArtStyle Lab

AI ArtStyle Lab 已从旧的 Vite + Express demo 重构为新的 Nuxt 应用骨架，目标是服务校内师生的 AI 创作、作品管理和主题展览流程。

## 当前架构

- Nuxt 3
- Vue 3 + TypeScript
- Pinia
- Tailwind CSS
- Supabase Auth / Postgres / Storage
- Volcano Ark / Seedream 由 Nuxt server routes 代理

项目同时支持两种运行模式：

- `Demo 回退模式`
  - 未配置 Supabase / 火山引擎时启用
  - 仍可浏览页面、登录 demo 角色、体验上传/创作/策展流程
- `Supabase 正式模式`
  - 配置环境变量后启用
  - 作品、展览、上传文件与鉴权都走真实云端能力

## 本地开发

```bash
npm install
npm run dev
```

默认地址：

- App: `http://localhost:3000`

## 环境变量

复制 `.env.example` 为 `.env`，然后填入：

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

如果这些值暂时留空，项目会自动降级到 demo 回退模式。

## Supabase 初始化

1. 创建 Supabase 项目
2. 在 SQL Editor 中执行：

`supabase/migrations/001_init.sql`

3. 创建公开 bucket：

- `artworks`
- `exhibitions`

4. 打开 Auth 的 Email provider
5. 将项目 URL 和 anon/service role key 写入 `.env`

## 旧数据迁移

迁移脚本会优先读取以下任一路径中的旧 SQLite 数据库：

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

写入 Supabase（best effort）：

```bash
npm run migrate:legacy -- --write
```

说明：

- 该模式会为旧用户创建临时 Supabase Auth 账号
- 默认密码为 `LegacyTemp!123`
- 迁移后应立即要求用户重置密码

## 目录说明

- `app/` Nuxt app 入口与全局样式
- `pages/` 页面路由
- `components/` 复用组件
- `stores/` Pinia 状态
- `server/api/` 服务端 API
- `server/utils/` 仓储、鉴权、存储与 AI 代理
- `shared/` 前后端共享类型和 demo 数据
- `supabase/` 数据库 schema
- `legacy/` 旧 Vite/Express 实现归档

## 当前已实现

- 公共画廊首页
- 登录 / 注册页
- AI 创作页
- 上传作品页
- 我的作品页
- 展览列表页
- 展览详情 / 管理页
- Demo 模式数据回退
- Supabase-ready 的 API / schema / migration 脚本

## 待接入或需在真实环境验证

- 真实 Supabase Auth 邮件流
- 真正的生产 bucket 权限策略
- 火山引擎真实图片生成质量与额度控制
- 更细的策展排序、沉浸模式动画、移动端打磨
