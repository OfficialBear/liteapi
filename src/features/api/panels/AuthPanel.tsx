import { Select, Input, Empty } from 'antd';
import { useI18n } from '../../../i18n';
import type { AuthConfig, AuthType } from '../../../types/api';

const AUTH_TYPE_OPTIONS: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
];

interface AuthPanelProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export function AuthPanel({ auth, onChange }: AuthPanelProps) {
  const { t } = useI18n();

  const handleTypeChange = (type: AuthType) => {
    const base: AuthConfig = { type };
    if (type === 'bearer') base.token = '';
    if (type === 'basic') { base.username = ''; base.password = ''; }
    onChange(base);
  };

  const renderConfig = () => {
    switch (auth.type) {
      case 'none':
        return (
          <div style={{ padding: '48px 0' }}>
            <Empty description={t('auth.noAuth')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        );
      case 'bearer':
        return (
          <div style={{ padding: '16px 8px' }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{t('auth.token')}</label>
              <Input.TextArea
                value={auth.token || ''}
                onChange={(e) => onChange({ ...auth, token: e.target.value })}
                placeholder={t('auth.tokenPlaceholder')}
                rows={4}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>
          </div>
        );
      case 'basic':
        return (
          <div style={{ padding: '16px 8px' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{t('auth.username')}</label>
              <Input
                value={auth.username || ''}
                onChange={(e) => onChange({ ...auth, username: e.target.value })}
                placeholder={t('auth.usernamePlaceholder')}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{t('auth.password')}</label>
              <Input.Password
                value={auth.password || ''}
                onChange={(e) => onChange({ ...auth, password: e.target.value })}
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ padding: '8px 8px 0' }}>
        <Select value={auth.type} onChange={handleTypeChange} options={AUTH_TYPE_OPTIONS} style={{ width: 160 }} size="small" />
      </div>
      {renderConfig()}
    </div>
  );
}
