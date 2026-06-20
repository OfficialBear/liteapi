import { create } from 'zustand';
import {
  initApp,
  createFolder as dbCreateFolder,
  updateFolder as dbUpdateFolder,
  deleteFolder as dbDeleteFolder,
  createApi as dbCreateApi,
  updateApi as dbUpdateApi,
  deleteApi as dbDeleteApi,
  copyFolder as dbCopyFolder,
  copyApi as dbCopyApi,
  type FolderRow,
  type ApiRow,
  type TabRow,
} from '../tauri-api';

interface FolderState {
  folders: FolderRow[];
  apis: ApiRow[];
  loaded: boolean;
  persistedTabs: TabRow[] | null;

  // Init
  loadFromDb: () => Promise<void>;

  // Folder CRUD
  addFolder: (id: string, parentId: string | null, name: string) => Promise<FolderRow>;
  renameFolder: (id: string, name: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, newParentId: string | null) => Promise<void>;

  // API CRUD
  addApi: (id: string, folderId: string | null, name: string, method: string, url: string) => Promise<ApiRow>;
  renameApi: (id: string, name: string) => Promise<void>;
  removeApi: (id: string) => Promise<void>;
  moveApi: (id: string, newFolderId: string | null) => Promise<void>;
  copyApi: (sourceId: string, targetFolderId: string | null, newName: string) => Promise<ApiRow>;
  copyFolder: (sourceId: string, newParentId: string | null, newName: string) => Promise<FolderRow>;

  // Seed
  seedDemoData: () => Promise<void>;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  apis: [],
  loaded: false,
  persistedTabs: null,

  loadFromDb: async () => {
    if (get().loaded) return; // Prevent double-init (React StrictMode re-runs effects)
    try {
      const data = await initApp();
      if (data.folders.length > 0 || data.apis.length > 0) {
        set({ folders: data.folders, apis: data.apis, loaded: true, persistedTabs: data.tabs });
      } else {
        // Empty DB — create demo data
        await get().seedDemoData();
        set({ persistedTabs: [] });
      }
    } catch {
      // Fallback: Tauri not available, use demo data
      await get().seedDemoData();
      set({ persistedTabs: [] });
    }
  },

  // ── Folder CRUD ────────────────────────────────

  addFolder: async (id, parentId, name) => {
    const folder = await dbCreateFolder(id, parentId, name);
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  renameFolder: async (id, name) => {
    await dbUpdateFolder(id, name);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  },

  removeFolder: async (id) => {
    await dbDeleteFolder(id);
    set((s) => {
      // Collect all descendant folder IDs to remove
      const toRemove = new Set<string>();
      const collectChildren = (parentId: string) => {
        s.folders
          .filter((f) => f.parent_id === parentId)
          .forEach((f) => {
            toRemove.add(f.id);
            collectChildren(f.id);
          });
      };
      toRemove.add(id);
      collectChildren(id);

      return {
        folders: s.folders.filter((f) => !toRemove.has(f.id)),
        apis: s.apis.filter((a) => !(a.folder_id && toRemove.has(a.folder_id)) && a.folder_id !== id),
      };
    });
  },

  moveFolder: async (id, newParentId) => {
    await dbUpdateFolder(id, undefined, newParentId);
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, parent_id: newParentId } : f
      ),
    }));
  },

  // ── API CRUD ───────────────────────────────────

  addApi: async (id, folderId, name, method, url) => {
    const api = await dbCreateApi(id, folderId, name, method, url);
    set((s) => ({ apis: [...s.apis, api] }));
    return api;
  },

  renameApi: async (id, name) => {
    // API rename goes through updateTabRequest for now,
    // but we also update the apis list
    set((s) => ({
      apis: s.apis.map((a) => (a.id === id ? { ...a, name } : a)),
    }));
  },

  removeApi: async (id) => {
    await dbDeleteApi(id);
    set((s) => ({
      apis: s.apis.filter((a) => a.id !== id),
    }));
  },

  moveApi: async (id, newFolderId) => {
    await dbUpdateApi(id, undefined, undefined, undefined, newFolderId);
    set((s) => ({
      apis: s.apis.map((a) =>
        a.id === id ? { ...a, folder_id: newFolderId } : a
      ),
    }));
  },

  copyFolder: async (sourceId, newParentId, newName) => {
    const folder = await dbCopyFolder(sourceId, newParentId, newName);
    // Reload from DB to get full tree
    const data = await initApp();
    set({ folders: data.folders, apis: data.apis });
    return folder;
  },

  copyApi: async (sourceId, targetFolderId, newName) => {
    const api = await dbCopyApi(sourceId, targetFolderId, newName);
    set((s) => ({ apis: [...s.apis, api] }));
    return api;
  },

  // ── Seed Demo Data ─────────────────────────────

  seedDemoData: async () => {
    const { addFolder, addApi } = get();

    const fid1 = generateId();
    const fid2 = generateId();
    const fid3 = generateId();
    const fid4 = generateId();

    await addFolder(fid1, null, '用户模块');
    await addFolder(fid2, fid1, '用户详情');
    await addApi(generateId(), fid2, '获取用户详情', 'GET', '/users/:id');
    await addApi(generateId(), fid2, '更新用户信息', 'PUT', '/users/:id');
    await addApi(generateId(), fid1, '获取用户列表', 'GET', '/users');
    await addApi(generateId(), fid1, '创建用户', 'POST', '/users');

    await addFolder(fid3, null, '订单模块');
    await addApi(generateId(), fid3, '获取订单列表', 'GET', '/orders');
    await addApi(generateId(), fid3, '创建订单', 'POST', '/orders');

    await addFolder(fid4, null, '认证模块');
    await addApi(generateId(), fid4, '登录', 'POST', '/auth/login');
    await addApi(generateId(), fid4, '登出', 'POST', '/auth/logout');

    set({ loaded: true });
  },
}));
