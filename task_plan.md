# Task Plan

## 当前目标
维护 AI ArtStyle Lab 正式版，使其稳定支持校内师生的 AI 创作、作品管理、主题策展和公开展示。

## 已完成阶段

| 阶段 | 状态 | 说明 |
|---|---|---|
| 旧项目归档 | complete | 旧 Vite/Express demo 已移入 `legacy/vite-express-demo/` |
| Nuxt 应用重建 | complete | Nuxt 3、Vue 3、TypeScript、Pinia、Tailwind 已落地 |
| Supabase 接入 | complete | Auth、Postgres、Storage、迁移脚本已接入 |
| 旧数据迁移 | complete | 用户、作品、图片、展览迁移流程已建立 |
| 账号体系正式化 | complete | 前台使用学号 / 工号，后台使用邮箱映射 |
| 作品流程 | complete | AI 生成、上传、缩略图、编辑、删除、公开/私有状态 |
| 展览流程 | complete | 创建草稿、选图策展、发布、删除、沉浸模式观看 |
| 首页正式化 | complete | 随机作品、公开总数、推荐作品轮播、移除 demo 元素 |
| 沉浸模式 | complete | 全屏播放、预加载、自动播放、控制隐藏、作品信息常显 |
| 项目文档 | complete | README、进度、检查结论和维护计划已更新 |

## 后续优先级

### P0：上线稳定性
- 定期检查 Vercel 生产错误日志。
- 抽查 Supabase Auth 登录、注册、刷新保持登录。
- 抽查上传、AI 保存、作品详情下载、展览发布。
- 确认 Storage bucket 权限不会暴露非公开数据。

### P1：移动端完善
- 检查首页、登录、上传、AI 创作、我的作品、展览详情在手机视口下的布局。
- 检查作品详情弹窗和沉浸模式在手机上的关闭、切换、设置操作。
- 修正文字溢出、按钮换行和大图遮挡问题。

### P1：图片性能
- 继续观察大量图片下首页、我的作品和策展页的加载速度。
- 评估是否需要服务端统一生成多尺寸缩略图。
- 评估是否需要虚拟滚动或更细的分页策略。
- 检查 Supabase/Postgres 查询索引。

### P2：教学场景功能
- 增加作品搜索。
- 增加按班级、作者、来源、公开状态筛选。
- 增加教师批量管理学生作品。
- 增加展览作品排序。
- 增加作品审核或推荐状态。

### P2：运营维护
- 制作管理员操作手册。
- 制作学生和教师使用说明。
- 增加数据备份和迁移复查流程。
- 增加生产环境异常排查 SOP。

## 常规检查命令

```bash
npm run typecheck
npm run build
npm run preview
```

生产部署：

```bash
npx vercel --prod --yes
```

部署后日志：

```bash
npx vercel logs https://ai-artstyle-lab.vercel.app --level error --since 30m
```

## 维护原则
- 根目录 Nuxt 项目是唯一正式开发入口。
- `legacy/` 只作历史参考和迁移来源，不新增业务。
- 涉及权限的改动必须同时检查前端显示、服务端 API 和 Supabase RLS。
- 涉及图片的改动必须检查缩略图、原图下载、沉浸模式和移动端表现。
- 涉及账号的改动必须保持“前台学号/工号、后台邮箱”的设计不变。
