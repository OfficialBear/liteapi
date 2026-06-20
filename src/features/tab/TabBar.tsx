import { Tabs, Dropdown, Tag, Badge, Modal } from 'antd';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';
import { useTabStore } from '../../stores/tabStore';
import { useI18n } from '../../i18n';
import type { Tab } from '../../types/tab';
import type { HttpMethod } from '../../types/api';

const ADD_TAB_KEY = '__add__';

const METHOD_COLORS: Record<string, string> = {
  GET: '#389e0d', POST: '#1677ff', PUT: '#d48806', DELETE: '#cf1322',
  PATCH: '#d46b08',
};

function MethodBadge({ method }: { method: HttpMethod }) {
  const color = METHOD_COLORS[method] || '#666';
  return (
    <Tag color={color} style={{ fontSize: 10, lineHeight: '14px', padding: '0 3px', marginRight: 4, minWidth: 36, textAlign: 'center', fontWeight: 600 }}>
      {method}
    </Tag>
  );
}

function renderTabLabel(tab: Tab): ReactNode {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <MethodBadge method={tab.request.method} />
      {tab.isModified && <Badge dot style={{ marginRight: 2 }} />}
      <span style={{ fontSize: 12 }}>{tab.title}</span>
    </span>
  );
}

const { confirm } = Modal;

export function TabBar() {
  const { t } = useI18n();
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const closeOtherTabs = useTabStore((s) => s.closeOtherTabs);
  const cloneTab = useTabStore((s) => s.cloneTab);

  /** Check if any of the given tab IDs have unsaved changes */
  const getModifiedTabs = (ids: string[]): Tab[] =>
    tabs.filter((tab) => ids.includes(tab.id) && tab.isModified);

  /** Confirm before closing tabs with unsaved changes. Returns true if OK to proceed. */
  const confirmCloseIfDirty = (ids: string[], action: () => void) => {
    const dirty = getModifiedTabs(ids);
    if (dirty.length === 0) {
      action();
      return;
    }
    const names = dirty.map((t) => `"${t.title}"`).join(', ');
    confirm({
      title: 'Unsaved Changes',
      icon: <ExclamationCircleOutlined />,
      content: `You have unsaved changes in ${names}. Close anyway?`,
      okText: 'Close',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: action,
    });
  };

  // ── Context menu handler ─────────────────

  const handleContextMenuClick = (key: string) => {
    const currentTabId = activeTabId;
    switch (key) {
      case 'close':
        if (currentTabId) confirmCloseIfDirty([currentTabId], () => closeTab(currentTabId));
        break;
      case 'close-others':
        if (currentTabId) {
          const others = tabs.filter((tb) => tb.id !== currentTabId).map((tb) => tb.id);
          confirmCloseIfDirty(others, () => closeOtherTabs(currentTabId));
        }
        break;
      case 'duplicate':
        if (currentTabId) cloneTab(currentTabId);
        break;
    }
  };

  const contextMenuItems: MenuProps['items'] = [
    { key: 'close', label: t('tab.close') },
    { key: 'close-others', label: t('tab.closeOthers') },
    { type: 'divider' },
    { key: 'duplicate', label: t('tab.duplicateTab') },
  ];

  // × button close handler — only for real tabs, not the "+" button
  const handleEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove' && typeof targetKey === 'string' && targetKey !== ADD_TAB_KEY) {
      confirmCloseIfDirty([targetKey], () => closeTab(targetKey));
    }
  };

  // Real tabs + inline "+" button at the end (browser-style)
  const tabItems = [
    ...tabs.map((tab) => ({
      key: tab.id,
      label: renderTabLabel(tab),
      closable: tabs.length > 0,
    })),
    {
      key: ADD_TAB_KEY,
      label: <PlusOutlined style={{ fontSize: 12 }} />,
      closable: false,
    },
  ];

  return (
    <Dropdown
      menu={{ items: contextMenuItems, onClick: ({ key }) => handleContextMenuClick(key) }}
      trigger={['contextMenu']}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          type="editable-card"
          hideAdd
          size="small"
          items={tabItems}
          activeKey={activeTabId ?? undefined}
          onChange={(key) => {
            if (key === ADD_TAB_KEY) {
              addTab({ title: t('tab.untitled') });
              return;
            }
            setActiveTab(key);
          }}
          onEdit={handleEdit}
          tabBarStyle={{ margin: 0, paddingLeft: 8 }}
          style={{ marginBottom: 0 }}
        />
      </div>
    </Dropdown>
  );
}
