import { Table, Empty, Spin, Tag, Typography, theme, Segmented } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { ResponseBodyPanel } from './ResponseBodyPanel';
import { useI18n } from '../../i18n';
import { useTabStore } from '../../stores/tabStore';
import type { Tab } from '../../types/tab';
import type { KeyValuePair, CookiePair } from '../../types/api';
import './response.css';

const { Text } = Typography;

type RespTab = 'body' | 'headers' | 'cookies';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ResponseTable({ data, emptyKey, columns }: {
  data: KeyValuePair[] | CookiePair[];
  emptyKey: string;
  columns: { title: string; dataIndex: string; key: string; width: string }[];
}) {
  const { t } = useI18n();
  if (data.length === 0) {
    return <Empty description={t(emptyKey)} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />;
  }
  return <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={false} />;
}

interface ResponseViewerProps {
  tab: Tab;
}

export function ResponseViewer({ tab }: ResponseViewerProps) {
  const { t } = useI18n();
  const { token } = theme.useToken();
  const sending = useTabStore((s) => s.sending);
  const response = tab.response;
  const [activeTab, setActiveTab] = useState<RespTab>('body');

  const hdrCols = useMemo(() => [
    { title: 'Key', dataIndex: 'key', key: 'key', width: '40%' },
    { title: 'Value', dataIndex: 'value', key: 'value', width: '60%' },
  ], []);

  const ckCols = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', width: '40%' },
    { title: 'Value', dataIndex: 'value', key: 'value', width: '60%' },
  ], []);

  if (sending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, fontSize: 12, color: token.colorTextSecondary }}>
          Sending request...
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Empty description={t('response.sendToGet')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const isSuccess = response.statusCode >= 200 && response.statusCode < 300;

  const tabOptions: { value: RespTab; label: string }[] = [
    { value: 'body', label: t('subTabs.body') },
    { value: 'headers', label: t('subTabs.headers') },
    { value: 'cookies', label: t('subTabs.cookies') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Fixed header: status info + tab buttons on one row */}
      <div style={{
        flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 12px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color={isSuccess ? 'success' : 'error'} style={{ margin: 0 }}>
            {response.statusCode} {response.statusText}
          </Tag>
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            {t('response.time')}: {response.duration}ms
          </Text>
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            {t('response.size')}: {formatSize(response.size)}
          </Text>
        </div>
        <Segmented
          size="small"
          value={activeTab}
          onChange={(v) => setActiveTab(v as RespTab)}
          options={tabOptions}
        />
      </div>

      {/* Content fills remaining space; each panel handles its own scrolling */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'body' && <ResponseBodyPanel body={response.body} />}
        {activeTab === 'headers' && <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}><ResponseTable data={response.headers} emptyKey="response.noHeaders" columns={hdrCols} /></div>}
        {activeTab === 'cookies' && <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}><ResponseTable data={response.cookies} emptyKey="response.noCookies" columns={ckCols} /></div>}
      </div>
    </div>
  );
}
