import { useState } from 'react';

const LS_KEY = 'finvision_chart_range';

export function usePersistedRange(validRanges, defaultRange = '3M') {
  const [range, setRangeState] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved && validRanges.includes(saved) ? saved : defaultRange;
  });

  function setRange(r) {
    localStorage.setItem(LS_KEY, r);
    setRangeState(r);
  }

  return [range, setRange];
}
