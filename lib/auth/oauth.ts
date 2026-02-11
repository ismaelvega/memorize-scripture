const DEFAULT_NEXT_PATH = '/';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function sanitizeNextPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;

  try {
    const parsed = new URL(candidate, 'http://localhost');
    if (parsed.origin !== 'http://localhost') return fallback;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized || fallback;
  } catch {
    return fallback;
  }
}

export function buildOAuthCallbackRedirect(nextPath: string, currentOrigin: string): string {
  const safeNextPath = sanitizeNextPath(nextPath, DEFAULT_NEXT_PATH);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const baseUrl = stripTrailingSlash(configuredSiteUrl || currentOrigin);
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
}
