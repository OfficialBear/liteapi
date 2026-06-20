import { useRef, useEffect, useCallback } from 'react';
import { RequestBasicInfo } from './RequestBasicInfo';
import { RequestSubTabs } from './RequestSubTabs';
import { useTabStore } from '../../stores/tabStore';
import { parseQueryFromUrl, getBaseUrl, buildUrlWithQuery } from '../../services/urlQuerySync';
import type { Tab } from '../../types/tab';
import type { HttpMethod } from '../../types/api';
import type { KeyValuePair } from '../../types/api';
import './api.css';

interface RequestEditorProps {
  tab: Tab;
}

export function RequestEditor({ tab }: RequestEditorProps) {
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  // Prevent recursive URL ↔ Query sync
  const syncingRef = useRef(false);

  // ── URL → Query sync ──────────────────────────

  const handleUrlChange = useCallback(
    (rawUrl: string) => {
      if (syncingRef.current) return;

      // Auto-prepend https:// if no scheme is present and URL looks like a hostname
      let url = rawUrl;
      if (url && !url.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//)) {
        if (url.includes('.') || url.includes('/') || url.includes('?')) {
          url = `https://${url}`;
        }
      }

      // Auto-derive tab title from URL when title is default
      const newTitle = deriveTitleFromUrl(url, tab.title);

      const newParams = parseQueryFromUrl(url, tab.request.queryParams);
      syncingRef.current = true;
      const patch: Partial<import('../../types/tab').RequestConfig> = {
        url,
        queryParams: newParams,
      };
      if (newTitle) patch.name = newTitle;
      updateTabRequest(tab.id, patch);
      // Reset flag after a tick so subsequent effects see it
      setTimeout(() => { syncingRef.current = false; }, 0);
    },
    [tab.id, tab.title, tab.request.queryParams, updateTabRequest]
  );

  // ── Query → URL sync ──────────────────────────

  const handleQueryChange = useCallback(
    (params: KeyValuePair[]) => {
      if (syncingRef.current) return;
      const base = getBaseUrl(tab.request.url);
      const newUrl = buildUrlWithQuery(base, params);
      syncingRef.current = true;
      updateTabRequest(tab.id, { url: newUrl, queryParams: params });
      setTimeout(() => { syncingRef.current = false; }, 0);
    },
    [tab.id, tab.request.url, updateTabRequest]
  );

  // Sync query → URL when queryParams change from outside (e.g., panel edits)
  const prevQueryRef = useRef(tab.request.queryParams);
  useEffect(() => {
    if (syncingRef.current) return;
    const prev = prevQueryRef.current;
    const curr = tab.request.queryParams;
    prevQueryRef.current = curr;

    // Skip if unchanged (reference equality handled by store)
    if (prev === curr) return;

    const base = getBaseUrl(tab.request.url);
    const expectedUrl = buildUrlWithQuery(base, curr);
    if (tab.request.url !== expectedUrl) {
      syncingRef.current = true;
      updateTabRequest(tab.id, { url: expectedUrl });
      setTimeout(() => { syncingRef.current = false; }, 0);
    }
  }, [tab.request.queryParams, tab.request.url, tab.id, updateTabRequest]);

  // ── Other handlers ────────────────────────────

  const handleMethodChange = (method: HttpMethod) => {
    updateTabRequest(tab.id, { method });
  };

  const setTabTitle = useTabStore((s) => s.setTabTitle);

  const handleNameChange = (name: string) => {
    updateTabRequest(tab.id, { name });
    setTabTitle(tab.id, name);
  };

  const handleDescriptionChange = (description: string) => {
    updateTabRequest(tab.id, { description });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RequestBasicInfo
        tab={tab}
        onMethodChange={handleMethodChange}
        onUrlChange={handleUrlChange}
        onNameChange={handleNameChange}
        onDescriptionChange={handleDescriptionChange}
      />
      <RequestSubTabs tab={tab} onQueryChange={handleQueryChange} />
    </div>
  );
}

/** Derive a meaningful tab title from the URL path */
function deriveTitleFromUrl(url: string, currentTitle: string): string | undefined {
  // Only auto-name when the current title is the default
  if (currentTitle !== 'Untitled' && currentTitle !== '新标签') return undefined;
  if (!url) return undefined;

  try {
    const path = url.includes('://') ? new URL(url).pathname : url.split('?')[0];
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return undefined;
    // Pick last meaningful segment
    const last = segments[segments.length - 1];
    return last.length > 30 ? last.substring(0, 30) : last;
  } catch {
    return undefined;
  }
}
