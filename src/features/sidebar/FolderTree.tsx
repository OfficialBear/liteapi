import { Tree, Dropdown, Tag, Empty, Input, Modal, App } from 'antd';
import { FolderOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useState, useMemo } from 'react';
import type { TreeNode } from '../../types/folder';
import { useFolderStore } from '../../stores/folderStore';
import { useTabStore } from '../../stores/tabStore';
import { useI18n } from '../../i18n';
import type { HttpMethod } from '../../types/api';

const METHOD_COLORS: Record<string, string> = {
  GET: '#389e0d', POST: '#1677ff', PUT: '#d48806', DELETE: '#cf1322',
  PATCH: '#d46b08',
};
const { confirm } = Modal;

function generateId(): string { return crypto.randomUUID(); }

interface FlatFolder { id: string; parent_id: string | null; name: string; }
interface FlatApi { id: string; folder_id: string | null; name: string; method: string; url: string; description: string; }

function renderMethodBadge(method?: HttpMethod) {
  if (!method) return null;
  const color = METHOD_COLORS[method] || '#666';
  return <Tag color={color} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', marginRight: 6, minWidth: 42, textAlign: 'center', fontWeight: 600 }}>{method}</Tag>;
}

function buildTree(folders: FlatFolder[], apis: FlatApi[]): TreeNode[] {
  const folderMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const f of folders) {
    folderMap.set(f.id, { key: f.id, type: 'folder', title: f.name, isLeaf: false, children: [] });
  }
  for (const f of folders) {
    const node = folderMap.get(f.id)!;
    if (f.parent_id && folderMap.has(f.parent_id)) folderMap.get(f.parent_id)!.children!.push(node);
    else roots.push(node);
  }
  for (const a of apis) {
    const apiNode: TreeNode = { key: a.id, type: 'api', title: a.name, isLeaf: true, method: a.method as HttpMethod, url: a.url };
    if (!a.folder_id) {
      // No folder — show at tree root
      roots.push(apiNode);
    } else if (folderMap.has(a.folder_id)) {
      folderMap.get(a.folder_id)!.children!.push(apiNode);
    }
  }
  return roots;
}

interface FolderTreeProps { searchValue: string; }

