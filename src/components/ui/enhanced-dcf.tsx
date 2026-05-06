import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { GlossaryTooltip } from './glossary-tooltip';
import { MetricLabel } from './metric-label';
import { Input } from './input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Calculator, Target, TrendingUp, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';
import { runDCF, formatCurrency } from '@/lib/dcf';

interface EnhancedDCFProps {
  initialData?: {
    freeCashFlow: number;
    sharesOutstanding: number;
    growthRate: number;
    terminalGrowthRate: number;
    discountRate: number;
    trailingEps?: number | null;
    bookValue?: number | null;
  };
}

export function EnhancedDCF({ initialData }: EnhancedDCFProps) {
  const [freeCashFlow, setFreeCashFlow] = useState(initialData?.freeCashFlow || 1000000000);
  const [sharesOutstanding, setSharesOutstanding] = useState(initialData?.sharesOutstanding || 500000000);
  const [growthRate, setGrowthRate] = useState(initialData?.growthRate || 0.10);
  const [terminalGrowthRate, setTerminalGrowthRate] = useState(initialData?.terminalGrowthRate || 0.02);
  const [discountRate, setDiscountRate] = useState(initialData?.discountRate || 0.09);

  const scenarios = useMemo(() => {
    const base = runDCF(freeCashFlow, growthRate, terminalGrowthRate, discountRate, sharesOutstanding);
    
    // Conservative: Lower growth, higher discount rate
    const conservative = runDCF(
      freeCashFlow, 
      Math.max(0.02, growthRate - 0.05), 
      Math.max(0.01, terminalGrowthRate - 0.01), 
      discountRate + 0.02, 
      sharesOutstanding
    );
    
    // Optimistic: Higher growth, lower discount rate
    const optimistic = runDCF(
      freeCashFlow, 
      growthRate + 0.05, 
      Math.min(0.04, terminalGrowthRate + 0.01), 
      Math.max(0.05, discountRate - 0.02), 
      sharesOutstanding
    );

    return { base, conservative, optimistic };
  }, [freeCashFlow, sharesOutstanding, growthRate, terminalGrowthRate, discountRate]);

  const getScenarioColor = (scenario: 'conservative' | 'base' | 'optimistic') => {
    switch (scenario) {
      case 'conservative': return 'text-destructive';
      case 'base': return 'text-primary';
      case 'optimistic': return 'text-success';
    }
  };

  const multipleMethodsComparison = useMemo(() => {
    const dcfValue = scenarios.base;
    const peMultiple = 20; // Industry average P/E
    const pbMultiple = 3;  // Industry average P/B
    
    // P/E method: use real EPS from yfinance if available
    const eps = initialData?.trailingEps;
    const peValuation = eps ? eps * peMultiple : null;
    
    // Book Value method: use real book value per share from yfinance
    const bvps = initialData?.bookValue;
    const pbValuation = bvps ? bvps * pbMultiple : null;

    return {
      dcf: dcfValue,
      pe: peValuation,
      pb: pbValuation
    };
  }, [scenarios.base, initialData?.trailingEps, initialData?.bookValue]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Enhanced DCF Analysis
            <Badge variant="outline">Professional-grade valuation toolkit</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="methods">Methods</TabsTrigger>
              <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Your Assumptions
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <MetricLabel metricId="freeCashFlow" fallbackLabel="Free Cash Flow ($)" className="text-sm font-medium mb-1" />
                      <Input
                        id="fcf"
                        type="number"
                        value={freeCashFlow}
                        onChange={(e) => setFreeCashFlow(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <MetricLabel metricId="sharesOutstanding" fallbackLabel="Shares Outstanding" className="text-sm font-medium mb-1" />
                      <Input
                        id="shares"
                        type="number"
                        value={sharesOutstanding}
                        onChange={(e) => setSharesOutstanding(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <MetricLabel metricId="growthRate" fallbackLabel={`Growth Rate: ${(growthRate * 100).toFixed(0)}%`} className="text-sm font-medium mb-1" />
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={growthRate}
                        onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <MetricLabel metricId="terminalGrowthRate" fallbackLabel={`Terminal Growth: ${(terminalGrowthRate * 100).toFixed(1)}%`} className="text-sm font-medium mb-1" />
                      <input
                        type="range"
                        min="0"
                        max="0.05"
                        step="0.005"
                        value={terminalGrowthRate}
                        onChange={(e) => setTerminalGrowthRate(parseFloat(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <MetricLabel metricId="discountRate" fallbackLabel={`Discount Rate: ${(discountRate * 100).toFixed(1)}%`} className="text-sm font-medium mb-1" />
                      <input
                        type="range"
                        min="0.05"
                        max="0.15"
                        step="0.005"
                        value={discountRate}
                        onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Result Section */}
                <div className="flex flex-col justify-center">
                  <div className="text-center p-6 bg-muted/30 rounded-lg">
                    <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Fair Value</h3>
                    <p className="text-4xl font-extrabold text-primary mb-2">
                      {formatCurrency(scenarios.base)}
                    </p>
                    <p className="text-sm text-muted-foreground">per share</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-destructive/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Conservative
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive mb-2">
                      {formatCurrency(scenarios.conservative)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lower growth, higher discount rate - what if things go wrong?
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-primary/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Base Case
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary mb-2">
                      {formatCurrency(scenarios.base)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your assumptions - the most likely scenario
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-success/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      Optimistic
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-success mb-2">
                      {formatCurrency(scenarios.optimistic)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Higher growth, lower discount rate - best case scenario
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">💡 Why Scenarios Matter</h4>
                <p className="text-sm text-muted-foreground">
                  Like checking the weather forecast - you want to know if it might rain (conservative), 
                  be sunny (optimistic), or partly cloudy (base case). This helps you make better investment decisions!
                </p>
              </div>
            </TabsContent>

            <TabsContent value="methods" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      <MetricLabel metricId="dcfMethod" fallbackLabel="DCF Method" className="font-semibold" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary mb-2">
                      {formatCurrency(multipleMethodsComparison.dcf)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-warning" />
                      <MetricLabel metricId="peMethod" fallbackLabel="P/E Method" className="font-semibold" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-warning mb-2">
                      {formatCurrency(multipleMethodsComparison.pe)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success" />
                      <MetricLabel metricId="bookValueMethod" fallbackLabel="Book Value" className="font-semibold" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-success mb-2">
                      {formatCurrency(multipleMethodsComparison.pb)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">🎯 Which Method to Trust?</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>DCF:</strong> Best for stable, predictable companies with consistent cash flows</p>
                  <p><strong>P/E:</strong> Good for comparing to similar companies, but watch out for temporary earnings spikes</p>
                  <p><strong>Book Value:</strong> Useful for asset-heavy companies, but misses intangible value like brands</p>
                  <p className="text-primary font-medium">💡 Smart investors use all three and look for convergence!</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assumptions" className="space-y-6 mt-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Professional Assumptions Guide
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Growth Rate (5-Year)</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Mature companies:</strong> 3-7%</li>
                      <li>• <strong>Growth companies:</strong> 10-20%</li>
                      <li>• <strong>Tech/startup:</strong> 20-50%</li>
                      <li>• <strong>Declining industries:</strong> 0-5%</li>
                    </ul>
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      💡 Like expecting your income to grow - be realistic about what's sustainable!
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Terminal Growth</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>US economy:</strong> 2-3%</li>
                      <li>• <strong>Developed markets:</strong> 1-2%</li>
                      <li>• <strong>Emerging markets:</strong> 3-4%</li>
                      <li>• <strong>Conservative:</strong> 1-2%</li>
                    </ul>
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      💡 Usually matches long-term GDP growth - companies can't grow faster than the economy forever!
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Discount Rate (WACC)</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Blue chips:</strong> 6-9%</li>
                      <li>• <strong>Mid caps:</strong> 8-12%</li>
                      <li>• <strong>Small caps:</strong> 10-15%</li>
                      <li>• <strong>High risk:</strong> 12-20%</li>
                    </ul>
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      💡 Like interest rate you'd demand - riskier investments need higher returns!
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Red Flags to Watch</h5>
                    <ul className="space-y-1 text-muted-foreground">
                       <li>• Growth {'>'}30% for mature companies</li>
                       <li>• Terminal growth {'>'} 4%</li>
                       <li>• Discount rate {'<'} 6%</li>
                      <li>• Inconsistent historical performance</li>
                    </ul>
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      💡 If it sounds too good to be true, double-check your math!
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}