# MovieFlex

MovieFlex 是一个基于 Next.js 的影视内容平台，提供影片浏览、筛选、播放页、用户注册/登录、收藏与观看历史，并支持管理员配置影视采集源及用户行为事件投递。

## 技术栈

- Next.js 16 / React 19 / TypeScript
- MySQL + Prisma
- Auth.js（凭据登录）
- Kafka（可选，用于用户行为事件）

## 运行环境

- Node.js **20.9+**
- MySQL 8.0+（必需）
- Kafka（可选；未启动时事件投递会跳过，不影响页面基础使用）

## 本地启动

```bash
git clone https://github.com/IKUNHEIHIE/MovieFlex.git
cd MovieFlex
npm ci
cp .env.example .env
```

编辑 `.env`，填入可用的 MySQL 连接信息和随机认证密钥，然后初始化数据库与 Prisma Client：

```bash
npx prisma generate
npx prisma db push
npm run dev
```

打开 `http://localhost:3000`。首个注册用户会自动获得管理员角色。

## 环境变量

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | MySQL 连接串，例如 `mysql://USER:PASSWORD@HOST:3306/movieflex` |
| `AUTH_SECRET` | 是 | Auth.js 会话加密密钥；可通过 `npx auth secret` 生成 |
| `KAFKA_BROKER` | 否 | Kafka 地址，默认 `localhost:9092` |

请勿提交 `.env` 或任何真实密钥。旧配置中的 `NEXTAUTH_SECRET` 建议迁移为 `AUTH_SECRET`。

## 生产部署

1. 准备 Node.js 20.9+、MySQL，并配置上述环境变量。
2. 在应用目录安装依赖并同步数据库结构：

   ```bash
   npm ci
   npx prisma generate
   npx prisma db push
   ```

3. 构建并启动服务：

   ```bash
   npm run build
   npm run start
   ```

4. 通过反向代理将公网流量转发到应用端口（默认 `3000`）。如需行为分析，再部署 Kafka 并设置 `KAFKA_BROKER`。

> 当前仓库尚未包含 Prisma migrations，因此首次部署使用 `prisma db push` 同步 `prisma/schema.prisma`。正式长期维护前，建议建立并提交迁移文件，后续改用 `prisma migrate deploy`。

## 常用命令

```bash
npm run dev      # 开发服务器
npm run lint     # ESLint 检查
npm run build    # 生产构建
npm run start    # 启动生产服务
```
