import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HistoricalPrice } from '@/lib/types';

interface PriceChartProps {
  data: HistoricalPrice[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload as HistoricalPrice;
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold mb-1">{point.date}</p>
        <div className="space-y-0.5 text-muted-foreground">
          <p>Open: <span className="text-foreground font-medium">${point.open.toFixed(2)}</span></p>
          <p>High: <span className="text-foreground font-medium">${point.high.toFixed(2)}</span></p>
          <p>Low: <span className="text-foreground font-medium">${point.low.toFixed(2)}</span></p>
          <p>Close: <span className="text-foreground font-medium">${point.close.toFixed(2)}</span></p>
          <p>Volume: <span className="text-foreground font-medium">{point.volume.toLocaleString()}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export const PriceChart: React.FC<PriceChartProps> = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No price data available.
      </div>
    );
  }

  // Calculate trend
  const startPrice = data[0].close;
  const endPrice = data[data.length - 1].close;
  const priceChange = endPrice - startPrice;
  const percentChange = ((endPrice - startPrice) / startPrice) * 100;
  const isPositive = priceChange >= 0;

  const getTrendIcon = () => {
    if (Math.abs(percentChange) < 0.5) return <Minus className="h-4 w-4" />;
    return isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (Math.abs(percentChange) < 0.5) return 'text-muted-foreground';
    return isPositive ? 'text-success' : 'text-destructive';
  };

  const chartColor = isPositive ? 'hsl(155, 65%, 40%)' : 'hsl(0, 65%, 50%)';

  // Simplify date labels for x-axis
  const formatDate = (dateStr: string) => {
    if (dateStr.includes(':')) {
      // Intraday — show time only
      return dateStr.split(' ')[1];
    }
    // Daily — show month/day
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="space-y-4">
      {/* Trend Indicator */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="font-medium">
            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)} ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
          </span>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <span>${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={chartColor}
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: chartColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};