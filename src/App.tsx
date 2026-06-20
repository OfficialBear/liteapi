import { ConfigProvider, theme, Layout, App as AntApp } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTabStore } from './stores/tabStore';
import { useSettingsStore } from './stores/settingsStore';
import { useFolderStore } from './stores/folderStore';
import { Sidebar } from './features/sidebar/Sidebar';
import { TabBar } from './features/tab/TabBar';
import { RequestEditor } from './features/api/RequestEditor';
import { ResponseViewer } from './features/response/ResponseViewer';
import { useI18n } from './i18n';
import './App.css';

const { Content } = Layout;

const antdLocales = {
  en: enUS,
  zh: zhCN,
};

const MIN_REQUEST_PCT = 20;
const MAX_REQUEST_PCT = 85;

function AppInner() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const loadFromDb = useFolderStore((s) => s.loadFromDb);
  const loaded = useFolderStore((s) => s.loaded);
  const persistedTabs = useFolderStore((s) => s.persistedTabs);
  const folders = useFolderStore((s) => s.folders);
  const apis = useFolderStore((s) => s.apis);
  const restoreTabs = useTabStore((s) => s.restoreTabs);
  const addTab = useTabStore((s) => s.addTab);

  const themeMode = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const { t } = useI18n();

  const [splitPct, setSplitPct] = useState(60);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const dragging = useRef<'vertical' | 'horizontal' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Init from database
  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // Restore tabs after data loads
  useEffect(() => {
    if (!loaded || !persistedTabs) return;
    if (tabs.length > 0) return; // already restored

    if (persistedTabs.length > 0) {
      // Reconstruct tabs from DB data
      const restored = persistedTabs
        .sort((a, b) => a.sort - b.sort)
        .map((pt) => {
          const api = pt.api_id ? apis.find((a) => a.id === pt.api_id) : null;
          if (api) {
            return {
              id: pt.id,
              apiId: api.id,
              title: api.name,
              request: {
                method: api.method as import('./types/api').HttpMethod,
                url: api.url,
                name: api.name,
                description: api.description,
                queryParams: [],
                pathParams: [],
                headers: [],
                cookies: [],
                auth: { type: 'none' as const },
                body: { type: 'none' as const, content: '' },
              },
              response: null,
              isModified: pt.is_dirty,
            } satisfies import('./types/tab').Tab;
          }
          // Tab without API — create blank
          return {
            id: pt.id,
            title: 'Untitled',
            request: {
              method: 'GET' as const, url: '', name: '', description: '',
              queryParams: [], pathParams: [], headers: [], cookies: [],
              auth: { type: 'none' as const }, body: { type: 'none' as const, content: '' },
            },
            response: null,
            isModified: false,
          } satisfies import('./types/tab').Tab;
        });
      restoreTabs(restored, persistedTabs[0]?.id ?? null);
    } else {
      // No persisted tabs — open welcome tab from first demo API
      const firstApi = apis[0];
      if (firstApi) {
        addTab({
          apiId: firstApi.id,
          title: firstApi.name,
          request: {
            method: firstApi.method as import('./types/api').HttpMethod,
            url: firstApi.url,
            name: firstApi.name,
            description: firstApi.description,
            queryParams: [], pathParams: [], headers: [], cookies: [],
            auth: { type: 'none' }, body: { type: 'none', content: '' },
          },
        });
      } else if (folders.length > 0) {
        addTab();
      }
    }
  }, [loaded, persistedTabs]);

  const isDark = themeMode === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [isDark, themeMode]);

  // ── Sidebar resize ──────────────────────────
  const handleSidebarDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = 'vertical';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // ── Request/Response split resize ───────────
  const handleSplitDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = 'horizontal';
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;

      if (dragging.current === 'vertical' && layoutRef.current) {
        const rect = layoutRef.current.getBoundingClientRect();
        const w = e.clientX - rect.left;
        setSidebarWidth(Math.min(500, Math.max(180, w)));
      }

      if (dragging.current === 'horizontal' && contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const totalHeight = rect.height;
        if (totalHeight <= 0) return;
        const pct = (offsetY / totalHeight) * 100;
        setSplitPct(Math.min(MAX_REQUEST_PCT, Math.max(MIN_REQUEST_PCT, pct)));
      }
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Auto-scroll to the response panel when a response arrives
  useEffect(() => {
    if (activeTab?.response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeTab?.response]);

  return (
    <ConfigProvider
      locale={antdLocales[language]}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <AntApp>
        <Layout className={`liteapi-layout ${isDark ? 'liteapi-dark' : ''}`} hasSider ref={layoutRef}>
          <Sidebar width={sidebarWidth} />

          {/* Sidebar resize handle */}
          <div
            className="liteapi-sidebar-divider"
            onMouseDown={handleSidebarDividerDown}
          >
            <div className="liteapi-sidebar-divider-handle" />
          </div>

          <div className="liteapi-right">
            <div className="liteapi-tabbar">
              <TabBar />
            </div>

            <Content className="liteapi-content" ref={contentRef}>
              {activeTab ? (
                <>
                  <div className="liteapi-request" style={{ flex: 'none', height: `${splitPct}%` }}>
                    <RequestEditor tab={activeTab} />
                  </div>
                  <div className="liteapi-divider" onMouseDown={handleSplitDividerDown}>
                    <div className="liteapi-divider-handle" />
                  </div>
                  <div className="liteapi-response" style={{ flex: 1 }} ref={responseRef}>
                    <ResponseViewer tab={activeTab} />
                  </div>
                </>
              ) : (
                <div className="liteapi-empty-content">
                  {loaded ? t('app.emptyContent') : 'Loading...'}
                </div>
              )}
            </Content>
          </div>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

function App() {
  return <AppInner />;
}

export default App;
