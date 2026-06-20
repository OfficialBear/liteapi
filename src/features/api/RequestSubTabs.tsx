import { Tabs } from 'antd';
import { HeadersPanel } from './panels/HeadersPanel';
import { CookiesPanel } from './panels/CookiesPanel';
import { ParamsPanel } from './panels/ParamsPanel';
import { BodyPanel } from './panels/BodyPanel';
import { AuthPanel } from './panels/AuthPanel';
import { useTabStore } from '../../stores/tabStore';
import { useI18n } from '../../i18n';
import type { Tab } from '../../types/tab';
import type { KeyValuePair, CookiePair, AuthConfig, BodyConfig } from '../../types/api';

interface RequestSubTabsProps {
  tab: Tab;
  onQueryChange?: (params: KeyValuePair[]) => void;
}

export function RequestSubTabs({ tab, onQueryChange }: RequestSubTabsProps) {
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const { t } = useI18n();

  const handleHeadersChange = (headers: KeyValuePair[]) => {
    updateTabRequest(tab.id, { headers });
  };

  const handleQueryChange = (params: KeyValuePair[]) => {
    if (onQueryChange) {
      onQueryChange(params);
    } else {
      updateTabRequest(tab.id, { queryParams: params });
    }
  };

  const handleCookiesChange = (cookies: CookiePair[]) => {
    updateTabRequest(tab.id, { cookies });
  };

  const handleAuthChange = (auth: AuthConfig) => {
    updateTabRequest(tab.id, { auth });
  };

  const handleBodyChange = (body: BodyConfig) => {
    updateTabRequest(tab.id, { body });
  };

  const showBody = tab.request.method !== 'GET';

  const items = [
    {
      key: 'params',
      label: t('subTabs.params'),
      children: (
        <ParamsPanel
          pathParams={tab.request.pathParams}
          queryParams={tab.request.queryParams}
          url={tab.request.url}
          onQueryChange={handleQueryChange}
        />
      ),
    },
    {
      key: 'headers',
      label: t('subTabs.headers'),
      children: <HeadersPanel headers={tab.request.headers} onChange={handleHeadersChange} />,
    },
    {
      key: 'cookies',
      label: t('subTabs.cookies'),
      children: <CookiesPanel cookies={tab.request.cookies} onChange={handleCookiesChange} />,
    },
    {
      key: 'auth',
      label: t('subTabs.auth'),
      children: <AuthPanel auth={tab.request.auth} onChange={handleAuthChange} />,
    },
    ...(showBody
      ? [{
          key: 'body',
          label: t('subTabs.body'),
          children: <BodyPanel body={tab.request.body} onChange={handleBodyChange} />,
        }]
      : []),
  ];

  return (
    <div style={{ marginTop: 12, flex: 1, overflow: 'auto' }}>
      <Tabs size="small" items={items} defaultActiveKey="params" destroyInactiveTabPane={false} tabBarStyle={{ paddingLeft: 12 }} />
    </div>
  );
}
