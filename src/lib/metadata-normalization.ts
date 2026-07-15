export function normalizeMetadataValue(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.split(/[\/,]/, 1)[0].trim();
  return normalized || null;
}
