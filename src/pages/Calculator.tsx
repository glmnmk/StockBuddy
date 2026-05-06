import React, { useState, useMemo } from 'react';
import { Calculator as CalculatorIcon, Target, TrendingUp, DollarSign, Search, Loader2 } from 'lucide-react';
import { StockCard } from '@/components/ui/stock-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StockSearch } from '@/components/ui/stock-search';
import { MetricLabel } from '@/components/ui/metric-label';
import { runDCF, formatCurrency, extractDCFInputs } from '@/lib/dcf';
import { fetchQuote } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export const Calculator: React.FC = () => {
  const [freeCashFlow, setFreeCashFlow] = useState(1000000000);
  const [sharesOutstanding, setSharesOutstanding] = useState(500000000);
  const [growthRate, setGrowthRate] = useState(0.10);
  const [terminalGrowthRate, setTerminalGrowthRate] = useState(0.02);
  const [discountRate, setDiscountRate] = useState(0.09);
  
  const [loadedTicker, setLoadedTicker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStockSelect = async (ticker: string) => {
    setIsLoading(true);
    try {
      const quote = await fetchQuote(ticker);
      const inputs = extractDCFInputs(quote);
      
      setFreeCashFlow(inputs.freeCashFlow);
      setSharesOutstanding(inputs.sharesOutstanding);
      setGrowthRate(inputs.growthRate);
      setTerminalGrowthRate(inputs.terminalGrowthRate);
      setDiscountRate(inputs.discountRate);
      setLoadedTicker(ticker);
      
      toast({
        title: "Data Loaded",
        description: `Successfully populated real-time data for ${ticker}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stock data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fairValue = useMemo(() => {
    return runDCF(freeCashFlow, growthRate, terminalGrowthRate, discountRate, sharesOutstanding);
  }, [freeCashFlow, sharesOutstanding, growthRate, terminalGrowthRate, discountRate]);

  return (
    <div className="animate-fade-in space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center space-x-3">
          <CalculatorIcon className="h-10 w-10 text-primary animate-bounce" />
          <span>DCF Calculator</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
          Calculate the fair value of any company using Discounted Cash Flow analysis. 
          Input your own assumptions and see how they affect the valuation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Input Section */}
        <StockCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-2xl font-bold flex items-center">
              <TrendingUp className="mr-3 text-blue-500" />
              Your Assumptions
            </h3>
            {loadedTicker && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 shrink-0">
                Data loaded: {loadedTicker}
              </Badge>
            )}
          </div>
          
          <div className="mb-8 p-4 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-sm font-semibold mb-2 block flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Auto-fill from Stock
            </span>
            <div className="relative">
              <StockSearch 
                placeholder="Search a ticker to auto-fill..."
                onSelect={handleStockSelect}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Select a stock to instantly populate its real-time Free Cash Flow and Shares Outstanding.
            </p>
          </div>
          
          <div className="space-y-6">
            <div>
              <MetricLabel metricId="freeCashFlow" fallbackLabel="Starting Free Cash Flow ($)" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2" />
              <Input
                id="fcf"
                type="number"
                value={freeCashFlow}
                onChange={(e) => setFreeCashFlow(Number(e.target.value))}
                placeholder="e.g., 1000000000"
              />
            </div>

            <div>
              <MetricLabel metricId="sharesOutstanding" fallbackLabel="Shares Outstanding" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2" />
              <Input
                id="shares"
                type="number"
                value={sharesOutstanding}
                onChange={(e) => setSharesOutstanding(Number(e.target.value))}
                placeholder="e.g., 500000000"
              />
            </div>

            <div>
              <MetricLabel metricId="growthRate" fallbackLabel={`Growth Rate (5 Years): ${(growthRate * 100).toFixed(0)}%`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2" />
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={growthRate}
                onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <MetricLabel metricId="terminalGrowthRate" fallbackLabel={`Terminal Growth Rate: ${(terminalGrowthRate * 100).toFixed(1)}%`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2" />
              <input
                type="range"
                min="0"
                max="0.05"
                step="0.005"
                value={terminalGrowthRate}
                onChange={(e) => setTerminalGrowthRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <MetricLabel metricId="discountRate" fallbackLabel={`Discount Rate (WACC): ${(discountRate * 100).toFixed(1)}%`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2" />
              <input
                type="range"
                min="0.05"
                max="0.15"
                step="0.005"
                value={discountRate}
                onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </StockCard>

        {/* Result Section */}
        <StockCard variant="highlight" className="flex flex-col justify-center">
          <div className="text-center">
            <Target className="h-16 w-16 text-primary mx-auto mb-6 animate-glow" />
            <h3 className="text-2xl font-bold mb-4 flex items-center justify-center">
              <DollarSign className="mr-2" />
              Calculated Fair Value
            </h3>
            
            <div className="space-y-4">
              <p className="text-6xl font-extrabold text-primary animate-scale-in">
                {formatCurrency(fairValue)}
              </p>
              <p className="text-lg text-muted-foreground">per share</p>
            </div>

            <div className="mt-8 p-6 bg-muted/30 rounded-lg">
              <h4 className="font-bold mb-3">How This Works</h4>
              <div className="text-sm text-muted-foreground space-y-2 text-left">
                <p>• Projects cash flows for 5 years using your growth rate</p>
                <p>• Calculates terminal value using terminal growth rate</p>
                <p>• Discounts all future cash flows to present value</p>
                <p>• Divides by shares outstanding for per-share value</p>
              </div>
            </div>
          </div>
        </StockCard>
      </div>

      {/* Educational Section */}
      <StockCard className="max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold mb-6 text-center">Understanding DCF Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h4 className="font-bold mb-2">Cash Flow Projection</h4>
            <p className="text-sm text-muted-foreground">
              Estimates how much cash the company will generate in the future based on historical performance and growth assumptions.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-success" />
            </div>
            <h4 className="font-bold mb-2">Present Value</h4>
            <p className="text-sm text-muted-foreground">
              Converts future cash flows to today's dollars using a discount rate that reflects the risk and time value of money.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-warning/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-warning" />
            </div>
            <h4 className="font-bold mb-2">Fair Value</h4>
            <p className="text-sm text-muted-foreground">
              The sum of all discounted cash flows divided by shares outstanding gives you the intrinsic value per share.
            </p>
          </div>
        </div>
      </StockCard>
    </div>
  );
};