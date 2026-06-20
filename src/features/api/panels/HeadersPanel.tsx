import { KeyValueTable } from '../../../components/key-value-table/KeyValueTable';
import type { KeyValuePair } from '../../../types/api';

interface HeadersPanelProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
}

export function HeadersPanel({ headers, onChange }: HeadersPanelProps) {
  return (
    <KeyValueTable
      rows={headers}
      onChange={onChange}
      showDescription={true}
      showEnabled={true}
      keyPlaceholderKey="headers.keyPlaceholder"
      valuePlaceholderKey="headers.valuePlaceholder"
    />
  );
}
