export function suggestSourceKey(apiUrl: string): string {
  const url = new URL(apiUrl);
  return [url.hostname, ...url.pathname.split('/')]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'source';
}
