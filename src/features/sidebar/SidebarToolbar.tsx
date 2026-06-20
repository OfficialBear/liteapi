import { Input, Button, Flex } from 'antd';
import { FolderAddOutlined, PlusOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n';

interface SidebarToolbarProps {
  onSearch: (value: string) => void;
  onNewFolder: () => void;
  onNewApi: () => void;
}

export function SidebarToolbar({ onSearch, onNewFolder, onNewApi }: SidebarToolbarProps) {
  const { t } = useI18n();

  return (
    <div style={{ padding: '8px', overflow: 'hidden' }}>
      <Input.Search
        placeholder={t('sidebar.search')}
        allowClear
        size="small"
        onSearch={onSearch}
        onChange={(e) => {
          if (!e.target.value) onSearch('');
        }}
      />
      <Flex gap={4} style={{ marginTop: 8 }}>
        <Button icon={<FolderAddOutlined />} size="small" type="text" style={{ flex: 1, minWidth: 0 }} onClick={onNewFolder}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('sidebar.newFolder')}</span>
        </Button>
        <Button icon={<PlusOutlined />} size="small" type="primary" style={{ flex: 1, minWidth: 0 }} onClick={onNewApi}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('sidebar.newApi')}</span>
        </Button>
      </Flex>
    </div>
  );
}
