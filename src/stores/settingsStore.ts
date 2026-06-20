import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'zh';

interface SettingsState {
  theme: ThemeMode;
  language: Language;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  language: 'en',

  setTheme: (theme) => set({ theme }),

  toggleTheme: () => {
    const current = get().theme;
    set({ theme: current === 'light' ? 'dark' : 'light' });
  },

  setLanguage: (language) => set({ language }),
}));
