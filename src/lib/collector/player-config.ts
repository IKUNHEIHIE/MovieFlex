export interface PlayerConfig {
  status?: string;
  from: string;
  show: string;
  des?: string;
  target?: string;
  ps?: string;
  parse?: string;
  sort?: string;
  tip?: string;
  id: string;
  code: string;
}

export interface PlayerModeDetection {
  mode: 'IFRAME_DIRECT' | 'IFRAME_RESOLVER' | 'HLS';
  resolverUrl?: string;
}

export interface NormalizedPlayerConfig {
  code: string;
  name: string;
  isEnabled: boolean;
  mode: 'IFRAME_DIRECT' | 'IFRAME_RESOLVER' | 'HLS';
  resolverUrl: string | null;
}

/**
 * 解析播放器配置文件内容
 * 支持纯 JSON 或 Base64 编码的 JSON
 */
export function parsePlayerConfig(input: string): PlayerConfig[] {
  if (!input || typeof input !== 'string') return [];

  let jsonStr = input.trim();

  // 尝试 Base64 解码
  try {
    const decoded = Buffer.from(jsonStr, 'base64').toString('utf-8');
    // 验证解码后是否为有效 JSON
    JSON.parse(decoded);
    jsonStr = decoded;
  } catch {
    // 不是 Base64，保持原样
  }

  try {
    const config = JSON.parse(jsonStr);
    // 如果是单个对象，包装为数组
    if (typeof config === 'object' && !Array.isArray(config)) {
      return [config];
    }
    return Array.isArray(config) ? config : [];
  } catch {
    return [];
  }
}

/**
 * 从播放器的 code 字段检测播放模式
 * - src="'+MacPlayer.PlayUrl+'" → IFRAME_DIRECT
 * - src="https://xxx/?url='+MacPlayer.PlayUrl+'" → IFRAME_RESOLVER
 */
export function detectPlayerMode(code: string): PlayerModeDetection | null {
  if (!code || typeof code !== 'string') return null;

  // 找到 src= 后的引号，按引号类型匹配整个属性值
  const srcIdx = code.indexOf('src=');
  if (srcIdx === -1) return null;
  const afterSrc = code.slice(srcIdx + 4);
  const quoteMatch = afterSrc.match(/^(['"])(.*?)\1/);
  if (!quoteMatch) return null;

  const srcAttr = quoteMatch[2];

  // 检查是否包含 MacPlayer.PlayUrl 变量
  if (!srcAttr.includes("'+MacPlayer.PlayUrl+'")) return null;

  const parts = srcAttr.split("'+MacPlayer.PlayUrl+'");
  if (parts.length !== 2) return null;

    const [prefix] = parts;

  // 前缀为空：直接使用 PlayUrl，属于直接嵌入
  if (!prefix) return { mode: 'IFRAME_DIRECT' };

  // 前缀非空：存在解析地址，只返回前缀部分
  return { mode: 'IFRAME_RESOLVER', resolverUrl: prefix };
}

function isHttpResolverUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizePlayerConfigs(input: unknown): NormalizedPlayerConfig[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const config = entry as Record<string, unknown>;
    const code = [config.from, config.id]
      .find((value): value is string => typeof value === 'string' && value.trim() !== '')
      ?.trim();
    if (!code) return [];

    const template = typeof config.code === 'string' ? config.code : '';
    const detected = detectPlayerMode(template);
    const isHls = /^(m3u8|hls)$/i.test(code) || /\.m3u8(?:[?#'"\s]|$)/i.test(template);
    if (detected?.mode === 'IFRAME_RESOLVER' && !isHttpResolverUrl(detected.resolverUrl)) return [];

    return [{
      code,
      name: typeof config.show === 'string' && config.show.trim() ? config.show.trim() : code,
      isEnabled: config.status !== '0',
      mode: isHls ? 'HLS' : detected?.mode ?? 'IFRAME_DIRECT',
      resolverUrl: isHls ? null : detected?.resolverUrl ?? null,
    }];
  });
}
