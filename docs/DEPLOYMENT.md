# 部署与运维

本文说明 MovieFlex 的生产部署方式和常用运维命令。

## 运行环境

- Node.js 20.9 或更高版本
- MySQL 兼容数据库
- Kafka broker，用于行为分析和统计消费者
- PM2，用于管理应用进程
- systemd，用于在同一台机器上管理 Kafka broker

## 环境变量

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 必需 | MySQL 连接串，例如 `mysql://USER:PASSWORD@HOST:3306/movieflex`。 |
| `AUTH_SECRET` | 必需 | Auth.js 会话加密密钥，请使用足够长的随机值。 |
| `AUTH_URL` | 建议 | 应用公网地址，例如 `https://example.com` 或 `http://HOST:3060`。 |
| `KAFKA_BROKER` | 可选 | Kafka broker 地址，默认 `localhost:9092`。 |
| `MOVIEFLEX_OUTBOX_TOKEN` | 建议 | 内部 outbox 重试接口使用的令牌。 |
| `SENSENOVA_API_KEY` | 可选 | 助手接口使用的模型服务 API Key。 |
| `SENSENOVA_MODEL` | 可选 | 助手接口模型名，默认 `sensenova-6.7-flash-lite`。 |

不要提交真实环境变量。请以 `.env.example` 为模板创建本地 `.env`。

## 安装和数据库准备

```bash
npm ci
npx prisma generate
npm run db:migrate:deploy
```

如果新环境还没有建立 migration 基线，请按当前发布流程谨慎处理 Prisma schema。不要直接手工修改生产表结构。

## 生产构建

生产构建必须使用 webpack 模式：

```bash
npx next build --webpack
```

不要替换为默认 `next build`，除非已经重新验证生产构建产物和运行行为。

## PM2 进程

`ecosystem.config.cjs` 定义了两个进程：

| 进程名 | 说明 |
| --- | --- |
| `movieflex` | Next.js 生产 Web 服务，监听 `3060` 端口。 |
| `movieflex-stats-consumer` | Kafka 统计消费者，运行 `scripts/run-stats-consumer.ts`。 |

启动或重启：

```bash
pm2 start ecosystem.config.cjs
pm2 restart movieflex
pm2 restart movieflex-stats-consumer
pm2 save
pm2 status
```

## Kafka systemd 服务

仓库提供 `deploy/movieflex-kafka.service`，用于管理安装在 `/opt/kafka` 的本机 Kafka broker。

安装示例：

```bash
sudo cp deploy/movieflex-kafka.service /etc/systemd/system/movieflex-kafka.service
sudo systemctl daemon-reload
sudo systemctl enable --now movieflex-kafka.service
sudo systemctl status movieflex-kafka.service
```

日志会追加到 `/var/log/movieflex-kafka.log`。

## 健康检查和冒烟测试

部署后执行：

```bash
npm test -- --run
npx next build --webpack
curl -I http://HOST:3060/
curl -I http://HOST:3060/admin
pm2 status
```

预期结果：

- `/` 返回 `200`。
- 未登录访问 `/admin` 返回登录重定向 `307`。
- 管理员登录后可以访问 `/admin` 和后台子页面。
- PM2 中 `movieflex` 和 `movieflex-stats-consumer` 均为 online。
- 如果需要分析能力，Kafka 服务应处于 active 状态。

## 管理员账号引导

需要创建管理员账号时执行：

```bash
npm run bootstrap:admin
```

不要在文档、提交记录或 Issue 中暴露真实管理员账号和密码。

## 发布 Checklist

1. 拉取最新 `main`。
2. 如果依赖发生变化，执行 `npm ci`。
3. 执行 `npm test -- --run`。
4. 执行 `npx next build --webpack`。
5. 如有数据库变更，执行 `npm run db:migrate:deploy`。
6. 重启 PM2 进程。
7. 验证前台和后台关键路由。
8. 如涉及统计或事件管道，验证 Kafka 和统计消费者。 
