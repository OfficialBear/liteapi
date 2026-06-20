import { Select, Input, Button, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { KeyValueTable } from '../../../components/key-value-table/KeyValueTable';
import { useI18n } from '../../../i18n';
import type { BodyConfig, BodyType } from '../../../types/api';

const BODY_TYPE_OPTIONS: { value: BodyType; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'UrlEncoded' },
  { value: 'raw', label: 'Raw' },
  { value: 'binary', label: 'Binary' },
];

/** Map legacy body types to current options, preserving backward compat */
function normalizeType(type: string): BodyType {
  if (type === 'text' || type === 'xml') return 'raw';
  if (type === 'none') return 'json';
  return type as BodyType;
}

interface BodyPanelProps {
  body: BodyConfig;
  onChange: (body: BodyConfig) => void;
}

function JsonEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    onChange(value);
    if (value.trim()) {
      try {
        JSON.parse(value);
        setError(null);
      } catch {
        setError(t('body.invalidJson'));
      }
    } else {
      setError(null);
    }
  };

  const formatJson = () => {
    if (content.trim()) {
      try {
        const parsed = JSON.parse(content);
        onChange(JSON.stringify(parsed, null, 2));
        setError(null);
      } catch {
        setError(t('body.invalidJson'));
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#999' }}>{t('body.jsonEditor')}</span>
        <Button size="small" onClick={formatJson}>{t('body.format')}</Button>
      </div>
      <div style={{ flex: 1, padding: 8 }}>
        <Input.TextArea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder='{"key": "value"}'
          rows={12}
          style={{
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            border: error ? '1px solid #ff4d4f' : undefined,
          }}
        />
        {error && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{error}</div>}
      </div>
    </div>
  );
}

export function BodyPanel({ body, onChange }: BodyPanelProps) {
  const { t } = useI18n();
  const displayType = normalizeType(body.type);

  const handleTypeChange = (type: BodyType) => {
    onChange({ ...body, type, content: '' });
  };

  const renderEditor = () => {
    switch (displayType) {
      case 'json':
        return <JsonEditor content={body.content} onChange={(content) => onChange({ ...body, content })} />;
      case 'form-data':
        return (
          <KeyValueTable
            rows={body.formData || []}
            onChange={(rows) => onChange({ ...body, formData: rows })}
            showDescription={false}
            showEnabled={true}
            keyPlaceholderKey="body.fieldName"
            valuePlaceholderKey="body.fieldValue"
            showBulkEdit={false}
          />
        );
      case 'x-www-form-urlencoded':
        return (
          <KeyValueTable
            rows={body.urlEncoded || []}
            onChange={(rows) => onChange({ ...body, urlEncoded: rows })}
            showDescription={false}
            showEnabled={true}
            keyPlaceholderKey="body.fieldName"
            valuePlaceholderKey="body.fieldValue"
            showBulkEdit={false}
          />
        );
      case 'raw':
        return (
          <div style={{ padding: 8 }}>
            <Input.TextArea
              value={body.content}
              onChange={(e) => onChange({ ...body, content: e.target.value })}
              placeholder={t('body.rawPlaceholder')}
              rows={12}
              style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace', fontSize: 13, lineHeight: 1.6 }}
            />
          </div>
        );
      case 'binary':
        return (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Upload beforeUpload={() => false} showUploadList={true} maxCount={1}>
              <Button icon={<UploadOutlined />}>{t('body.selectFile')}</Button>
            </Upload>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 8px 0' }}>
        <Select value={displayType} onChange={handleTypeChange} options={BODY_TYPE_OPTIONS} style={{ width: 160 }} size="small" />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{renderEditor()}</div>
    </div>
  );
}
