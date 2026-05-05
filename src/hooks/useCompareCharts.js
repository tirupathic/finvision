import { useChart } from './useYahoo';

const CMP_COLORS = [
  '#f59e0b', '#818cf8', '#34d399', '#f87171', '#fb923c',
  '#a3e635', '#22d3ee', '#e879f9', '#94a3b8', '#fbbf24',
];

// All 10 slots are always called — satisfies Rules of Hooks.
// Slots beyond compareSyms.length receive null and return undefined data.
export function useCompareCharts(compareSyms, interval, range) {
  const { data: c0 } = useChart(compareSyms[0] ?? null, interval, range);
  const { data: c1 } = useChart(compareSyms[1] ?? null, interval, range);
  const { data: c2 } = useChart(compareSyms[2] ?? null, interval, range);
  const { data: c3 } = useChart(compareSyms[3] ?? null, interval, range);
  const { data: c4 } = useChart(compareSyms[4] ?? null, interval, range);
  const { data: c5 } = useChart(compareSyms[5] ?? null, interval, range);
  const { data: c6 } = useChart(compareSyms[6] ?? null, interval, range);
  const { data: c7 } = useChart(compareSyms[7] ?? null, interval, range);
  const { data: c8 } = useChart(compareSyms[8] ?? null, interval, range);
  const { data: c9 } = useChart(compareSyms[9] ?? null, interval, range);
  return [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9];
}

export { CMP_COLORS };
