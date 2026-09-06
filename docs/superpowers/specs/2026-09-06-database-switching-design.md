# MovieFlex 数据库自由切换（MySQL / SQLite）与部署设计规范

## 1. 背景与目标

MovieFlex 原生使用 Prisma 7 + MariaDB/MySQL 作为数据层，并在生产环境中通过 `@prisma/adapter-mariadb` 驱动。
为了满足轻量化私有化部署、单机测试、免独立数据库服务运行等场景需求，需要在“系统设置（System Settings）”中增加数据库引擎切换选项，支持在 **SQLite** 与 **MySQL / MariaDB** 之间无缝切换，并保证切换后服务可平滑重启且管理员账户无缝可用。

---

## 2. 核心挑战与应对策略

1. **Prisma Schema 的 Provider 限制**：
   - Prisma 不支持在运行时通过环境变量动态决定 `datasource.provider`（如 `provider = env("DATABASE_PROVIDER")` 是非法的）；
   - SQLite 无法识别 MySQL 专有的 `@db.VarChar(...)`、`@db.Text`、`@db.LongText`、`@db.Decimal(...)` 及原生 `enum` 语法。
   - **方案**：维护两份标准 Schema：
     - `prisma/schema.mysql.prisma`：保留完整 MySQL 特性定义。
     - `prisma/schema.sqlite.prisma`：精简所有 `@db.*` 注解，将 Enum 转换为标准 String 字段，并配置 `provider = "sqlite"`。
     - 切换时由后端将目标 Schema 复制到 `prisma/schema.prisma`，并触发 `prisma generate` 与 `prisma db push`。

2. **Prisma 7 驱动适配器（Driver Adapter）动态分发**：
   - Prisma 7 深度集成 Driver Adapters：
     - 当 `DATABASE_URL` 为 `file:...` 时，使用 `@prisma/adapter-better-sqlite3`；
     - 当 `DATABASE_URL` 为 `mysql:...` 时，使用 `@prisma/adapter-mariadb`。
   - `src/lib/prisma.ts` 根据当前的连接协议动态创建对应的 Driver Adapter。

3. **数据库切换流程与平滑重启**：
   - 切换时需先做连接校验（对于 SQLite 确保文件目录可写，对于 MySQL 确保网络与账号连通）。
   - 应用新配置到项目环境文件 `.env`（记录 `DATABASE_TYPE` 与 `DATABASE_URL`）。
   - 自动建表：执行 `prisma db push`。
   - 自动保活：如果目标数据库尚无管理员账号，自动触发 `scripts/bootstrap-admin.ts` 创建默认管理员，避免切换后管理员丢失登录态。
   - 重启触发：调用内部重启接口或 PM2 重启命令使 Next.js 进程重新加载 Prisma 客户端。

---

## 3. 详细设计

### 3.1 数据模型与存储配置
在 `.env` 中维护以下配置：
```env
# 当前生效的数据库类型：mysql | sqlite
DATABASE_TYPE="sqlite"
DATABASE_URL="file:./prisma/dev.db"

# 备用连接信息保存（切换时回填表单）
MYSQL_URL="mysql://root:password@127.0.0.1:3306/movieflex"
SQLITE_URL="file:./prisma/dev.db"
```

### 3.2 动态 Prisma 客户端 (`src/lib/prisma.ts`)
```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  if (url.startsWith('file:') || url.endsWith('.db')) {
    return new PrismaBetterSqlite3({ url });
  }
  return new PrismaMariaDb(url);
}
```

### 3.3 系统设置前端组件 (`SystemSettingsForm.tsx`)
在原设置表单底部增加“数据库引擎设置”面板：
- **单选组**：`SQLite (轻量免配置)` / `MySQL (高性能)`
- **动态输入项**：
  - 选择 SQLite 时展示：数据库文件路径（默认 `file:./prisma/dev.db`）
  - 选择 MySQL 时展示：MySQL 连接字符串或分项输入（Host、Port、User、Password、Database）
- **操作项**：
  - `测试连接` 按钮（触发 `/api/admin/settings/database/test`）
  - `切换数据库并重启` 按钮（触发 `/api/admin/settings/database/switch`）
  - 切换中遮罩层与 5 秒重启倒计时提示。

### 3.4 后端 API 路由
- `GET /api/admin/settings/database`：读取当前数据库状态与配置；
- `POST /api/admin/settings/database/test`：测试给定的连接串是否可达；
- `POST /api/admin/settings/database/switch`：执行 Schema 切换、客户端重新生成、建表与服务重载。

---

## 4. 部署与生产环境准备

1. **宿主机 Node.js 升级**：升级为 Node.js 20 LTS；
2. **构建与运行**：
   - 依赖安装：`npm install`（安装 `@prisma/adapter-better-sqlite3` 与 `better-sqlite3`）；
   - 初始化为 SQLite 模式；
   - 执行 `npx next build --webpack`；
   - 通过 PM2 启动：`pm2 start ecosystem.config.cjs --only movieflex`；
3. **网络与防火墙**：开放 TCP 3060 端口。
