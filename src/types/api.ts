export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH';

export type BodyType =
  | 'none'
  | 'json'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'text'
  | 'xml'
  | 'raw'
  | 'binary';

export type AuthType = 'none' | 'bearer' | 'basic';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

export interface CookiePair {
  id: string;
  name: string;
  value: string;
}

export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
}

export interface BodyConfig {
  type: BodyType;
  content: string;
  formData?: KeyValuePair[];
  urlEncoded?: KeyValuePair[];
}
