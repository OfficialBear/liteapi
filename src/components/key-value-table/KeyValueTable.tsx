import { Table, Input, Checkbox, Button, Flex, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useI18n } from '../../i18n';
import type { KeyValuePair } from '../../types/api';
import './key-value-table.css';

function generateId(): string {
  return crypto.randomUUID();
}

function createEmptyRow(): KeyValuePair {
  return { id: generateId(), key: '', value: '', description: '', enabled: true };
}

interface KeyValueTableProps {
  rows: KeyValuePair[];
  onChange: (rows: KeyValuePair[]) => void;
  showDescription?: boolean;
  showEnabled?: boolean;
  readonly?: boolean;
  keyPlaceholderKey?: string;
  valuePlaceholderKey?: string;
  showBulkEdit?: boolean;
}

export function KeyValueTable({
  rows,
  onChange,
  showDescription = true,
  showEnabled = true,
  readonly = false,
  keyPlaceholderKey = 'kvTable.key',
  valuePlaceholderKey = 'kvTable.value',
  showBulkEdit = true,
}: KeyValueTableProps) {
  const { t } = useI18n();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const keyPlaceholder = t(keyPlaceholderKey);
  const valuePlaceholder = t(valuePlaceholderKey);

  const updateRow = (id: string, patch: Partial<KeyValuePair>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    onChange([...rows, createEmptyRow()]);
  };

  const openBulkEdit = () => {
    const text = rows
      .filter((r) => r.key)
      .map((r) => `${r.key}: ${r.value}`)
      .join('\n');
    setBulkText(text);
    setBulkEditOpen(true);
  };

  const applyBulkEdit = () => {
    const newRows: KeyValuePair[] = bulkText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          return { id: generateId(), key: line.trim(), value: '', description: '', enabled: true };
        }
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        return { id: generateId(), key, value, description: '', enabled: true };
      });
    const existingDisabled = rows.filter((r) => !r.enabled);
    onChange([...newRows, ...existingDisabled]);
    setBulkEditOpen(false);
  };

  const columns = [];
  if (showEnabled) {
    columns.push({
      title: '',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 36,
      render: (_: unknown, record: KeyValuePair) => (
        <Checkbox
          checked={record.enabled}
          onChange={(e) => updateRow(record.id, { enabled: e.target.checked })}
          disabled={readonly}
        />
      ),
    });
  }

  columns.push({
    title: t('kvTable.key'),
    dataIndex: 'key',
    key: 'key',
    width: '25%',
    render: (_: unknown, record: KeyValuePair) =>
      readonly ? (
        <span style={{ fontSize: 13 }}>{record.key}</span>
      ) : (
        <Input
          size="small"
          variant="borderless"
          placeholder={keyPlaceholder}
          value={record.key}
          onChange={(e) => updateRow(record.id, { key: e.target.value })}
          style={{ background: 'transparent' }}
        />
      ),
  });

  columns.push({
    title: t('kvTable.value'),
    dataIndex: 'value',
    key: 'value',
    width: '25%',
    render: (_: unknown, record: KeyValuePair) =>
      readonly ? (
        <span style={{ fontSize: 13 }}>{record.value}</span>
      ) : (
        <Input
          size="small"
          variant="borderless"
          placeholder={valuePlaceholder}
          value={record.value}
          onChange={(e) => updateRow(record.id, { value: e.target.value })}
          style={{ background: 'transparent' }}
        />
      ),
  });

  if (showDescription) {
    columns.push({
      title: t('kvTable.description'),
      dataIndex: 'description',
      key: 'description',
      render: (_: unknown, record: KeyValuePair) => (
        <Input
          size="small"
          variant="borderless"
          placeholder="Description"
          value={record.description}
          onChange={(e) => updateRow(record.id, { description: e.target.value })}
          style={{ background: 'transparent' }}
          disabled={readonly}
        />
      ),
    });
  }

  if (!readonly) {
    columns.push({
      title: '',
      key: 'actions',
      width: 40,
      render: (_: unknown, record: KeyValuePair) => (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          danger
          onClick={() => deleteRow(record.id)}
          style={{ visibility: rows.length > 1 ? 'visible' : 'hidden' }}
        />
      ),
    });
  }

  return (
    <div className="kv-table">
      <Table
        dataSource={rows}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        bordered={false}
        showHeader={rows.length > 0}
        locale={{ emptyText: null }}
      />
      <Flex justify="space-between" style={{ padding: '4px 8px' }}>
        <Flex gap={8}>
          {!readonly && (
            <Button type="link" size="small" icon={<PlusOutlined />} onClick={addRow}>
              {t('headers.add')}
            </Button>
          )}
        </Flex>
        {showBulkEdit && !readonly && (
          <Button type="link" size="small" icon={<EditOutlined />} onClick={openBulkEdit}>
            {t('headers.bulkEdit')}
          </Button>
        )}
      </Flex>

      <Modal
        title={t('headers.bulkEditTitle')}
        open={bulkEditOpen}
        onOk={applyBulkEdit}
        onCancel={() => setBulkEditOpen(false)}
        width={500}
        okText={t('headers.apply')}
        cancelText={t('headers.cancel')}
      >
        <Input.TextArea
          rows={10}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={t('headers.bulkEditPlaceholder')}
          style={{ fontFamily: 'monospace' }}
        />
      </Modal>
    </div>
  );
}
