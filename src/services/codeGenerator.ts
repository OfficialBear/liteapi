import type { RequestConfig } from '../types/tab';

/**
 * Build the effective URL with query parameters appended.
 */
function buildUrl(rc: RequestConfig): string {
  const base = rc.url || 'https://api.example.com';
  const params = rc.queryParams
    .filter((q) => q.enabled && q.key)
    .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
    .join('&');
  return params ? `${base}?${params}` : base;
}

/**
 * Build a map of enabled headers.
 */
function buildHeaders(rc: RequestConfig): Record<string, string> {
  const h: Record<string, string> = {};
  for (const header of rc.headers) {
    if (header.enabled && header.key) h[header.key] = header.value;
  }
  // Cookies
  if (rc.cookies.length > 0) {
    const cookie = rc.cookies
      .filter((c) => c.name)
      .map((c) => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ');
    if (cookie) h['Cookie'] = cookie;
  }
  // Auth
  if (rc.auth.type === 'bearer' && rc.auth.token) {
    h['Authorization'] = `Bearer ${rc.auth.token}`;
  } else if (rc.auth.type === 'basic' && rc.auth.username && rc.auth.password) {
    h['Authorization'] = `Basic ${btoa(`${rc.auth.username}:${rc.auth.password}`)}`;
  }
  return h;
}

/**
 * Determine if there is a request body.
 */
function hasBody(rc: RequestConfig): boolean {
  return rc.body.type !== 'none' && rc.method !== 'GET';
}

// ─── Curl ─────────────────────────────────────────────

export function generateCurl(rc: RequestConfig): string {
  const lines: string[] = ['curl'];
  const url = buildUrl(rc);

  // Method
  if (rc.method !== 'GET') {
    lines.push(`  -X ${rc.method}`);
  }

  // URL
  lines.push(`  '${escapeQuote(url)}'`);

  // Headers
  const headers = buildHeaders(rc);
  for (const [k, v] of Object.entries(headers)) {
    lines.push(`  -H '${escapeQuote(k)}: ${escapeQuote(v)}'`);
  }

  // Body
  if (hasBody(rc)) {
    const body = getBodyString(rc);
    if (body) {
      lines.push(`  -d '${escapeQuote(body)}'`);
    }
  }

  return lines.join(' \\\n');
}

// ─── Fetch (JavaScript) ───────────────────────────────

export function generateFetch(rc: RequestConfig): string {
  const url = buildUrl(rc);
  const headers = buildHeaders(rc);
  const method = rc.method;
  const hasBodyFlag = hasBody(rc);

  const options: string[] = [];
  options.push(`  method: '${method}'`);

  if (Object.keys(headers).length > 0) {
    const headerLines = Object.entries(headers).map(
      ([k, v]) => `    '${escapeQuote(k)}': '${escapeQuote(v)}'`
    );
    options.push(`  headers: {\n${headerLines.join(',\n')}\n  }`);
  }

  if (hasBodyFlag) {
    const body = getBodyString(rc);
    if (body) {
      if (rc.body.type === 'json') {
        try {
          JSON.parse(body);
          options.push(`  body: JSON.stringify(${formatJsonInline(body)})`);
        } catch {
          options.push(`  body: '${escapeQuote(body)}'`);
        }
      } else {
        options.push(`  body: '${escapeQuote(body)}'`);
      }
    }
  }

  return (
    `fetch('${escapeQuote(url)}', {\n${options.join(',\n')}\n})` +
    `\n  .then(response => response.json())` +
    `\n  .then(data => console.log(data))` +
    `\n  .catch(error => console.error('Error:', error));`
  );
}

// ─── Axios (TypeScript) ───────────────────────────────

export function generateAxios(rc: RequestConfig): string {
  const url = buildUrl(rc);
  const headers = buildHeaders(rc);
  const method = rc.method.toLowerCase();
  const hasBodyFlag = hasBody(rc);

  const parts: string[] = [];
  parts.push("import axios from 'axios';\n");

  if (hasBodyFlag && rc.body.type === 'form-data') {
    parts.push("import FormData from 'form-data';\n");
  }

  parts.push('const response = await axios({');
  parts.push(`  method: '${method}',`);
  parts.push(`  url: '${escapeQuote(url)}',`);

  if (Object.keys(headers).length > 0) {
    const headerLines = Object.entries(headers).map(
      ([k, v]) => `    '${escapeQuote(k)}': '${escapeQuote(v)}'`
    );
    parts.push(`  headers: {\n${headerLines.join(',\n')}\n  },`);
  }

  if (hasBodyFlag) {
    const body = getBodyString(rc);
    if (body) {
      if (rc.body.type === 'json') {
        try {
          JSON.parse(body);
          parts.push(`  data: ${formatJsonInline(body)},`);
        } catch {
          parts.push(`  data: '${escapeQuote(body)}',`);
        }
      } else if (rc.body.type === 'form-data') {
        parts.push(`  data: formData,`);
      } else {
        parts.push(`  data: '${escapeQuote(body)}',`);
      }
    }
  }

  parts.push('});');
  parts.push('\nconsole.log(response.data);');

  return parts.join('\n');
}

// ─── Python Requests ──────────────────────────────────

export function generatePython(rc: RequestConfig): string {
  const url = buildUrl(rc);
  const headers = buildHeaders(rc);
  const method = rc.method.toLowerCase();
  const hasBodyFlag = hasBody(rc);

  const lines: string[] = [];
  lines.push('import requests');
  lines.push('');

  // Build kwargs
  const kwargs: string[] = [];

  if (Object.keys(headers).length > 0) {
    const headerLines = Object.entries(headers).map(
      ([k, v]) => `    '${escapeQuote(k)}': '${escapeQuote(v)}'`
    );
    kwargs.push(`  headers={\n${headerLines.join(',\n')}\n  }`);
  }

  if (hasBodyFlag) {
    const body = getBodyString(rc);
    if (body) {
      if (rc.body.type === 'json') {
        try {
          JSON.parse(body);
          kwargs.push(`  json=${formatJsonInline(body)}`);
        } catch {
          kwargs.push(`  data='${escapeQuote(body)}'`);
        }
      } else {
        kwargs.push(`  data='${escapeQuote(body)}'`);
      }
    }
  }

  if (kwargs.length > 0) {
    lines.push(`response = requests.${method}(`);
    lines.push(`  '${escapeQuote(url)}',`);
    lines.push(kwargs.join(',\n'));
    lines.push(')');
  } else {
    lines.push(`response = requests.${method}('${escapeQuote(url)}')`);
  }

  lines.push('print(response.status_code)');
  lines.push('print(response.json())');

  return lines.join('\n');
}

// ─── Helpers ──────────────────────────────────────────

function escapeQuote(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getBodyString(rc: RequestConfig): string {
  switch (rc.body.type) {
    case 'json':
    case 'text':
    case 'xml':
      return rc.body.content;
    case 'x-www-form-urlencoded': {
      const params = new URLSearchParams();
      for (const p of rc.body.urlEncoded || []) {
        if (p.enabled && p.key) params.append(p.key, p.value);
      }
      return params.toString();
    }
    case 'form-data': {
      const parts: string[] = [];
      for (const p of rc.body.formData || []) {
        if (p.enabled && p.key) parts.push(`${p.key}=${p.value}`);
      }
      return parts.join('&');
    }
    default:
      return '';
  }
}

function formatJsonInline(jsonStr: string): string {
  try {
    const obj = JSON.parse(jsonStr);
    // Compact single-line format
    const compact = JSON.stringify(obj);
    if (compact.length < 80) return compact;
    // Multi-line indented
    return JSON.stringify(obj, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : '  ' + line))
      .join('\n');
  } catch {
    return `'${escapeQuote(jsonStr)}'`;
  }
}

export type Language = 'curl' | 'fetch' | 'axios' | 'python';

export const LANGUAGE_LABELS: Record<Language, string> = {
  curl: 'cURL',
  fetch: 'Fetch (JavaScript)',
  axios: 'Axios (TypeScript)',
  python: 'Python Requests',
};

export function generateCode(rc: RequestConfig, language: Language): string {
  switch (language) {
    case 'curl':    return generateCurl(rc);
    case 'fetch':   return generateFetch(rc);
    case 'axios':   return generateAxios(rc);
    case 'python':  return generatePython(rc);
  }
}
