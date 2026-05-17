// ─── Formatting Utilities ─────────────────────────────────────────────────────
// Pure display helpers — no provider dependency, safe to import anywhere.

export function fmt$(val, decimals = 2) {
  if (val == null) return '—';
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatMarketCap(val) {
  if (val == null || val === 0) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val}`;
}

export function formatVolume(val) {
  if (val == null || val === 0) return '—';
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return String(val);
}

export function colorClass(val) {
  if (val == null) return 'text-gray-400';
  return val >= 0 ? 'text-green-400' : 'text-red-400';
}

export function signStr(val, decimals = 2) {
  if (val == null) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(decimals)}`;
}
