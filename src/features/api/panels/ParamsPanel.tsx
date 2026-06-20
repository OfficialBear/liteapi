import { KeyValueTable } from '../../../components/key-value-table/KeyValueTable';
import { useMemo } from 'react';
import { useI18n } from '../../../i18n';
import type { KeyValuePair } from '../../../types/api';

interface ParamsPanelProps {
  pathParams: KeyValuePair[];
  queryParams: KeyValuePair[];
  url: string;
  onQueryChange: (params: KeyValuePair[]) => void;
}

export function ParamsPanel({ pathParams, queryParams, url, onQueryChange }: ParamsPanelProps) {
  const { t } = useI18n();

  const generatedPathParams = useMemo((): KeyValuePair[] => {
    const matches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (!matches) return [];
    const paramNames = matches.map((m) => m.substring(1));
    const existingMap = new Map(pathParams.map((p) => [p.key, p.value]));
    return paramNames.map((name, idx) => ({
      id: `path-${idx}`,
      key: name,
      value: existingMap.get(name) || '',
      description: '',
      enabled: true,
    }));
  }, [url, pathParams]);

  return (
    <div>
      {generatedPathParams.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, color: '#999', padding: '4px 8px', marginBottom: 4,
            fontWeight: 600, textTransform: 'uppercase',
          }}>
            {t('params.pathParams')}
          </div>
          <div style={{
            padding: '4px 8px', fontSize: 11, color: '#bbb',
            background: 'var(--bg-elevated, #fafafa)', borderRadius: 4, marginBottom: 4,
          }}>
            {t('params.pathHint')}
          </div>
          <KeyValueTable
            rows={generatedPathParams}
            onChange={() => {}}
            showDescription={false}
            showEnabled={false}
            readonly={true}
            showBulkEdit={false}
          />
        </div>
      )}
      <div>
        <div style={{
          fontSize: 11, color: '#999', padding: '4px 8px', marginBottom: 4,
          fontWeight: 600, textTransform: 'uppercase',
        }}>
          {t('params.queryParams')}
        </div>
        <KeyValueTable
          rows={queryParams}
          onChange={onQueryChange}
          showDescription={true}
          showEnabled={true}
          keyPlaceholderKey="params.keyPlaceholder"
          valuePlaceholderKey="params.valuePlaceholder"
        />
      </div>
    </div>
  );
}
