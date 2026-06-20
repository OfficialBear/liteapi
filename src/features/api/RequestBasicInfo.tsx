import { Select, Input, Button, Flex, App } from 'antd';
import { SendOutlined, EllipsisOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useTabStore } from '../../stores/tabStore';
import { useFolderStore } from '../../stores/folderStore';
import { CodeGenTrigger } from '../../components/code-gen/CodeGenModal';
import type { Tab } from '../../types/tab';
import type { HttpMethod } from '../../types/api';

function generateId(): string {
  return crypto.randomUUID();
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#389e0d', POST: '#1677ff', PUT: '#d48806', DELETE: '#cf1322',
  PATCH: '#d46b08',
};

function MethodLabel({ method }: { method: string }) {
  return (
    <span style={{
      display: 'inline-block', fontWeight: 700, fontSize: 12,
      color: METHOD_COLORS[method] || '#666', minWidth: 48, textAlign: 'center',
    }}>
      {method}
    </span>
  );
}

interface RequestBasicInfoProps {
  tab: Tab;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
}

export function RequestBasicInfo({ tab, onMethodChange, onUrlChange, onNameChange, onDescriptionChange }: RequestBasicInfoProps) {
  const { t } = useI18n();
  const { message } = App.useApp();
  const sending = useTabStore((s) => s.sending);
  const sendRequest = useTabStore((s) => s.sendRequest);
  const updateTabApiId = useTabStore((s) => s.updateTabApiId);
  const addApi = useFolderStore((s) => s.addApi);
  const setTabModified = useTabStore((s) => s.setTabModified);
  const [showDetails, setShowDetails] = useState(false);

  const handleSend = async () => {
    try { await sendRequest(tab.id); } catch { /* handled in httpClient */ }
  };

  const handleSave = async () => {
    const name = tab.request.name || tab.title || 'Untitled';
    try {
      if (tab.apiId) {
        setTabModified(tab.id, false);
        message.success('Saved');
      } else {
        const api = await addApi(generateId(), tab.saveToFolderId ?? null, name, tab.request.method, tab.request.url);
        updateTabApiId(tab.id, api.id);
        setTabModified(tab.id, false);
        message.success('Saved');
      }
    } catch (e) {
      message.error('Save failed: ' + String(e));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
  };

  return (
    <div>
      <Flex gap={6} align="center">
        <Select
          value={tab.request.method}
          onChange={(v) => onMethodChange(v as HttpMethod)}
          style={{ width: 104 }}
          size="small"
          options={[
            { value: 'GET', label: <MethodLabel method="GET" /> },
            { value: 'POST', label: <MethodLabel method="POST" /> },
            { value: 'PUT', label: <MethodLabel method="PUT" /> },
            { value: 'DELETE', label: <MethodLabel method="DELETE" /> },
            { value: 'PATCH', label: <MethodLabel method="PATCH" /> },
          ]}
        />
        <Input
          value={tab.request.url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('request.urlPlaceholder')}
          allowClear
          size="small"
          style={{ flex: 1 }}
        />
        <Button type="primary" size="small" icon={<SendOutlined />}
          onClick={handleSend} loading={sending} disabled={!tab.request.url.trim()}>
          {t('request.send')}
        </Button>
        <Button type="text" size="small" onClick={handleSave}
          style={{ fontSize: 12 }}>Save</Button>
        <CodeGenTrigger tabId={tab.id} />
        <Button type="text" size="small" icon={<EllipsisOutlined />}
          onClick={() => setShowDetails(!showDetails)}
          title="Details" />
      </Flex>

      {showDetails && (
        <Flex gap={8} style={{ marginTop: 6 }}>
          <Input size="small" value={tab.request.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t('request.namePlaceholder')} style={{ flex: 1 }} />
          <Input size="small" value={tab.request.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t('request.descriptionPlaceholder')} style={{ flex: 2 }} />
        </Flex>
      )}
    </div>
  );
}
