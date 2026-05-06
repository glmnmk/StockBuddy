import type { QuoteData } from './types';

export const runDCF = (
  freeCashFlow: number | null,
  growthRate: number,
  terminalGrowthRate: number,
  discountRate: number,
  sharesOutstanding: number
): number | null => {
  if (freeCashFlow === null || !sharesOutstanding || isNaN(freeCashFlow) || isNaN(sharesOutstanding) || sharesOutstanding === 0) {
    return null;
  }

  const projectedCashFlows: number[] = [];
  let currentCashFlow = freeCashFlow;
  const validGrowthRate = isNaN(growthRate) ? 0.05 : growthRate;

  // Project 5 years of cash flows
  for (let i = 0; i < 5; i++) {
    currentCashFlow *= (1 + validGrowthRate);
    projectedCashFlows.push(currentCashFlow);
  }

  // Calculate terminal value
  const terminalCashFlow = currentCashFlow * (1 + terminalGrowthRate);
  const terminalValue = terminalCashFlow / (discountRate - terminalGrowthRate);

  // Calculate present value of projected cash flows
  let presentValue = 0;
  for (let i = 0; i < 5; i++) {
    presentValue += projectedCashFlows[i] / Math.pow(1 + discountRate, i + 1);
  }

  // Add present value of terminal value
  presentValue += terminalValue / Math.pow(1 + discountRate, 5);

  // Return per share value
  return presentValue / sharesOutstanding;
};

export const formatCurrency = (value: number | null): string => {
  if (value === null || isNaN(value)) return 'N/A';
  
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  
  return `$${value.toFixed(2)}`;
};

export const formatLargeNumber = (value: number | null): string => {
  if (value === null || isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
};

export const formatPercent = (value: number | null): string => {
  if (value === null || isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
};

export const getValuationStatus = (fairValue: number | null, currentPrice: number) => {
  if (!fairValue) {
    return {
      message: "Data Unavailable",
      color: "text-muted-foreground",
      bgClass: "value-neutral"
    };
  }

  const ratio = fairValue / currentPrice;

  if (ratio > 1.2) {
    return {
      message: "Potentially Undervalued",
      color: "text-success",
      bgClass: "value-positive"
    };
  } else if (ratio < 0.8) {
    return {
      message: "Potentially Overvalued",
      color: "text-destructive",
      bgClass: "value-negative"
    };
  } else {
    return {
      message: "Fairly Valued",
      color: "text-warning",
      bgClass: "value-neutral"
    };
  }
};

/**
 * Extract DCF inputs from a live quote.
 * Estimates a historical growth rate from the available data.
 */
export const extractDCFInputs = (quote: QuoteData) => {
  const growthRate = quote.revenueGrowth ?? quote.earningsGrowth ?? 0.05;
  return {
    freeCashFlow: quote.freeCashFlow ?? 0,
    sharesOutstanding: quote.sharesOutstanding ?? 1,
    growthRate: Math.max(0, Math.min(growthRate, 0.5)), // Clamp 0–50%
    terminalGrowthRate: 0.025,
    discountRate: 0.09,
    trailingEps: quote.trailingEps,
    bookValue: quote.bookValue,
  };
};