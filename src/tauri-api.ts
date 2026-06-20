/**
 * Tauri command wrappers. Falls back to mock behavior when running
 * in a browser (non-Tauri context) for development convenience.
 */
import { invoke } from '@tauri-apps/api/core';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// ─── Types ───────────────────────────────────────────────

export interface FolderRow {
  id: string;
  parent_id: string | null;
  name: string;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface ApiRow {
  id: string;
  folder_id: string | null;
  name: string;
  description: string;
  method: string;
  url: string;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface TabRow {
  id: string;
  api_id: string | null;
  sort: number;
  is_dirty: boolean;
}

export interface SettingRow {
  key: string;
  value: string | null;
}

export interface InitData {
  folders: FolderRow[];
  apis: ApiRow[];
  tabs: TabRow[];
  settings: SettingRow[];
}

// ─── API Functions ───────────────────────────────────────

export async function initApp(): Promise<InitData> {
  if (!isTauri()) {
    return { folders: [], apis: [], tabs: [], settings: [] };
  }
  return invoke<InitData>('init_app');
}

export async function createFolder(
  id: string,
  parentId: string | null,
  name: string
): Promise<FolderRow> {
  if (!isTauri()) {
    return { id, parent_id: parentId, name, sort: 0, created_at: '', updated_at: '' };
  }
  return invoke<FolderRow>('create_folder', { id, parentId, name });
}

export async function updateFolder(
  id: string,
  name?: string,
  parentId?: string | null,
  sort?: number
): Promise<void> {
  if (!isTauri()) return;
  return invoke('update_folder', { id, name, parentId, sort });
}

export async function deleteFolder(id: string): Promise<void> {
  if (!isTauri()) return;
  return invoke('delete_folder', { id });
}

export async function createApi(
  id: string,
  folderId: string | null,
  name: string,
  method: string,
  url: string
): Promise<ApiRow> {
  if (!isTauri()) {
    return { id, folder_id: folderId, name, description: '', method, url, sort: 0, created_at: '', updated_at: '' };
  }
  return invoke<ApiRow>('create_api', { id, folderId, name, method, url });
}

export async function deleteApi(id: string): Promise<void> {
  if (!isTauri()) return;
  return invoke('delete_api', { id });
}

export async function updateApi(
  id: string,
  name?: string,
  method?: string,
  url?: string,
  folderId?: string | null
): Promise<void> {
  if (!isTauri()) return;
  return invoke('update_api', { id, name, method, url, folderId });
}

export async function copyFolder(
  sourceId: string,
  newParentId: string | null,
  newName: string
): Promise<FolderRow> {
  if (!isTauri()) {
    return { id: crypto.randomUUID(), parent_id: newParentId, name: newName, sort: 0, created_at: '', updated_at: '' };
  }
  return invoke<FolderRow>('copy_folder', { sourceId, newParentId, newName });
}

export async function copyApi(
  sourceId: string,
  targetFolderId: string | null,
  newName: string
): Promise<ApiRow> {
  if (!isTauri()) {
    return { id: crypto.randomUUID(), folder_id: targetFolderId, name: newName, description: '', method: 'GET', url: '', sort: 0, created_at: '', updated_at: '' };
  }
  return invoke<ApiRow>('copy_api', { sourceId, targetFolderId, newName });
}

export async function saveTabs(tabs: TabRow[]): Promise<void> {
  if (!isTauri()) return;
  return invoke('save_tabs', { tabs });
}

export async function getSetting(key: string): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>('get_setting', { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!isTauri()) return;
  return invoke('set_setting', { key, value });
}

export async function exportAllData(): Promise<string> {
  if (!isTauri()) return '{}';
  return invoke<string>('export_all_data');
}

export async function importAllData(jsonStr: string): Promise<void> {
  if (!isTauri()) return;
  return invoke('import_all_data', { jsonStr });
}

// ─── HTTP Request (via Rust backend, no CORS) ────────────

export interface HttpRequestConfig {
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  query_params: { key: string; value: string; enabled: boolean }[];
  body_type: string;
  body_content: string;
  auth_type: string;
  auth_token?: string | null;
  auth_username?: string | null;
  auth_password?: string | null;
}

export interface HttpResponseData {
  status: number;
  status_text: string;
  duration: number;
  size: number;
  headers: Record<string, string>;
  body: string;
}

export async function sendHttpRequest(config: HttpRequestConfig): Promise<HttpResponseData> {
  if (!isTauri()) {
    throw new Error('HTTP requests require Tauri runtime');
  }
  return invoke<HttpResponseData>('send_http_request', { config });
}
