import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Shield, Activity, BarChart2, Loader2, Building2, DollarSign, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValueBadge } from '@/components/ui/value-badge';
import { PriceChart } from '@/components/charts/PriceChart';
import { HistoricalTrends } from '@/components/charts/HistoricalTrends';
import { EnhancedDCF } from '@/components/ui/enhanced-dcf';
import { PDFExport } from '@/components/ui/pdf-export';
import { StockComparison } from '@/components/ui/stock-comparison';
import { MetricLabel } from '@/components/ui/metric-label';
import { fetchQuote, fetchHistory, fetchFinancials } from '@/lib/api';
import { runDCF, formatCurrency, formatLargeNumber, formatPercent, getValuationStatus, extractDCFInputs } from '@/lib/dcf';
import type { QuoteData, HistoricalPrice, FinancialsData, FinancialYear, TimeFrame, TIME_FRAME_MAP } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useWatchlist } from '@/hooks/use-watchlist';

export const StockDetail: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [financials, setFinancials] = useState<FinancialsData | null>(null);
  const [priceData, setPriceData] = useState<HistoricalPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartTimeFrame, setChartTimeFrame] = useState<TimeFrame>('1Y');
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Load quote and financials on mount
  useEffect(() => {
    const load = async () => {
      if (!ticker) return;
      setIsLoading(true);
      try {
        const [q, f, h] = await Promise.all([
          fetchQuote(ticker),
          fetchFinancials(ticker),
          fetchHistory(ticker, '1y'),
        ]);
        setQuote(q);
        setFinancials(f);
        setPriceData(h);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load stock data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [ticker]);

  // Load new price data when timeframe changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!ticker) return;
      setIsChartLoading(true);
      try {
        const rangeMap: Record<TimeFrame, string> = {
          '1D': '1d', '5D': '5d', '1M': '1mo', '3M': '3mo',
          '6M': '6mo', '1Y': '1y', '5Y': '5y',
        };
        const data = await fetchHistory(ticker, rangeMap[chartTimeFrame]);
        setPriceData(data);
      } catch {
        // Keep existing data
      } finally {
        setIsChartLoading(false);
      }
    };
    loadHistory();
  }, [ticker, chartTimeFrame]);

  // DCF calculation
  const dcfInputs = useMemo(() => quote ? extractDCFInputs(quote) : null, [quote]);
  const fairValue = useMemo(() => {
    if (!dcfInputs) return null;
    return runDCF(
      dcfInputs.freeCashFlow,
      dcfInputs.growthRate,
      dcfInputs.terminalGrowthRate,
      dcfInputs.discountRate,
      dcfInputs.sharesOutstanding
    );
  }, [dcfInputs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading {ticker}...</span>
      </div>
    );
  }

  if (!quote || !ticker) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Stock not found</p>
        <Button asChild className="mt-4">
          <Link to="/stocks">Back to Stocks</Link>
        </Button>
      </div>
    );
  }

  const valuationStatus = fairValue ? getValuationStatus(fairValue, quote.price) : null;
  const timeFrames: TimeFrame[] = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'];

  // Valid financial years (filter nulls)
  const validFinancials = financials?.annuals.filter(
    (y) => y.revenue !== null || y.netIncome !== null || y.freeCashFlow !== null
  ) ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button */}
      <Button variant="outline" asChild>
        <Link to="/stocks" className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Stocks</span>
        </Link>
      </Button>

      {/* ─── Stock Header ─────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Left: Company info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{quote.name}</h1>
                <Badge variant="outline" className="text-sm">{ticker}</Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    toggleWatchlist(ticker!);
                    toast({
                      title: isInWatchlist(ticker!) ? "Removed from Watchlist" : "Added to Watchlist",
                      description: `${ticker} has been ${isInWatchlist(ticker!) ? "removed from" : "added to"} your watchlist.`,
                    });
                  }}
                  className={`rounded-full hover:bg-amber-500/10 ${isInWatchlist(ticker!) ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-amber-500'}`}
                >
                  <Star className="h-5 w-5" fill={isInWatchlist(ticker!) ? "currentColor" : "none"} />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {quote.sector && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md">{quote.sector}</span>
                )}
                {quote.industry && <span>· {quote.industry}</span>}
              </div>
            </div>

            {/* Right: Price info */}
            <div className="text-left md:text-right space-y-1">
              <p className="text-4xl font-bold">{formatCurrency(quote.price)}</p>
              <div className={`flex items-center gap-1.5 md:justify-end text-lg font-medium ${
                quote.change >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {quote.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span>{quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}</span>
                <span>({quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
              </div>
              {fairValue && valuationStatus && (
                <ValueBadge variant={
                  valuationStatus.bgClass.includes('positive') ? 'positive' :
                  valuationStatus.bgClass.includes('negative') ? 'negative' : 'neutral'
                }>
                  DCF Fair Value: {formatCurrency(fairValue)} · {valuationStatus.message}
                </ValueBadge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabbed Content ───────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full overflow-x-auto overflow-y-hidden sm:grid sm:grid-cols-5 justify-start border-b sm:border-none pb-1 sm:pb-0 h-auto sm:h-10">
          <TabsTrigger className="shrink-0" value="overview">Overview</TabsTrigger>
          <TabsTrigger className="shrink-0" value="valuation">Valuation</TabsTrigger>
          <TabsTrigger className="shrink-0" value="financials">Financials</TabsTrigger>
          <TabsTrigger className="shrink-0" value="analysis">Analysis</TabsTrigger>
          <TabsTrigger className="shrink-0" value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* ──── Overview Tab ──── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Price Chart */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="text-primary h-5 w-5" />
                  Price History
                </CardTitle>
                <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                  {timeFrames.map(frame => (
                    <Button
                      key={frame}
                      variant={chartTimeFrame === frame ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setChartTimeFrame(frame)}
                      className="min-w-[40px] text-xs"
                    >
                      {frame}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isChartLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <PriceChart data={priceData} />
              )}
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'marketCap', value: formatCurrency(quote.marketCap), fallback: 'Market Cap' },
              { id: 'peRatio', value: quote.peRatio?.toFixed(1) ?? 'N/A', fallback: 'P/E Ratio' },
              { id: 'pbRatio', value: quote.pbRatio?.toFixed(1) ?? 'N/A', fallback: 'P/B Ratio' },
              { id: 'beta', value: quote.beta?.toFixed(2) ?? 'N/A', fallback: 'Beta' },
              { id: 'fiftyTwoWeekHigh', value: formatCurrency(quote.fiftyTwoWeekHigh), fallback: '52W High' },
              { id: 'fiftyTwoWeekLow', value: formatCurrency(quote.fiftyTwoWeekLow), fallback: '52W Low' },
              { id: 'volume', value: formatLargeNumber(quote.volume), fallback: 'Volume' },
              { id: 'avgVolume', value: formatLargeNumber(quote.avgVolume), fallback: 'Avg Volume' },
            ].map((metric) => (
              <Card key={metric.id}>
                <CardContent className="pt-4 pb-4">
                  <MetricLabel 
                    metricId={metric.id} 
                    fallbackLabel={metric.fallback} 
                    className="text-xs text-muted-foreground mb-1" 
                  />
                  <p className="text-lg font-bold">{metric.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Financial Health Indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="text-green-500 h-5 w-5" />
                Financial Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'profitMargin', fallback: 'Profit Margin', value: formatPercent(quote.profitMargin), good: (quote.profitMargin ?? 0) > 0.1 },
                  { id: 'grossMargin', fallback: 'Gross Margin', value: formatPercent(quote.grossMargin), good: (quote.grossMargin ?? 0) > 0.3 },
                  { id: 'debtToEquity', fallback: 'Debt/Equity', value: quote.debtToEquity?.toFixed(1) ?? 'N/A', good: (quote.debtToEquity ?? 100) < 100 },
                  { id: 'currentRatio', fallback: 'Current Ratio', value: quote.currentRatio?.toFixed(2) ?? 'N/A', good: (quote.currentRatio ?? 0) > 1 },
                  { id: 'roe', fallback: 'ROE', value: formatPercent(quote.returnOnEquity), good: (quote.returnOnEquity ?? 0) > 0.1 },
                  { id: 'revenueGrowth', fallback: 'Revenue Growth', value: formatPercent(quote.revenueGrowth), good: (quote.revenueGrowth ?? 0) > 0 },
                  { id: 'earningsGrowth', fallback: 'Earnings Growth', value: formatPercent(quote.earningsGrowth), good: (quote.earningsGrowth ?? 0) > 0 },
                  { id: 'freeCashFlow', fallback: 'Free Cash Flow', value: formatCurrency(quote.freeCashFlow), good: (quote.freeCashFlow ?? 0) > 0 },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.good ? 'bg-success' : 'bg-destructive'}`} />
                    <div>
                      <MetricLabel 
                        metricId={item.id} 
                        fallbackLabel={item.fallback} 
                        className="text-xs text-muted-foreground" 
                      />
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company Description */}
          {quote.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="text-primary h-5 w-5" />
                  About {quote.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {quote.description.length > 500
                    ? quote.description.slice(0, 500) + '...'
                    : quote.description}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ──── Valuation Tab ──── */}
        <TabsContent value="valuation" className="space-y-6 mt-6">
          {/* Valuation Summary */}
          {fairValue && valuationStatus && (
            <Card className={
              valuationStatus.bgClass.includes('positive') ? 'border-success/30' :
              valuationStatus.bgClass.includes('negative') ? 'border-destructive/30' : 'border-warning/30'
            }>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-bold">Investment Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <MetricLabel metricId="currentPrice" fallbackLabel="Current Price" className="text-sm text-muted-foreground mb-1" />
                      <p className="text-2xl font-bold">{formatCurrency(quote.price)}</p>
                    </div>
                    <div>
                      <MetricLabel metricId="dcfFairValue" fallbackLabel="DCF Fair Value" className="text-sm text-muted-foreground mb-1" />
                      <p className={`text-2xl font-bold ${valuationStatus.color}`}>
                        {formatCurrency(fairValue)}
                      </p>
                    </div>
                    <div>
                      <MetricLabel metricId="dcfDifference" fallbackLabel="Difference" className="text-sm text-muted-foreground mb-1" />
                      <p className={`text-2xl font-bold ${valuationStatus.color}`}>
                        {((fairValue / quote.price - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <ValueBadge variant={
                    valuationStatus.bgClass.includes('positive') ? 'positive' :
                    valuationStatus.bgClass.includes('negative') ? 'negative' : 'neutral'
                  }>
                    {valuationStatus.message}
                  </ValueBadge>
                  <p className="text-sm text-muted-foreground">
                    Based on DCF analysis with {((dcfInputs?.growthRate ?? 0.05) * 100).toFixed(0)}% growth rate
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced DCF Calculator */}
          {dcfInputs && (
            <EnhancedDCF initialData={dcfInputs} />
          )}

          {/* PDF Export */}
          {fairValue && dcfInputs && (
            <PDFExport
              stock={quote}
              fairValue={fairValue}
              growthRate={dcfInputs.growthRate}
              terminalGrowthRate={dcfInputs.terminalGrowthRate}
              discountRate={dcfInputs.discountRate}
            />
          )}
        </TabsContent>

        {/* ──── Financials Tab ──── */}
        <TabsContent value="financials" className="space-y-6 mt-6">
          {validFinancials.length > 0 ? (
            <HistoricalTrends
              data={validFinancials}
              companyName={quote.name}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Financial statement data not available for {ticker}.</p>
              </CardContent>
            </Card>
          )}

          {/* Key Financial Ratios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="text-primary h-5 w-5" />
                Key Ratios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { id: 'peRatio', value: quote.peRatio?.toFixed(1) },
                  { id: 'forwardPE', value: quote.forwardPE?.toFixed(1) },
                  { id: 'psRatio', value: quote.psRatio?.toFixed(1) },
                  { id: 'pbRatio', value: quote.pbRatio?.toFixed(1) },
                  { id: 'debtToEquity', value: quote.debtToEquity?.toFixed(1) },
                  { id: 'operatingMargin', value: formatPercent(quote.operatingMargin) },
                ].map((item) => (
                  <div key={item.id} className="space-y-1">
                    <MetricLabel metricId={item.id} className="text-sm text-muted-foreground" />
                    <p className="text-xl font-bold">{item.value ?? 'N/A'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Analysis Tab ──── */}
        <TabsContent value="analysis" className="space-y-6 mt-6">
          {/* Automated Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="text-primary h-5 w-5" />
                Automated Analysis
                <Badge variant="secondary" className="ml-auto">Rule-based</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const signals: { type: 'green' | 'red' | 'neutral'; text: string }[] = [];

                // Valuation
                if (fairValue && quote.price) {
                  const upside = (fairValue / quote.price - 1) * 100;
                  if (upside > 20) signals.push({ type: 'green', text: `DCF suggests ${upside.toFixed(0)}% upside — potentially undervalued` });
                  else if (upside < -20) signals.push({ type: 'red', text: `DCF suggests ${Math.abs(upside).toFixed(0)}% overvalued at current price` });
                  else signals.push({ type: 'neutral', text: `Trading near DCF fair value (${upside > 0 ? '+' : ''}${upside.toFixed(0)}%)` });
                }

                // Profitability
                if (quote.profitMargin !== null && quote.profitMargin > 0.15)
                  signals.push({ type: 'green', text: `Strong profit margin of ${(quote.profitMargin * 100).toFixed(1)}%` });
                if (quote.profitMargin !== null && quote.profitMargin < 0.05 && quote.profitMargin > 0)
                  signals.push({ type: 'red', text: `Thin profit margin of ${(quote.profitMargin * 100).toFixed(1)}%` });

                // Growth
                if (quote.revenueGrowth !== null && quote.revenueGrowth > 0.1)
                  signals.push({ type: 'green', text: `Revenue growing at ${(quote.revenueGrowth * 100).toFixed(1)}%` });
                if (quote.revenueGrowth !== null && quote.revenueGrowth < 0)
                  signals.push({ type: 'red', text: `Revenue declining at ${(quote.revenueGrowth * 100).toFixed(1)}%` });

                // Cash flow
                if (quote.freeCashFlow !== null && quote.freeCashFlow > 0)
                  signals.push({ type: 'green', text: `Generating ${formatCurrency(quote.freeCashFlow)} in free cash flow` });
                if (quote.freeCashFlow !== null && quote.freeCashFlow < 0)
                  signals.push({ type: 'red', text: 'Negative free cash flow — burning cash' });

                // Debt
                if (quote.debtToEquity !== null && quote.debtToEquity > 200)
                  signals.push({ type: 'red', text: `High debt-to-equity ratio of ${quote.debtToEquity.toFixed(0)}%` });
                if (quote.debtToEquity !== null && quote.debtToEquity < 50)
                  signals.push({ type: 'green', text: `Conservative debt levels (D/E: ${quote.debtToEquity.toFixed(0)}%)` });

                // Beta
                if (quote.beta !== null && quote.beta > 1.5)
                  signals.push({ type: 'red', text: `High volatility (Beta: ${quote.beta.toFixed(2)}) — price swings more than market` });
                if (quote.beta !== null && quote.beta < 0.8)
                  signals.push({ type: 'green', text: `Low volatility (Beta: ${quote.beta.toFixed(2)}) — more stable than market` });

                // 52-week range positioning
                if (quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow) {
                  const range52w = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
                  const position = (quote.price - quote.fiftyTwoWeekLow) / range52w;
                  if (position < 0.3)
                    signals.push({ type: 'green', text: 'Trading near 52-week low — potential value entry' });
                  if (position > 0.9)
                    signals.push({ type: 'neutral', text: 'Trading near 52-week high' });
                }

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {signals.map((signal, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-3 rounded-lg border ${
                            signal.type === 'green' ? 'border-success/20 bg-success/5' :
                            signal.type === 'red' ? 'border-destructive/20 bg-destructive/5' :
                            'border-warning/20 bg-warning/5'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            signal.type === 'green' ? 'bg-success' :
                            signal.type === 'red' ? 'bg-destructive' : 'bg-warning'
                          }`} />
                          <p className="text-sm">{signal.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg border text-xs text-muted-foreground">
                      <strong>Disclaimer:</strong> This is an automated rule-based analysis, not financial advice.
                      Always conduct your own research before making investment decisions.
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Comparison Tab ──── */}
        <TabsContent value="comparison" className="space-y-6 mt-6">
          <StockComparison baseQuote={quote} />
        </TabsContent>
      </Tabs>
    </div>
  );
};