import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import net from 'net';

export interface DatabaseConfig {
  type: 'sqlite' | 'mysql';
  url: string;
  sqliteUrl: string;
  mysqlUrl: string;
}

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, '.env');
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_ACTIVE = path.join(PRISMA_DIR, 'schema.prisma');
const SCHEMA_MYSQL = path.join(PRISMA_DIR, 'schema.mysql.prisma');
const SCHEMA_SQLITE = path.join(PRISMA_DIR, 'schema.sqlite.prisma');

export function parseEnvFile(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return env;

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

export function writeEnvFile(updates: Record<string, string>) {
  const current = parseEnvFile();
  const merged = { ...current, ...updates };

  let out = '';
  for (const [k, v] of Object.entries(merged)) {
    out += `${k}="${v}"\n`;
  }
  fs.writeFileSync(ENV_PATH, out, 'utf-8');
}

export function getCurrentDatabaseConfig(): DatabaseConfig {
  const env = parseEnvFile();
  const rawUrl = process.env.DATABASE_URL || env.DATABASE_URL || 'file:./prisma/dev.db';
  const isSqlite = rawUrl.startsWith('file:') || rawUrl.endsWith('.db') || rawUrl.startsWith('sqlite:');

  return {
    type: isSqlite ? 'sqlite' : 'mysql',
    url: rawUrl,
    sqliteUrl: env.SQLITE_URL || (isSqlite ? rawUrl : 'file:./prisma/dev.db'),
    mysqlUrl: env.MYSQL_URL || (!isSqlite ? rawUrl : 'mysql://root:password@127.0.0.1:3306/movieflex'),
  };
}

export async function testDatabaseConnection(type: 'sqlite' | 'mysql', url: string): Promise<{ ok: boolean; error?: string }> {
  if (type === 'sqlite') {
    try {
      const cleanPath = url.replace(/^(file:|sqlite:)/, '').trim();
      const resolved = path.isAbsolute(cleanPath) ? cleanPath : path.join(ROOT_DIR, cleanPath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.accessSync(dir, fs.constants.W_OK);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'SQLite 存储目录不可写' };
    }
  }

  // MySQL socket test
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || '127.0.0.1';
    const port = parseInt(parsed.port || '3306', 10);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(4000);

      socket.on('connect', () => {
        socket.destroy();
        resolve({ ok: true });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ ok: false, error: `连接到 ${host}:${port} 超时` });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ ok: false, error: `无法连接到 ${host}:${port}: ${err.message}` });
      });

      socket.connect(port, host);
    });
  } catch (e: any) {
    return { ok: false, error: 'MySQL 连接串格式不正确 (例如 mysql://user:pass@host:3306/dbname)' };
  }
}

export async function switchDatabase(targetType: 'sqlite' | 'mysql', targetUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 验证目标连接
    const test = await testDatabaseConnection(targetType, targetUrl);
    if (!test.ok) {
      return { success: false, message: `连接测试失败: ${test.error}` };
    }

    // 2. 选择对应的 schema 模板并覆盖生效
    const sourceSchema = targetType === 'sqlite' ? SCHEMA_SQLITE : SCHEMA_MYSQL;
    if (!fs.existsSync(sourceSchema)) {
      return { success: false, message: `模板文件不存在: ${path.basename(sourceSchema)}` };
    }
    fs.copyFileSync(sourceSchema, SCHEMA_ACTIVE);

    // 3. 更新 .env 配置
    const envUpdates: Record<string, string> = {
      DATABASE_TYPE: targetType,
      DATABASE_URL: targetUrl,
    };
    if (targetType === 'sqlite') {
      envUpdates.SQLITE_URL = targetUrl;
    } else {
      envUpdates.MYSQL_URL = targetUrl;
    }
    writeEnvFile(envUpdates);
    process.env.DATABASE_URL = targetUrl;
    process.env.DATABASE_TYPE = targetType;

    // 4. 执行 prisma generate 重新生成客户端
    execSync('npx prisma generate', { cwd: ROOT_DIR, stdio: 'pipe' });

    // 5. 执行 prisma db push 自动补全表结构
    execSync('npx prisma db push --skip-generate', { cwd: ROOT_DIR, stdio: 'pipe' });

    // 6. 如果是全新库，自动注入管理员
    try {
      execSync('npx tsx scripts/bootstrap-admin.ts', { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch {}

    // 7. 延迟触发重启 (以便向客户端返回成功响应)
    setTimeout(() => {
      try {
        execSync('pm2 restart movieflex', { cwd: ROOT_DIR, stdio: 'ignore' });
      } catch {
        process.exit(0); // 退出以便 PM2/Systemd 自动拉起
      }
    }, 1500);

    return {
      success: true,
      message: `已成功切换到 ${targetType.toUpperCase()} 数据库，服务正在平滑重载！`,
    };
  } catch (error: any) {
    console.error('Failed to switch database:', error);
    return {
      success: false,
      message: error.message || '切换数据库过程中发生未知错误',
    };
  }
}
