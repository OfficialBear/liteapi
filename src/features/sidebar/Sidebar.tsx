import { Layout, Modal, Input, App, Select, Button, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { SidebarToolbar } from './SidebarToolbar';
import { FolderTree } from './FolderTree';
import { useFolderStore } from '../../stores/folderStore';
import { useTabStore } from '../../stores/tabStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useI18n } from '../../i18n';
import type { Language } from '../../stores/settingsStore';
import './sidebar.css';

interface SidebarProps {
  width: number;
}

const LANG_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
];

const { Sider } = Layout;

function generateId(): string {
  return crypto.randomUUID();
}

export function Sidebar({ width }: SidebarProps) {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [searchValue, setSearchValue] = useState('');
  const [createModal, setCreateModal] = useState<{ open: boolean; type: 'folder' | 'api' }>({ open: false, type: 'folder' });
  const [newName, setNewName] = useState('');

  const addFolder = useFolderStore((s) => s.addFolder);
  const addTab = useTabStore((s) => s.addTab);
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;

    if (createModal.type === 'folder') {
      await addFolder(generateId(), null, name);
      message.success(t('sidebar.newFolder') + ' OK');
    } else {
      // Open a blank tab — save will default to root
      addTab({
        title: name || 'Untitled',
        saveToFolderId: null,
        request: {
          method: 'GET', url: '', name: name || '', description: '',
          queryParams: [], pathParams: [], headers: [], cookies: [],
          auth: { type: 'none' }, body: { type: 'none', content: '' },
        },
      });
    }
    setCreateModal({ open: false, type: 'folder' });
    setNewName('');
  };

  return (
    <Sider className="liteapi-sidebar" width={width} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <SidebarToolbar
          onSearch={setSearchValue}
          onNewFolder={() => { setCreateModal({ open: true, type: 'folder' }); setNewName(''); }}
          onNewApi={() => { setCreateModal({ open: true, type: 'api' }); setNewName(''); }}
        />
        <FolderTree searchValue={searchValue} />
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: '6px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Select
            size="small"
            value={language}
            onChange={(v) => setLanguage(v as Language)}
            options={LANG_OPTIONS}
            style={{ width: 72 }}
            variant="borderless"
          />
          <Tooltip title={theme === 'light' ? 'Dark' : 'Light'}>
            <Button
              type="text"
              size="small"
              icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
              onClick={toggleTheme}
            />
          </Tooltip>
        </div>
      </div>

      <Modal
        title={createModal.type === 'folder' ? t('sidebar.newFolder') : t('sidebar.newApi')}
        open={createModal.open}
        onOk={handleCreate}
        onCancel={() => setCreateModal({ open: false, type: 'folder' })}
        okText={t('headers.apply')}
        cancelText={t('headers.cancel')}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={createModal.type === 'folder' ? 'Folder name' : 'API name'}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          autoFocus
        />
      </Modal>
    </Sider>
  );
}
