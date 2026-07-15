# MovieFlex

MovieFlex 是一个基于 Next.js 的影视内容平台，提供影片浏览、搜索、播放、用户收藏、观看历史、后台运营、AppleCMS 采集、分类映射、用户管理、行为事件投递、Kafka 统计消费和运营数据看板。

## 功能概览

- 前台观影：主页推荐、影片列表、搜索、详情页、HLS 播放、播放进度上报。
- 用户体系：注册、登录、个人中心、账号管理、收藏、观看历史。
- 后台运营：运营概览、影片库、用户管理、主题管理、数据大屏。
- 采集管理：AppleCMS JSON/XML 采集源、采集任务、播放器配置、分类映射。
- 数据统计：影片热度、分类分布、用户行为、时间趋势、DailyStats 聚合。
- 事件管道：用户行为事件、EventOutbox、Kafka 投递、统计消费者。
- 生产运维：PM2 应用进程、Kafka systemd 服务、健康检查和重试入口。

## 技术栈

- Next.js 16 App Router / React 19 / TypeScript
- Prisma 7 + MySQL/MariaDB adapter
- Auth.js v5 credentials provider
- Kafka + kafkajs
- Recharts / Framer Motion
- Vitest / Testing Library
- PM2 / systemd

## 快速开始

```bash
git clone https://github.com/IKUNHEIHIE/MovieFlex.git
cd MovieFlex
npm ci
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

开发服务默认访问 `http://localhost:3000`。

## 生产部署重点

生产构建必须使用 webpack 构建模式：

```bash
npx next build --webpack
pm2 start ecosystem.config.cjs
pm2 save
```

不要直接用默认 `next build` 作为生产部署构建命令；当前项目已验证生产构建应固定为 `npx next build --webpack`。

## 常用命令

```bash
npm run dev                 # 开发服务器
npm test -- --run           # 全量测试
npx next build --webpack    # 生产构建
npm run db:generate         # 生成 Prisma Client
npm run db:migrate:deploy   # 执行 Prisma migration
npm run bootstrap:admin     # 引导管理员账号
```

## 文档导航

- [项目结构](docs/PROJECT_STRUCTURE.md)
- [部署环境与运维](docs/DEPLOYMENT.md)
- [API 文档](docs/API.md)
- [模块介绍](docs/MODULES.md)
- [分类管理需求](docs/REQUIREMENTS-catalog-management.md)

## 安全说明

- 不要提交 `.env`、数据库密码、GitHub token、管理员账号密码或任何真实密钥。
- `.env.example` 只包含占位符。
- 后台 API 需要管理员权限，普通用户会被重定向或返回未授权响应。
