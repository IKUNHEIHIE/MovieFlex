# 项目结构

MovieFlex 使用 Next.js App Router。主要应用代码位于 `src/`，运维脚本位于 `scripts/`，部署相关文件位于 `deploy/`。

## 顶层文件

| 路径 | 说明 |
| --- | --- |
| `package.json` | 项目脚本、依赖和元信息。 |
| `prisma/schema.prisma` | 数据库模型，包含用户、影片、采集、统计、outbox、推荐等表。 |
| `ecosystem.config.cjs` | PM2 进程配置，包含 Web 服务和统计消费者。 |
| `deploy/movieflex-kafka.service` | 本机 Kafka broker 的 systemd 服务文件。 |
| `.env.example` | 可提交的环境变量模板，不包含真实密钥。 |
| `docs/` | 项目结构、部署、API、模块说明等文档。 |

## 源码目录

| 路径 | 说明 |
| --- | --- |
| `src/app/` | Next.js 页面、布局和路由处理器。 |
| `src/app/api/` | HTTP API 路由。 |
| `src/app/admin/` | 后台页面、后台布局、后台样式和运营概览数据聚合。 |
| `src/components/` | 共享组件、后台组件、布局组件、播放器组件和动画组件。 |
| `src/lib/` | 业务逻辑、Prisma、认证、校验、采集、Kafka、outbox、统计、推荐和格式化工具。 |
| `scripts/` | 一次性维护脚本和长期运行脚本。 |
| `themes/` | 前台主题资源。 |
| `public/` | Next.js 静态资源。 |

## 页面路由

| 路由 | 文件 | 说明 |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | 首页和推荐内容。 |
| `/movies` | `src/app/movies/page.tsx` | 影片列表和筛选。 |
| `/movie/[id]` | `src/app/movie/[id]/page.tsx` | 影片详情和播放页。 |
| `/search` | `src/app/search/page.tsx` | 搜索结果。 |
| `/login` | `src/app/login/page.tsx` | 邮箱密码登录。 |
| `/register` | `src/app/register/page.tsx` | 用户注册。 |
| `/user/profile` | `src/app/user/profile/page.tsx` | 用户中心。 |
| `/user/account` | `src/app/user/account/page.tsx` | 账号管理。 |
| `/admin` | `src/app/admin/page.tsx` | 运营概览驾驶舱。 |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | 健康监控和数据大屏。 |
| `/admin/movies` | `src/app/admin/movies/page.tsx` | 影片库管理。 |
| `/admin/users` | `src/app/admin/users/page.tsx` | 用户管理。 |
| `/admin/themes` | `src/app/admin/themes/page.tsx` | 主题管理。 |
| `/admin/catalog/sources` | `src/app/admin/catalog/sources/page.tsx` | 采集源管理。 |
| `/admin/catalog/categories` | `src/app/admin/catalog/categories/page.tsx` | 分类和映射管理。 |
| `/admin/stats/*` | `src/app/admin/stats/*/page.tsx` | 影片、分类、用户和趋势统计。 |

## 后台前端约定

- 后台真实布局入口是 `src/app/admin/layout.tsx`。
- 后台样式集中在 `src/app/admin/admin.module.css`。
- 不要重新引入已删除的深色后台主题文件，也不要重新引入已删除的 `AdminButton`、`AdminCard`、`AdminTable`。
- Server Component 不要向 Client Component 传递浏览器事件处理器或 render 函数。

## 运维脚本

| 脚本 | 说明 |
| --- | --- |
| `scripts/bootstrap-admin.ts` | 创建或引导管理员账号。 |
| `scripts/run-stats-consumer.ts` | PM2 使用的 Kafka 统计消费者入口。 |
| `scripts/backfill-demo-analytics.ts` | 回填演示统计数据。 |
| `scripts/seed-demo-users.ts` | 生成演示用户和交互数据。 |
| `scripts/backfill-clean-metadata.ts` | 标准化影片元数据。 |
| `scripts/backfill-movie-metadata-relations.ts` | 回填影片地区和语言关系表。 |
| `scripts/init-categories.ts` | 初始化分类数据。 |
| `scripts/fix-pending-mappings.ts` | 修复待处理分类映射。 |
