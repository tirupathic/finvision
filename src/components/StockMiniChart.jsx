import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { generatePriceHistory } from '../services/stockData';

export default function StockMiniChart({ symbol, basePrice, positive }) {
  const data = useMemo(() => generatePriceHistory(basePrice, 30, 0.018), [symbol]);
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone" dataKey="price"
          stroke={positive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5} dot={false} isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
