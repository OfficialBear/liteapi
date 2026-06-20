import { Table, Input, Button, Flex } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useI18n } from '../../../i18n';
import type { CookiePair } from '../../../types/api';

function generateId(): string {
  return crypto.randomUUID();
}

interface CookiesPanelProps {
  cookies: CookiePair[];
  onChange: (cookies: CookiePair[]) => void;
}

export function CookiesPanel({ cookies, onChange }: CookiesPanelProps) {
  const { t } = useI18n();

  const updateRow = (id: string, patch: Partial<CookiePair>) => {
    onChange(cookies.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteRow = (id: string) => {
    onChange(cookies.filter((c) => c.id !== id));
  };

  const addRow = () => {
    onChange([...cookies, { id: generateId(), name: '', value: '' }]);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (_: unknown, record: CookiePair) => (
        <Input
          size="small"
          variant="borderless"
          placeholder={t('cookies.namePlaceholder')}
          value={record.name}
          onChange={(e) => updateRow(record.id, { name: e.target.value })}
          style={{ background: 'transparent' }}
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (_: unknown, record: CookiePair) => (
        <Input
          size="small"
          variant="borderless"
          placeholder={t('cookies.valuePlaceholder')}
          value={record.value}
          onChange={(e) => updateRow(record.id, { value: e.target.value })}
          style={{ background: 'transparent' }}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      render: (_: unknown, record: CookiePair) => (
        <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => deleteRow(record.id)} />
      ),
    },
  ];

  return (
    <div>
      <Table
        dataSource={cookies}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        showHeader={cookies.length > 0}
        locale={{ emptyText: null }}
      />
      <Flex style={{ padding: '4px 8px' }}>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={addRow}>
          {t('cookies.add')}
        </Button>
      </Flex>
    </div>
  );
}
