import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, Calculator, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockSearch } from '@/components/ui/stock-search';
import { MarketOverview } from '@/components/ui/market-overview';
import { fetchMultipleQuotes } from '@/lib/api';
import { formatCurrency } from '@/lib/dcf';
import type { QuoteData } from '@/lib/types';

export const Home: React.FC = () => {
  const [liveStock, setLiveStock] = useState<QuoteData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const quotes = await fetchMultipleQuotes(['AAPL']);
        if (quotes.length > 0) setLiveStock(quotes[0]);
      } catch {
        // silently fail — widget is optional
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <MarketOverview />
      
      {/* Hero Section */}
      <section className="section-hero container-editorial">
        <div className="grid-editorial items-center">
          <div className="space-editorial">
            <div className="space-y-8">
              <h1 className="text-massive text-display">
                Smart Stock
                <br />
                Analysis Made
                <br />
                <span className="text-accent">Simple</span>
              </h1>
              
              <p className="text-editorial text-muted-foreground max-w-xl">
                Analyze any US-listed stock with live data, DCF valuations, 
                and financial insights. Built for learning and discovery.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild className="button-primary group">
                  <Link to="/stocks" className="flex items-center gap-3">
                    Explore Stocks
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="button-secondary">
                  <Link to="/calculator">
                    DCF Calculator
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Live Data Widget */}
          <div className="relative">
            <div className="card-editorial animate-float">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-success animate-pulse-slow"></div>
                  <span className="text-sm font-medium text-muted-foreground">Live Data</span>
                </div>
                
                {liveStock ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-bold">{liveStock.name}</p>
                      <p className="text-sm text-muted-foreground">{liveStock.ticker}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold text-xl">{formatCurrency(liveStock.price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Change</span>
                      <span className={`font-semibold flex items-center gap-1 ${
                        liveStock.change >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {liveStock.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {liveStock.change >= 0 ? '+' : ''}{liveStock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="font-semibold">{formatCurrency(liveStock.marketCap)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-large container-editorial">
        <div className="text-center space-y-8 mb-20">
          <h2 className="text-display">
            Everything you need to
            <br />
            analyze stocks like a pro
          </h2>
          <p className="text-editorial text-muted-foreground max-w-3xl mx-auto">
            Live market data, professional-grade DCF models, and educational tools 
            — all in one place.
          </p>
        </div>
        
        <div className="grid-gallery">
          {[
            {
              icon: BarChart3,
              title: "Live Data Analysis",
              description: "Real-time prices, financials, and key metrics for any US-listed stock powered by Yahoo Finance."
            },
            {
              icon: Calculator,
              title: "Interactive DCF Models",
              description: "Adjust growth rates, discount rates, and see scenario analysis with conservative, base, and optimistic outcomes."
            },
            {
              icon: Target,
              title: "Smart Insights",
              description: "Automated analysis flags undervalued opportunities, financial health signals, and risk factors."
            }
          ].map((feature, index) => (
            <div key={index} className="card-elegant group">
              <div className="space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-display text-xl">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-medium container-editorial">
        <div className="card-editorial text-center bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
          <div className="space-y-8">
            <h2 className="text-display">
              Ready to make smarter
              <br />
              investment decisions?
            </h2>
            
            <p className="text-editorial text-muted-foreground max-w-2xl mx-auto">
              Start analyzing stocks with real data and professional tools 
              — completely free.
            </p>
            
            <Button asChild className="button-primary group">
              <Link to="/stocks" className="flex items-center gap-3">
                Start Analyzing
                <TrendingUp className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};