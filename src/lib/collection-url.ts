import { isIP } from 'node:net';

function privateIpv4(value: string) {
  const [a, b] = value.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168;
}

export function validateCollectionUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '::1') return null;
    if (isIP(host) === 4 && privateIpv4(host)) return null;
    if (isIP(host) === 6 && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'))) return null;
    return url.toString();
  } catch { return null; }
}
