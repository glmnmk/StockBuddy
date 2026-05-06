import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StockSearch } from '@/components/ui/stock-search';
import { Search, ArrowRightLeft, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { fetchQuote } from '@/lib/api';
import type { QuoteData } from '@/lib/types';
import { formatCurrency, formatLargeNumber, formatPercent } from '@/lib/dcf';
import { MetricLabel } from '@/components/ui/metric-label';

interface StockComparisonProps {
  baseQuote: QuoteData;
}

export function StockComparison({ baseQuote }: StockComparisonProps) {
  const [peerQuote, setPeerQuote] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPeer = async (ticker: string) => {
    if (ticker === baseQuote.ticker) {
      setError("Cannot compare a stock to itself.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const quote = await fetchQuote(ticker);
      setPeerQuote(quote);
    } catch (err) {
      setError("Failed to load peer data.");
    } finally {
      setIsLoading(false);
    }
  };

  const MetricRow = ({ 
    id,
    label, 
    baseValue, 
    peerValue, 
    higherIsBetter = true,
    formatFn = (v: any) => String(v)
  }: { 
    id: string,
    label: string, 
    baseValue: number | null | undefined, 
    peerValue: number | null | undefined, 
    higherIsBetter?: boolean,
    formatFn?: (v: number | null | undefined) => string 
  }) => {
    const baseNum = Number(baseValue) || 0;
    const peerNum = Number(peerValue) || 0;
    
    let baseWins = false;
    let peerWins = false;

    if (baseValue != null && peerValue != null) {
      if (higherIsBetter) {
        baseWins = baseNum > peerNum;
        peerWins = peerNum > baseNum;
      } else {
        baseWins = baseNum < peerNum;
        peerWins = peerNum < baseNum;
      }
    }

    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50 items-center text-sm">
        <MetricLabel metricId={id} fallbackLabel={label} className="text-muted-foreground font-medium" />
        <div className={`font-semibold ${baseWins ? 'text-success' : ''}`}>
          {formatFn(baseValue)}
        </div>
        <div className={`font-semibold ${peerWins ? 'text-success' : ''}`}>
          {peerQuote ? formatFn(peerValue) : '-'}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          Peer Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
          <label className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Select a Peer to Compare
          </label>
          <div className="relative">
            <StockSearch 
              placeholder={`Search competitor for ${baseQuote.ticker}...`}
              onSelect={handleSelectPeer}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </div>

        {/* Comparison Table Header */}
        <div className="grid grid-cols-3 gap-4 pb-2 border-b-2 border-border text-sm font-bold">
          <div>Metric</div>
          <div className="flex items-center gap-2">
            {baseQuote.ticker}
            <Badge variant="outline" className="text-xs bg-primary/10">Base</Badge>
          </div>
          <div className="flex items-center gap-2">
            {peerQuote ? peerQuote.ticker : 'Select Peer'}
            {peerQuote && <Badge variant="outline" className="text-xs">Peer</Badge>}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex flex-col">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-2 mt-2 bg-muted/30 px-2 rounded">
            Valuation
          </div>
          <MetricRow id="marketCap" label="Market Cap" baseValue={baseQuote.marketCap} peerValue={peerQuote?.marketCap} higherIsBetter={true} formatFn={(v) => v ? formatLargeNumber(v as number) : 'N/A'} />
          <MetricRow id="peRatio" label="P/E Ratio" baseValue={baseQuote.peRatio} peerValue={peerQuote?.peRatio} higherIsBetter={false} formatFn={(v) => v ? (v as number).toFixed(2) : 'N/A'} />
          <MetricRow id="forwardPE" label="Forward P/E" baseValue={baseQuote.forwardPE} peerValue={peerQuote?.forwardPE} higherIsBetter={false} formatFn={(v) => v ? (v as number).toFixed(2) : 'N/A'} />
          <MetricRow id="pbRatio" label="P/B Ratio" baseValue={baseQuote.pbRatio} peerValue={peerQuote?.pbRatio} higherIsBetter={false} formatFn={(v) => v ? (v as number).toFixed(2) : 'N/A'} />

          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-2 mt-4 bg-muted/30 px-2 rounded">
            Financial Health & Growth
          </div>
          <MetricRow id="freeCashFlow" label="Free Cash Flow" baseValue={baseQuote.freeCashFlow} peerValue={peerQuote?.freeCashFlow} higherIsBetter={true} formatFn={(v) => v ? formatCurrency(v as number) : 'N/A'} />
          <MetricRow id="profitMargin" label="Profit Margin" baseValue={baseQuote.profitMargin} peerValue={peerQuote?.profitMargin} higherIsBetter={true} formatFn={(v) => v != null ? formatPercent(v as number) : 'N/A'} />
          <MetricRow id="revenueGrowth" label="Revenue Growth" baseValue={baseQuote.revenueGrowth} peerValue={peerQuote?.revenueGrowth} higherIsBetter={true} formatFn={(v) => v != null ? formatPercent(v as number) : 'N/A'} />
          <MetricRow id="earningsGrowth" label="Earnings Growth" baseValue={baseQuote.earningsGrowth} peerValue={peerQuote?.earningsGrowth} higherIsBetter={true} formatFn={(v) => v != null ? formatPercent(v as number) : 'N/A'} />
          <MetricRow id="roe" label="Return on Equity" baseValue={baseQuote.returnOnEquity} peerValue={peerQuote?.returnOnEquity} higherIsBetter={true} formatFn={(v) => v != null ? formatPercent(v as number) : 'N/A'} />
        </div>
      </CardContent>
    </Card>
  );
}
