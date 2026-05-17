import { useState, useEffect, useRef, useCallback } from 'react';
import provider from '../services/providers';

// ─── In-memory cache (module-level, survives re-renders, cleared on tab close) ─

const memCache = new Map();

function memGet(key) {
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiry) { memCache.delete(key); return null; }
  return e.data;
}

function memSet(key, data, ttlMs) {
  memCache.set(key, { data, expiry: Date.now() + ttlMs });
}

// ─── Debounce helper ──────────────────────────────────────────────────────────

export function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// ─── Generic async hook ───────────────────────────────────────────────────────
// ttl:       in-memory cache lifetime in ms (0 = no cache)
// refreshMs: polling interval in ms (0 = fetch once)
// enabled:   skip fetch when false

function useAsync(asyncFn, deps, options = {}) {
  const { refreshMs = 0, enabled = true, ttl = 0 } = options;
  const cacheKey = ttl > 0 ? JSON.stringify(deps) : null;

  const [state, setState] = useState(() => {
    if (cacheKey) {
      const hit = memGet(cacheKey);
      if (hit !== null) return { data: hit, loading: false, error: null };
    }
    return { data: undefined, loading: !!enabled, error: null };
  });

  const versionRef = useRef(0);

  const run = useCallback(async () => {
    if (!enabled) return;

    if (cacheKey) {
      const hit = memGet(cacheKey);
      if (hit !== null) {
        setState(s => Object.is(s.data, hit) ? s : { data: hit, loading: false, error: null });
        return;
      }
    }

    const version = ++versionRef.current;
    setState(s => s.loading ? s : { ...s, loading: true, error: null });
    try {
      const data = await asyncFn();
      if (cacheKey) memSet(cacheKey, data, ttl);
      if (versionRef.current === version) setState({ data, loading: false, error: null });
    } catch (e) {
      if (versionRef.current === version) setState({ data: undefined, loading: false, error: e.message });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
    let id;
    if (refreshMs > 0) id = setInterval(run, refreshMs);
    return () => { versionRef.current++; clearInterval(id); };
  }, [run, refreshMs]);

  return state;
}

// ─── Chart / price history ────────────────────────────────────────────────────

export function useChart(symbol, interval = '1d', range = '3mo', opts = {}) {
  return useAsync(
    () => symbol ? provider.chart(symbol, interval, range) : Promise.resolve(null),
    [symbol, interval, range],
    { ttl: 60_000, ...opts },
  );
}

// ─── Bulk real-time quotes ────────────────────────────────────────────────────

export function useQuotes(symbols, opts = {}) {
  const key = symbols.join(',');
  return useAsync(
    () => symbols.length ? provider.quotes(symbols) : Promise.resolve([]),
    [key],
    { ttl: 15_000, ...opts },
  );
}

export function useQuote(symbol, opts = {}) {
  const { data, loading, error } = useQuotes(symbol ? [symbol] : [], opts);
  return { data: data?.[0] ?? null, loading, error };
}

// ─── Quote summary (fundamentals) ────────────────────────────────────────────

export function useSummary(symbol, opts = {}) {
  return useAsync(
    () => symbol ? provider.summary(symbol) : Promise.resolve(null),
    [symbol],
    { ttl: 300_000, ...opts },
  );
}

// ─── Quarterly financials ─────────────────────────────────────────────────────

export function useEarnings(symbol, opts = {}) {
  return useAsync(
    () => symbol ? provider.earnings(symbol) : Promise.resolve([]),
    [symbol],
    { ttl: 300_000, ...opts },
  );
}

// ─── Search autocomplete ──────────────────────────────────────────────────────

export function useSearch(query, opts = {}) {
  return useAsync(
    () => provider.search(query, 6, 0),
    [query],
    { ttl: 30_000, ...opts, enabled: !!query && query.length >= 1 },
  );
}

// ─── News ─────────────────────────────────────────────────────────────────────

export function useNews(symbol, newsCount = 8, opts = {}) {
  return useAsync(
    () => symbol ? provider.news(symbol, newsCount) : Promise.resolve([]),
    [symbol, newsCount],
    { ttl: 300_000, ...opts },
  );
}

export function useInstitutional(symbol, opts = {}) {
  return useAsync(
    () => symbol ? provider.institutional(symbol) : Promise.resolve(null),
    [symbol],
    { ttl: 3_600_000, ...opts },
  );
}

export function useEarningsCalendar(date, opts = {}) {
  return useAsync(
    () => date ? provider.earningsCalendar(date) : Promise.resolve([]),
    [date],
    { ttl: 3_600_000, ...opts },
  );
}

export function useMarketNews(opts = {}) {
  return useAsync(
    () => provider.news('stock market', 12),
    [],
    { ttl: 300_000, ...opts },
  );
}
