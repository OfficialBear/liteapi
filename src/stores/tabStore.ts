import { create } from 'zustand';
import type { Tab, RequestConfig, ResponseData } from '../types/tab';
import { createDefaultRequest } from './helpers';
import { saveTabs as dbSaveTabs } from '../tauri-api';
import { sendRequest as httpSend } from '../services/httpClient';

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  sending: boolean;

  addTab: (partial?: Partial<Tab>) => string;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabRequest: (tabId: string, patch: Partial<RequestConfig>) => void;
  setTabResponse: (tabId: string, response: ResponseData) => void;
  cloneTab: (tabId: string) => string | undefined;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  sendRequest: (tabId: string) => Promise<void>;
  restoreTabs: (tabs: Tab[], activeTabId?: string | null) => void;
  updateTabApiId: (tabId: string, apiId: string) => void;
  setTabTitle: (tabId: string, title: string) => void;
  setTabModified: (tabId: string, modified: boolean) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  sending: false,

  addTab: (partial) => {
    const id = crypto.randomUUID();
    const newTab: Tab = {
      id,
      apiId: partial?.apiId,
      saveToFolderId: partial?.saveToFolderId,
      title: partial?.title || 'Untitled',
      request: partial?.request || createDefaultRequest(),
      response: partial?.response || null,
      isModified: false,
    };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));
    return id;
  },

  closeTab: (tabId) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return state;
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActive = state.activeTabId;
      if (state.activeTabId === tabId) {
        if (newTabs.length === 0) {
          newActive = null;
        } else {
          newActive = newTabs[Math.min(idx, newTabs.length - 1)].id;
        }
      }
      return { tabs: newTabs, activeTabId: newActive };
    }),

  closeOtherTabs: (tabId) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id === tabId),
      activeTabId: tabId,
    })),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabRequest: (tabId, patch) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? { ...t, request: { ...t.request, ...patch }, isModified: true }
          : t
      ),
    })),

  setTabResponse: (tabId, response) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, response } : t)),
    })),

  cloneTab: (tabId) => {
    const state = get();
    const source = state.tabs.find((t) => t.id === tabId);
    if (!source) return undefined;
    const id = crypto.randomUUID();
    const cloned: Tab = {
      ...JSON.parse(JSON.stringify(source)),
      id,
      apiId: undefined,
      title: `${source.title} (Copy)`,
      saveToFolderId: source.saveToFolderId,
    };
    set((s) => ({
      tabs: [...s.tabs, cloned],
      activeTabId: id,
    }));
    return id;
  },

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    }),

  sendRequest: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab || get().sending) return;

    set({ sending: true });
    try {
      const response = await httpSend(tab.request);
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, response } : t
        ),
        sending: false,
      }));
    } catch (err) {
      set({ sending: false });
      throw err;
    }
  },

  restoreTabs: (tabs, activeTabId) => {
    set({ tabs, activeTabId: activeTabId ?? (tabs[0]?.id ?? null) });
  },

  updateTabApiId: (tabId, apiId) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, apiId } : t
      ),
    })),

  setTabTitle: (tabId, title) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, title } : t
      ),
    })),

  setTabModified: (tabId, modified) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isModified: modified } : t
      ),
    })),
}));

// Auto-save tabs to DB whenever they change (debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useTabStore.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tabRows = state.tabs.map((t, i) => ({
      id: t.id,
      api_id: t.apiId || null,
      sort: i,
      is_dirty: t.isModified,
    }));
    dbSaveTabs(tabRows).catch(() => {});
  }, 500);
});
