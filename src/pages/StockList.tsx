import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Loader2, Star } from 'lucide-react';
import { StockSearch } from '@/components/ui/stock-search';
import { fetchMultipleQuotes, FEATURED_TICKERS } from '@/lib/api';
import { formatCurrency } from '@/lib/dcf';
import type { QuoteData } from '@/lib/types';
import { useWatchlist } from '@/hooks/use-watchlist';

export const StockList: React.FC = () => {
  const [stocks, setStocks] = useState<QuoteData[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<QuoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const { watchlist } = useWatchlist();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchMultipleQuotes(FEATURED_TICKERS);
        setStocks(data);
      } catch (error) {
        console.error('Failed to load stocks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadWatchlist = async () => {
      if (watchlist.length === 0) {
        setWatchlistQuotes([]);
        return;
      }
      setIsWatchlistLoading(true);
      try {
        const data = await fetchMultipleQuotes(watchlist);
        setWatchlistQuotes(data);
      } catch (error) {
        console.error('Failed to load watchlist quotes:', error);
      } finally {
        setIsWatchlistLoading(false);
      }
    };
    loadWatchlist();
  }, [watchlist]);

  const StockCardGrid = ({ data, emptyMessage }: { data: QuoteData[], emptyMessage?: string }) => {
    if (data.length === 0 && emptyMessage) {
      return <div className="text-muted-foreground bg-muted/20 rounded-2xl p-8 text-center border border-dashed border-border">{emptyMessage}</div>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map((stock) => (
          <Link key={stock.ticker} to={`/stocks/${stock.ticker}`} className="group">
            <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 hover:border-primary/20">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-foreground">{stock.ticker}</h3>
                  <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
                </div>
                {stock.sector && (
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-lg shrink-0 ml-2">
                    {stock.sector}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">{formatCurrency(stock.price)}</span>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    stock.change >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {stock.change >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span>Mkt Cap: {formatCurrency(stock.marketCap)}</span>
                  <span>P/E: {stock.peRatio?.toFixed(1) ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center space-x-3">
          <TrendingUp className="h-10 w-10 text-primary" />
          <span>Stock Analysis</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Search any US-listed stock or explore popular picks below.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto">
        <StockSearch variant="default" placeholder="Search any stock (e.g. AAPL, Tesla)..." />
      </div>

      {/* Watchlist Section */}
      {watchlist.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Your Watchlist
          </h2>
          {isWatchlistLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading watchlist...</span>
            </div>
          ) : (
            <StockCardGrid data={watchlistQuotes} />
          )}
        </div>
      )}

      {/* Popular Stocks */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Popular Stocks</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading live data...</span>
          </div>
        ) : (
          <StockCardGrid data={stocks} />
        )}
      </div>
    </div>
  );
};