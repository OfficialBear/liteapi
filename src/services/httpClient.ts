import axios from 'axios';
import type { RequestConfig, ResponseData } from '../types/tab';
import { isTauri, sendHttpRequest, type HttpRequestConfig } from '../tauri-api';

/**
 * Send an HTTP request. Uses Rust backend (no CORS) when running in Tauri,
 * falls back to axios for browser dev mode.
 */
export async function sendRequest(rc: RequestConfig): Promise<ResponseData> {
  if (isTauri()) {
    return sendViaTauri(rc);
  }
  return sendViaAxios(rc);
}

/** Copy frontend RequestConfig to Rust HttpRequestConfig */
function buildTauriConfig(rc: RequestConfig): HttpRequestConfig {
  return {
    method: rc.method,
    url: rc.url || '/',
    headers: rc.headers.map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
    query_params: rc.queryParams.map((q) => ({ key: q.key, value: q.value, enabled: q.enabled })),
    body_type: rc.body.type,
    body_content: rc.body.content || buildBodyContent(rc),
    auth_type: rc.auth.type,
    auth_token: rc.auth.token ?? null,
    auth_username: rc.auth.username ?? null,
    auth_password: rc.auth.password ?? null,
  };
}

function buildBodyContent(rc: RequestConfig): string {
  if (rc.body.type === 'x-www-form-urlencoded') {
    const params = new URLSearchParams();
    for (const p of rc.body.urlEncoded || []) {
      if (p.enabled && p.key) params.append(p.key, p.value);
    }
    return params.toString();
  }
  return '';
}

async function sendViaTauri(rc: RequestConfig): Promise<ResponseData> {
  const config = buildTauriConfig(rc);
  const result = await sendHttpRequest(config);

  // Parse response headers into KeyValuePair[]
  const headers = Object.entries(result.headers).map(([k, v], idx) => ({
    id: `rh-${idx}`,
    key: k,
    value: v,
    description: '',
    enabled: true,
  }));

  // Parse Set-Cookie
  const setCookie = result.headers['set-cookie'] || '';
  const cookies = setCookie
    ? setCookie.split(',').map((c, idx) => {
        const semi = c.indexOf(';');
        const kv = semi > 0 ? c.substring(0, semi).trim() : c.trim();
        const eq = kv.indexOf('=');
        return {
          id: `rc-${idx}`,
          name: eq > 0 ? kv.substring(0, eq).trim() : kv.trim(),
          value: eq > 0 ? kv.substring(eq + 1).trim() : '',
        };
      })
    : [];

  return {
    statusCode: result.status,
    statusText: result.status_text,
    duration: result.duration,
    size: result.size,
    headers,
    cookies,
    body: result.body,
  };
}

// ─── Axios fallback (browser dev mode) ──────────────────

async function sendViaAxios(rc: RequestConfig): Promise<ResponseData> {
  const config = buildAxiosConfig(rc);
  const startTime = performance.now();

  try {
    const response = await axios(config);
    const duration = Math.round(performance.now() - startTime);

    const headers = Object.entries(response.headers as Record<string, unknown>).map(
      ([k, v], idx) => ({
        id: `rh-${idx}`,
        key: String(k),
        value: String(v),
        description: '',
        enabled: true,
      })
    );

    const setCookieHeaders = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [];
    const cookies = (setCookieHeaders as string[]).map((c, idx) => {
      const semi = c.indexOf(';');
      const kv = semi > 0 ? c.substring(0, semi) : c;
      const eq = kv.indexOf('=');
      return {
        id: `rc-${idx}`,
        name: eq > 0 ? kv.substring(0, eq).trim() : kv.trim(),
        value: eq > 0 ? kv.substring(eq + 1).trim() : '',
      };
    });

    let body: string;
    if (typeof response.data === 'string') {
      body = response.data;
    } else if (typeof response.data === 'object') {
      body = JSON.stringify(response.data, null, 2);
    } else {
      body = String(response.data);
    }

    return {
      statusCode: response.status,
      statusText: response.statusText,
      duration,
      size: new Blob([body]).size,
      headers,
      cookies,
      body,
    };
  } catch (err: unknown) {
    const duration = Math.round(performance.now() - startTime);
    if (axios.isAxiosError(err)) {
      return {
        statusCode: 0,
        statusText: err.code || 'Network Error',
        duration,
        size: 0,
        headers: [],
        cookies: [],
        body: err.message || 'Request failed',
      };
    }
    throw err;
  }
}

function buildAxiosConfig(rc: RequestConfig) {
  const params: Record<string, string> = {};
  for (const q of rc.queryParams) {
    if (q.enabled && q.key) params[q.key] = q.value;
  }

  const headers: Record<string, string> = {};
  for (const h of rc.headers) {
    if (h.enabled && h.key) headers[h.key] = h.value;
  }

  if (rc.cookies.length > 0) {
    const cookieStr = rc.cookies
      .filter((c) => c.name)
      .map((c) => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ');
    if (cookieStr) headers['Cookie'] = cookieStr;
  }

  if (rc.auth.type === 'bearer' && rc.auth.token) {
    headers['Authorization'] = `Bearer ${rc.auth.token}`;
  } else if (rc.auth.type === 'basic' && rc.auth.username && rc.auth.password) {
    const encoded = btoa(`${rc.auth.username}:${rc.auth.password}`);
    headers['Authorization'] = `Basic ${encoded}`;
  }

  let data: unknown = undefined;
  if (rc.body.type !== 'none' && rc.method !== 'GET') {
    switch (rc.body.type) {
      case 'json': {
        if (rc.body.content) {
          try { data = JSON.parse(rc.body.content); } catch { data = rc.body.content; }
        }
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        break;
      }
      case 'raw':
      case 'text':
      case 'xml':
        data = rc.body.content;
        break;
      case 'x-www-form-urlencoded': {
        const formParams = new URLSearchParams();
        for (const p of rc.body.urlEncoded || []) {
          if (p.enabled && p.key) formParams.append(p.key, p.value);
        }
        data = formParams.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      }
      case 'form-data': {
        const fd = new FormData();
        for (const p of rc.body.formData || []) {
          if (p.enabled && p.key) fd.append(p.key, p.value);
        }
        data = fd;
        break;
      }
      case 'binary':
        if (rc.body.content) data = rc.body.content;
        break;
    }
  }

  return {
    method: rc.method.toLowerCase(),
    url: rc.url || '/',
    params: Object.keys(params).length > 0 ? params : undefined,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    data,
    timeout: 30000,
    validateStatus: () => true,
  };
}
