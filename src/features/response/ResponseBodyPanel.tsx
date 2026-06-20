import { Segmented, Empty, Typography, theme, Button, App } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useI18n } from '../../i18n';

const { Paragraph } = Typography;
type BodyMode = 'pretty' | 'raw' | 'preview';

interface ResponseBodyPanelProps {
  body: string;
}

export function ResponseBodyPanel({ body }: ResponseBodyPanelProps) {
  const { t } = useI18n();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [mode, setMode] = useState<BodyMode>('pretty');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      message.success('Copied');
    } catch {
      message.error('Copy failed');
    }
  };

  if (!body) {
    return <Empty description={t('response.noBody')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />;
  }

  const preStyle = {
    padding: 16,
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    margin: 0,
    color: token.colorText,
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
  };

  const renderBody = () => {
    if (mode === 'pretty') {
      try {
        const parsed = JSON.parse(body);
        return <pre style={preStyle}>{JSON.stringify(parsed, null, 2)}</pre>;
      } catch {
        return <Paragraph style={{ padding: 8 }}>{body}</Paragraph>;
      }
    }
    if (mode === 'raw') {
      return (
        <pre style={{ ...preStyle, background: 'transparent', whiteSpace: 'pre-wrap', wordBreak: 'break-all' as const }}>
          {body}
        </pre>
      );
    }
    // preview
    try {
      JSON.parse(body);
      return (
        <div style={{ padding: 16 }}>
          <pre style={{ margin: 0, fontSize: 13, fontFamily: 'Menlo, Monaco, "Courier New", monospace', color: token.colorText }}>
            {JSON.stringify(JSON.parse(body), null, 2)}
          </pre>
        </div>
      );
    } catch {
      return <Paragraph style={{ padding: 16 }}>{body}</Paragraph>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky mode selector */}
      <div style={{
        flex: 'none', padding: '4px 16px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as BodyMode)}
          options={[
            { label: t('response.pretty'), value: 'pretty' },
            { label: t('response.raw'), value: 'raw' },
            { label: t('response.preview'), value: 'preview' },
          ]}
        />
        <Button type="text" size="small" icon={<CopyOutlined />} onClick={handleCopy} />
      </div>
      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: 'auto' }}>{renderBody()}</div>
    </div>
  );
}
