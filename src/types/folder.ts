import type { HttpMethod } from './api';

export type TreeNodeType = 'folder' | 'api';

export interface TreeNode {
  key: string;
  type: TreeNodeType;
  title: string;
  isLeaf: boolean;
  children?: TreeNode[];
  method?: HttpMethod;
  url?: string;
}