export function FolderTree({ searchValue }: FolderTreeProps) {
  const { t } = useI18n();
  const { message } = App.useApp();
  const folders = useFolderStore((s) => s.folders);
  const apis = useFolderStore((s) => s.apis);
  const addFolder = useFolderStore((s) => s.addFolder);
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const removeFolder = useFolderStore((s) => s.removeFolder);
  const moveFolder = useFolderStore((s) => s.moveFolder);
  const copyFolder = useFolderStore((s) => s.copyFolder);
  const removeApi = useFolderStore((s) => s.removeApi);
  const moveApi = useFolderStore((s) => s.moveApi);
  const copyApi = useFolderStore((s) => s.copyApi);
  const addTab = useTabStore((s) => s.addTab);
  const tabs = useTabStore((s) => s.tabs);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [createModal, setCreateModal] = useState<{ open: boolean; type: 'folder' | 'api'; parentId: string | null }>({ open: false, type: 'folder', parentId: null });
  const [newName, setNewName] = useState('');
  const [moveModal, setMoveModal] = useState<{ open: boolean; id: string; type: 'folder' | 'api' }>({ open: false, id: '', type: 'folder' });
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  // ── Rename ───────────────────────────
  const startRename = (id: string, currentName: string) => { setEditingId(id); setEditingName(currentName); };
  const commitRename = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (trimmed) { const isFolder = folders.some((f) => f.id === editingId); if (isFolder) await renameFolder(editingId, trimmed); }
    setEditingId(null); setEditingName('');
  };
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    else if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
  };

  // ── Create ───────────────────────────
  const openCreate = (type: 'folder' | 'api', parentId: string | null) => { setCreateModal({ open: true, type, parentId }); setNewName(''); };
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    if (createModal.type === 'folder') {
      await addFolder(generateId(), createModal.parentId, name);
    } else {
      // Open blank tab linked to this folder — save will go directly to it
      addTab({
        title: name || 'Untitled',
        saveToFolderId: createModal.parentId,
        request: { method: 'GET', url: '', name: name || '', description: '', queryParams: [], pathParams: [], headers: [], cookies: [], auth: { type: 'none' }, body: { type: 'none', content: '' } },
      });
    }
    setCreateModal({ open: false, type: 'folder', parentId: null }); setNewName('');
  };

  // ── Delete ───────────────────────────
  const handleDelete = (id: string, type: 'folder' | 'api') => {
    const title = type === 'folder' ? folders.find((f) => f.id === id)?.name || '' : apis.find((a) => a.id === id)?.name || '';
    confirm({
      title: type === 'folder' ? t('folderMenu.delete') : t('apiMenu.delete'),
      icon: <ExclamationCircleOutlined />,
      content: `${type === 'folder' ? 'Folder' : 'API'}: "${title}"?`,
      okText: t('apiMenu.delete'), okType: 'danger', cancelText: t('headers.cancel'),
      onOk: async () => { if (type === 'folder') await removeFolder(id); else await removeApi(id); },
    });
  };

  // ── Copy ─────────────────────────────
  const handleCopy = (id: string, type: 'folder' | 'api') => {
    const originalName = type === 'folder' ? folders.find((f) => f.id === id)?.name : apis.find((a) => a.id === id)?.name;
    const copyName = (originalName || 'Untitled') + ' (Copy)';
    if (type === 'folder') {
      copyFolder(id, null, copyName).then(() => message.success('Folder copied')).catch(() => message.error('Copy failed'));
    } else {
      const api = apis.find((a) => a.id === id);
      if (api) copyApi(id, api.folder_id, copyName).then(() => message.success('API copied')).catch(() => message.error('Copy failed'));
    }
  };

  // ── Move ─────────────────────────────
  const openMove = (id: string, type: 'folder' | 'api') => {
    setMoveModal({ open: true, id, type });
    if (type === 'api') setMoveTargetId(apis.find((a) => a.id === id)?.folder_id || null);
    else setMoveTargetId(folders.find((f) => f.id === id)?.parent_id || null);
  };

  const handleMove = async () => {
    const targetId = moveTargetId === '__root__' ? null : moveTargetId;
    if (moveModal.type === 'folder') {
      await moveFolder(moveModal.id, targetId);
      message.success('Folder moved');
    } else {
      await moveApi(moveModal.id, targetId);
      message.success('API moved');
    }
    setMoveModal({ open: false, id: '', type: 'folder' });
  };

  // ── Context menu handlers ────────────
  const handleFolderMenuClick = (key: string, folderId: string) => {
    switch (key) {
      case 'new-sub-folder': openCreate('folder', folderId); break;
      case 'new-api': openCreate('api', folderId); break;
      case 'rename': { const f = folders.find((x) => x.id === folderId); if (f) startRename(folderId, f.name); break; }
      case 'copy': handleCopy(folderId, 'folder'); break;
      case 'move': openMove(folderId, 'folder'); break;
      case 'delete': handleDelete(folderId, 'folder'); break;
    }
  };

  const handleApiMenuClick = (key: string, apiId: string) => {
    switch (key) {
      case 'open': {
        // If a tab for this API already exists, just switch to it
        const existing = tabs.find((t) => t.apiId === apiId);
        if (existing) {
          setActiveTab(existing.id);
          break;
        }
        const api = apis.find((a) => a.id === apiId);
        if (api) addTab({ apiId: api.id, title: api.name, request: { method: api.method as HttpMethod, url: api.url, name: api.name, description: api.description, queryParams: [], pathParams: [], headers: [], cookies: [], auth: { type: 'none' }, body: { type: 'none', content: '' } } });
        break;
      }
      case 'rename': { const api = apis.find((a) => a.id === apiId); if (api) startRename(apiId, api.name); break; }
      case 'copy': handleCopy(apiId, 'api'); break;
      case 'move': openMove(apiId, 'api'); break;
      case 'delete': handleDelete(apiId, 'api'); break;
    }
  };

  // ── Tree ─────────────────────────────
  const treeData = useMemo(() => buildTree(folders, apis), [folders, apis]);
  const filteredTree = useMemo(() => {
    if (!searchValue) return treeData;
    const filter = (nodes: TreeNode[]): TreeNode[] => nodes.reduce<TreeNode[]>((acc, node) => {
      const m = node.title.toLowerCase().includes(searchValue.toLowerCase());
      const fc = node.children ? filter(node.children) : [];
      if (m || fc.length > 0) acc.push({ ...node, children: fc.length > 0 ? fc : node.children });
      return acc;
    }, []);
    return filter(treeData);
  }, [treeData, searchValue]);

  // Folder options for move picker (self + children excluded, root always included)
  const moveFolderOptions = useMemo(() => {
    if (!moveModal.open || moveModal.type !== 'folder') return [];
    const exclude = new Set<string>([moveModal.id]);
    const collect = (pid: string) => { folders.filter((f) => f.parent_id === pid).forEach((f) => { exclude.add(f.id); collect(f.id); }); };
    collect(moveModal.id);
    const isAlreadyRoot = !folders.find((f) => f.id === moveModal.id)?.parent_id;
    const opts: { value: string; label: string }[] = [];
    if (!isAlreadyRoot) {
      opts.push({ value: '__root__', label: '— Root —' });
    }
    folders.filter((f) => !exclude.has(f.id)).forEach((f) => {
      const depth = ((): number => { let d = 0; let pf = f; while (pf.parent_id) { d++; pf = folders.find((x) => x.id === pf.parent_id) || pf; if (d > 50) break; } return d; })();
      opts.push({ value: f.id, label: '  '.repeat(depth) + f.name });
    });
    return opts;
  }, [folders, moveModal]);

  const moveApiFolderOptions = useMemo(() => {
    if (!moveModal.open || moveModal.type !== 'api') return [];
    const currentApi = apis.find((a) => a.id === moveModal.id);
    const opts: { value: string; label: string }[] = [];
    // Show root option if not already at root
    if (currentApi?.folder_id) {
      opts.push({ value: '__root__', label: '— Root —' });
    }
    folders.forEach((f) => {
      const depth = ((): number => { let d = 0; let pf = f; while (pf.parent_id) { d++; pf = folders.find((x) => x.id === pf.parent_id) || pf; if (d > 50) break; } return d; })();
      opts.push({ value: f.id, label: '  '.repeat(depth) + f.name });
    });
    return opts;
  }, [folders, moveModal]);

  if (filteredTree.length === 0) return <div style={{ padding: 24 }}><Empty description={t('sidebar.noResults')} image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>;

  return (
    <div style={{ padding: '0 4px', flex: 1, overflow: 'auto' }}>
      <Tree showIcon={false} treeData={filteredTree} expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys as string[])}
        onSelect={(_keys, info) => { const node = info.node as unknown as TreeNode; if (node.type === 'api') handleApiMenuClick('open', node.key as string); }}
        draggable={() => true}
        allowDrop={({ dragNode, dropNode, dropPosition }) => {
          const dn = dragNode as unknown as TreeNode;
          const tn = dropNode as unknown as TreeNode;
          // API can only be dropped ON a folder
          if (dn.type === 'api') {
            return tn.type === 'folder' && dropPosition === 0;
          }
          // Folder cannot drop on itself or its descendants
          if (dn.key === tn.key) return false;
          if (tn.type === 'api') return false;
          // Check circular: dragging folder onto one of its own children
          if (dropPosition === 0) {
            const isDescendant = (parentKey: string, childKey: string): boolean => {
              const child = folders.find((f) => f.id === childKey);
              if (!child) return false;
              if (child.parent_id === parentKey) return true;
              if (child.parent_id) return isDescendant(parentKey, child.parent_id);
              return false;
            };
            if (isDescendant(dn.key as string, tn.key as string)) return false;
          }
          return true;
        }}
        onDrop={async (info) => {
          const dn = info.dragNode as unknown as TreeNode;
          const tn = info.node as unknown as TreeNode;
          const dragId = dn.key as string;

          if (dn.type === 'api') {
            // Move API into a folder
            const targetFolderId = tn.type === 'folder' ? tn.key as string : null;
            if (targetFolderId) {
              try {
                await moveApi(dragId, targetFolderId);
                message.success('API moved');
              } catch { message.error('Move failed'); }
            }
          } else if (dn.type === 'folder') {
            if (info.dropToGap) {
              // Dropped between nodes — move to same parent as target
              const targetFolder = folders.find((f) => f.id === tn.key as string);
              const newParentId = targetFolder?.parent_id ?? null;
              try {
                await moveFolder(dragId, newParentId);
                message.success('Folder moved');
              } catch { message.error('Move failed'); }
            } else {
              // Dropped ON a folder — move inside that folder
              const targetId = tn.key as string;
              try {
                await moveFolder(dragId, targetId);
                message.success('Folder moved');
              } catch { message.error('Move failed'); }
            }
          }
        }}
        titleRender={(node) => {
          const tn = node as unknown as TreeNode;
          const isEditing = tn.key === editingId;
          if (tn.type === 'folder') {
            const items: MenuProps['items'] = [
              { key: 'new-sub-folder', label: t('folderMenu.newSubFolder') },
              { key: 'new-api', label: t('folderMenu.newApi') },
              { type: 'divider' },
              { key: 'rename', label: t('folderMenu.rename') },
              { key: 'copy', label: t('folderMenu.copy') },
              { key: 'move', label: t('folderMenu.move') },
              { type: 'divider' },
              { key: 'delete', label: t('folderMenu.delete'), danger: true },
            ];
            return (
              <Dropdown menu={{ items, onClick: ({ key }) => handleFolderMenuClick(key, tn.key as string) }} trigger={['contextMenu']}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                  <FolderOutlined style={{ color: '#faad14', fontSize: 14 }} />
                  {isEditing ? <Input size="small" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={commitRename} onKeyDown={handleNameKeyDown} autoFocus style={{ height: 22, fontSize: 13, width: 120 }} onClick={(e) => e.stopPropagation()} /> : <span style={{ fontSize: 13 }}>{tn.title}</span>}
                </div>
              </Dropdown>
            );
          }
          const apiItems: MenuProps['items'] = [
            { key: 'open', label: t('apiMenu.openInTab') },
            { key: 'rename', label: t('apiMenu.rename') },
            { key: 'copy', label: t('apiMenu.copy') },
            { key: 'move', label: t('apiMenu.move') },
            { type: 'divider' },
            { key: 'delete', label: t('apiMenu.delete'), danger: true },
          ];
          return (
            <Dropdown menu={{ items: apiItems, onClick: ({ key }) => handleApiMenuClick(key, tn.key as string) }} trigger={['contextMenu']}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '2px 0' }}>
                {renderMethodBadge(tn.method)}
                {isEditing ? <Input size="small" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={commitRename} onKeyDown={handleNameKeyDown} autoFocus style={{ height: 22, fontSize: 13, width: 120 }} onClick={(e) => e.stopPropagation()} /> : <span style={{ fontSize: 13 }}>{tn.title}</span>}
              </div>
            </Dropdown>
          );
        }}
        blockNode style={{ background: 'transparent' }}
      />

      <Modal title={createModal.type === 'folder' ? t('sidebar.newFolder') : t('sidebar.newApi')} open={createModal.open} onOk={handleCreate} onCancel={() => setCreateModal({ open: false, type: 'folder', parentId: null })} okText={t('headers.apply')} cancelText={t('headers.cancel')}>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={createModal.type === 'folder' ? 'Folder name' : 'API name'} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} autoFocus />
      </Modal>

      {/* Move Modal */}
      <Modal title={`Move ${moveModal.type === 'folder' ? 'Folder' : 'API'}`} open={moveModal.open} onOk={handleMove} onCancel={() => setMoveModal({ open: false, id: '', type: 'folder' })} okText="Move" cancelText={t('headers.cancel')} okButtonProps={{ disabled: !moveTargetId }}>
        <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>Select target folder:</div>
        <select value={moveTargetId || ''} onChange={(e) => setMoveTargetId(e.target.value || null)}
          style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6 }}>
          {(moveModal.type === 'folder' ? moveFolderOptions : moveApiFolderOptions).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Modal>
    </div>
  );
}
