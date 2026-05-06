import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricLabel } from '@/components/ui/metric-label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { FinancialYear } from '@/lib/types';

interface HistoricalTrendsProps {
  data: FinancialYear[];
  companyName: string;
}

const formatValue = (value: number) => {
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
        <p className="font-semibold mb-2 text-sm text-foreground">FY {label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-foreground">{formatValue(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Color palette — cohesive, muted tones that work in both light and dark mode
const CHART_COLORS = {
  revenue: '#6366f1',      // Indigo — primary/largest metric
  netIncome: '#22c55e',    // Green — profit (positive connotation)
  freeCashFlow: '#f59e0b', // Amber — cash (gold = money)
};

const TrendIndicator = ({ data, metric, metricId, label }: { data: FinancialYear[]; metric: keyof FinancialYear; metricId: string; label: string }) => {
  const values = data.map(d => (d[metric] as number | null) ?? 0).filter(v => v !== 0);
  if (values.length < 2) return null;

  const growth = ((values[values.length - 1] - values[0]) / Math.abs(values[0])) * 100;
  const isPositive = growth > 0;
  const latestValue = values[values.length - 1];

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
      <div className="space-y-1">
        <MetricLabel metricId={metricId} fallbackLabel={label} className="text-xs text-muted-foreground uppercase tracking-wider font-medium" />
        <p className="text-lg font-bold">{formatValue(latestValue)}</p>
      </div>
      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
        isPositive
          ? 'bg-success/10 text-success'
          : 'bg-destructive/10 text-destructive'
      }`}>
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {Math.abs(growth).toFixed(1)}%
      </div>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-6 pt-2">
    {[
      { label: 'Revenue', color: CHART_COLORS.revenue },
      { label: 'Net Income', color: CHART_COLORS.netIncome },
      { label: 'Free Cash Flow', color: CHART_COLORS.freeCashFlow },
    ].map(({ label, color }) => (
      <div key={label} className="flex items-center gap-2 text-sm">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
    ))}
  </div>
);

export function HistoricalTrends({ data, companyName }: HistoricalTrendsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Financial Trends
            <Badge variant="outline" className="text-xs font-normal">{data.length} years</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Trend Summary Row */}
        <div className="grid grid-cols-3 gap-3">
          <TrendIndicator data={data} metric="revenue" metricId="revenue" label="Revenue" />
          <TrendIndicator data={data} metric="netIncome" metricId="netIncome" label="Net Income" />
          <TrendIndicator data={data} metric="freeCashFlow" metricId="freeCashFlow" label="Free Cash Flow" />
        </div>

        {/* Chart */}
        <div className="h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              barCategoryGap="20%"
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `FY${v.slice(-2)}`}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 4 }}
              />
              <Legend content={<CustomLegend />} />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill={CHART_COLORS.revenue}
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
              <Bar
                dataKey="netIncome"
                name="Net Income"
                fill={CHART_COLORS.netIncome}
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
              <Bar
                dataKey="freeCashFlow"
                name="Free Cash Flow"
                fill={CHART_COLORS.freeCashFlow}
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insight Callout */}
        <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">📈 Consistent Growth</p>
              <p className="text-muted-foreground text-xs">Look for steady upward trends in all three metrics — this shows a healthy, growing business.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">💰 Cash is King</p>
              <p className="text-muted-foreground text-xs">Free cash flow should track with profits. If not, the company might have collection issues.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}