import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';
import { fetchMarketOverview } from '@/lib/api';
import type { QuoteData } from '@/lib/types';
import { formatCurrency } from '@/lib/dcf';

export const MarketOverview: React.FC = () => {
  const [indices, setIndices] = useState<QuoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMarketOverview();
        setIndices(data);
      } catch (error) {
        console.error("Failed to load market overview", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-16 bg-muted/20 border-y border-border/50 flex items-center justify-center sticky top-16 z-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (indices.length === 0) return null;

  return (
    <div className="w-full bg-card/80 backdrop-blur border-y border-border overflow-hidden sticky top-16 z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-row items-center gap-6 overflow-x-auto hide-scrollbar py-3 text-sm whitespace-nowrap">
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0 pr-4 border-r border-border">
            <Activity className="h-4 w-4" />
            <span>Market Overview</span>
          </div>
          
          <div className="flex gap-8 items-center shrink-0">
            {indices.map((index) => {
              const isPositive = index.change >= 0;
              return (
                <div key={index.ticker} className="flex items-center gap-3">
                  <span className="font-semibold">{index.name}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(index.price).replace('$', '')}</span>
                  <div className={`flex items-center gap-1 font-medium text-xs ${
                    isPositive ? 'text-success' : 'text-destructive'
                  }`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
