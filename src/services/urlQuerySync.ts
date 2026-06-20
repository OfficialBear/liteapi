import type { KeyValuePair } from '../types/api';

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Parse query string from URL and return KeyValuePair array.
 * Preserves existing IDs for params with the same key.
 * Example: "https://api.com/path?page=1&size=20" → [{key:"page", value:"1"}, ...]
 */
export function parseQueryFromUrl(url: string, existingParams: KeyValuePair[]): KeyValuePair[] {
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return []; // no query string — clear params

  const queryStr = url.substring(qIdx + 1);
  if (!queryStr.trim()) return [];

  const existingMap = new Map(existingParams.map((p) => [p.key, p]));

  const params: KeyValuePair[] = [];
  const pairs = queryStr.split('&');

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    let key: string;
    let value: string;

    if (eqIdx === -1) {
      key = decodeURIComponent(pair);
      value = '';
    } else {
      key = decodeURIComponent(pair.substring(0, eqIdx));
      value = decodeURIComponent(pair.substring(eqIdx + 1));
    }

    if (!key) continue;

    // Preserve existing id, description, enabled state
    const existing = existingMap.get(key);
    params.push({
      id: existing?.id || generateId(),
      key,
      value,
      description: existing?.description || '',
      enabled: existing?.enabled ?? true,
    });
  }

  return params;
}

/**
 * Extract the base URL (without query string).
 * "https://api.com/path?page=1" → "https://api.com/path"
 */
export function getBaseUrl(url: string): string {
  const qIdx = url.indexOf('?');
  return qIdx === -1 ? url : url.substring(0, qIdx);
}

/**
 * Rebuild the full URL from base URL and query params.
 * Only enabled params with non-empty keys are included.
 */
export function buildUrlWithQuery(baseUrl: string, params: KeyValuePair[]): string {
  const active = params.filter((p) => p.enabled && p.key);
  if (active.length === 0) return baseUrl;

  const queryStr = active
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');

  return queryStr ? `${baseUrl}?${queryStr}` : baseUrl;
}
