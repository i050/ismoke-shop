import { useEffect, useRef } from 'react';
import { buildQuery } from '../core/buildQuery';
import { parseQuery } from '../core/parseQuery';
import type { FiltersState } from '../types/filters';

// מחזיר מצב התחלתי מה-URL (עבור useFiltersState)
export function getInitialFiltersFromUrl(): FiltersState {
  if (typeof window === 'undefined') return parseQuery('');
  return parseQuery(window.location.search || '');
}

interface Options { disableWrite?: boolean }

// מסנכרן State אל ה-URL (ללא ניהול back/forward כרגע)
export function useFiltersUrlSync(state: FiltersState, opts: Options = {}) {
  const lastQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (opts.disableWrite) return;
    if (typeof window === 'undefined') return;
    const query = buildQuery(state);
    if (lastQueryRef.current === query) return; // אין שינוי
    lastQueryRef.current = query;
    const newUrl = query ? `${window.location.pathname}${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [state, opts.disableWrite]);
}
