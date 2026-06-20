import { Modal, Button, App } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { generateCode, LANGUAGE_LABELS, type Language } from '../../services/codeGenerator';
import { useTabStore } from '../../stores/tabStore';
import type { RequestConfig } from '../../types/tab';
import './code-gen.css';

interface CodeGenModalProps {
  open: boolean;
  onClose: () => void;
  request: RequestConfig;
}

export function CodeGenModal({ open, onClose, request }: CodeGenModalProps) {
  const { message } = App.useApp();
  const [activeLang, setActiveLang] = useState<Language>('curl');

  const languages: Language[] = ['curl', 'fetch', 'axios', 'python'];
  const code = generateCode(request, activeLang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      message.success('Copied!');
    } catch {
      message.error('Failed to copy');
    }
  };

  return (
    <Modal
      title="Generate Code"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      className="codegen-modal"
    >
      <div className="codegen-container">
        <div className="codegen-sidebar">
          {languages.map((lang) => (
            <div
              key={lang}
              className={`codegen-lang-item ${activeLang === lang ? 'active' : ''}`}
              onClick={() => setActiveLang(lang)}
            >
              {LANGUAGE_LABELS[lang]}
            </div>
          ))}
        </div>
        <div className="codegen-content">
          <div className="codegen-header">
            <span className="codegen-lang-title">{LANGUAGE_LABELS[activeLang]}</span>
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
              Copy
            </Button>
          </div>
          <pre className="codegen-code">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Wrapper component that reads the active tab from the store.
 */
interface CodeGenButtonProps {
  tabId: string;
}

export function CodeGenTrigger({ tabId }: CodeGenButtonProps) {
  const [open, setOpen] = useState(false);
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));

  if (!tab) return null;

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {'</>'}
      </Button>
      <CodeGenModal open={open} onClose={() => setOpen(false)} request={tab.request} />
    </>
  );
}
