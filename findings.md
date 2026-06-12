# Findings

## Rebuild Inputs
- 旧项目的高价值资产主要是 `public/images/*` 示例素材、`public/uploads/` 上传目录结构，以及现有业务能力定义
- 旧项目的低价值部分是 Express/SQLite 运行链路、兼容旧接口逻辑、散落页面脚本、重复文档与异常目录 `%SystemDrive%/`
- 用户明确允许按“新项目”重建，旧实现可全部丢弃，只要功能保留
- 用户偏好现代、AI 协作友好的方案：Nuxt + Tailwind + Supabase
- 用户接受激进清理，不要求保留旧接口、旧 URL、旧 localStorage 数据结构

## Assets To Reuse
- `public/images/hero.png`
- `public/images/art1.png`
- `public/images/art2.png`
- `public/images/art3.png`
- `public/uploads/.gitkeep`
- 旧项目中的业务概念：角色、作品、AI 创作、展览、沉浸模式

## Likely To Archive
- `src/`
- `server/`
- `server.js`
- `index.html`
- `create.html`
- `upload.html`
- `vite.config.js`
- 旧部署文档与 Docker 文件
- `%SystemDrive%/`

## Constraints
- 需要让新项目在没有真实 Supabase / 火山配置时也能安装、构建并展示基本页面
- 需要提供迁移脚本和 schema，但本地无法替用户真实创建远端 Supabase 资源

## Execution Results
- 旧实现已归档到 `legacy/vite-express-demo/`
- 新项目根目录已切换到 Nuxt 3 + Tailwind + Pinia 结构
- 现有 `public/images/*` 与 `public/uploads/.gitkeep` 已保留供新站复用
- `server/data` 中的旧 SQLite 数据源已迁出到 legacy 区域，避免污染新 `server/` 目录
- `scripts/migrate-legacy.mjs` 已成功导出 `migration-output/legacy-export.json` 与 `migration-output/asset-manifest.json`
- `npm run build` 已通过
- `npm run typecheck` 已通过
- `node .output/server/index.mjs` 预览时，根路径 `/` 与 `/api/bootstrap` 均返回 200
