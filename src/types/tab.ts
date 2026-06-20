import type { HttpMethod, KeyValuePair, CookiePair, AuthConfig, BodyConfig } from './api';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  name: string;
  description: string;
  queryParams: KeyValuePair[];
  pathParams: KeyValuePair[];
  headers: KeyValuePair[];
  cookies: CookiePair[];
  auth: AuthConfig;
  body: BodyConfig;
}

export interface ResponseData {
  statusCode: number;
  statusText: string;
  duration: number;
  size: number;
  headers: KeyValuePair[];
  cookies: CookiePair[];
  body: string;
}

export interface Tab {
  id: string;
  apiId?: string;
  /** Target folder ID for saving — set when created from a folder context menu */
  saveToFolderId?: string | null;
  title: string;
  request: RequestConfig;
  response: ResponseData | null;
  isModified: boolean;
}
