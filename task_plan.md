# Task Plan

## Goal
将 `D:\AI_ArtStyle_Lab` 从原生 JS + Express + SQLite demo 重建为 Nuxt 3 + Vue 3 + TypeScript + Pinia + Tailwind CSS + Supabase 的可持续迭代 MVP，同时激进清理历史遗留实现，只迁移必要素材和数据能力。

## Phases
| Phase | Status | Notes |
|---|---|---|
| 归档旧实现并保留可复用资产 | complete | 旧 Vite/Express 实现已移入 `legacy/vite-express-demo/` |
| 搭建 Nuxt 新骨架 | complete | Nuxt 3、Tailwind、Pinia、TypeScript、页面路由已落地 |
| 实现核心前端页面与状态 | complete | 首页、认证、创作、上传、我的作品、展览页已实现 |
| 实现服务端路由与 AI 代理 | complete | 作品、展览、AI、鉴权、Demo/Supabase 双模式已实现 |
| 增加迁移脚本与文档 | complete | Supabase schema、legacy 迁移脚本、新 README 已添加 |
| 验证构建与主要链路 | complete | `npm run build`、`npm run typecheck`、预览访问、迁移导出均通过 |

## Decisions
- 旧实现只作为参考和迁移来源，不保留兼容层
- 新项目以 Nuxt 为唯一维护入口
- Supabase 作为长期鉴权/数据库/存储基础设施
- 火山引擎能力保留在服务端代理中
- 允许清理旧 URL、旧 localStorage 结构、旧接口

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `nuxi init` 首次进入交互界面未真正生成项目 | 1 | 改为使用非交互参数重新脚手架 |
| 首次 `npm install` 长时间未退出 | 1 | 诊断为残留 `npm install`/旧 `server.js` 进程，终止后重新安装成功 |

## Outcome
- 根目录已切换为 Nuxt 应用，旧实现已归档
- 新项目支持 Demo 回退模式与 Supabase 正式模式
- 作品、展览、AI 创作、上传、个人作品管理的页面与 API 已打通
- 已生成 `supabase/migrations/001_init.sql` 和 `scripts/migrate-legacy.mjs`
- 已验证首页 `GET /` 和 `GET /api/bootstrap` 在预览服务器上返回 200
