import type { RequestConfig } from '../types/tab';

export function createDefaultRequest(): RequestConfig {
  return {
    method: 'GET',
    url: '',
    name: '',
    description: '',
    queryParams: [],
    pathParams: [],
    headers: [],
    cookies: [],
    auth: { type: 'none' },
    body: { type: 'none', content: '' },
  };
}
