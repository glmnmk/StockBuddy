// ─── API Response Types (match Python backend Pydantic models) ────

export interface QuoteData {
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  psRatio: number | null;
  pbRatio: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  avgVolume: number | null;
  dividendYield: number | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  // Financial summary
  freeCashFlow: number | null;
  sharesOutstanding: number | null;
  totalRevenue: number | null;
  netIncome: number | null;
  totalDebt: number | null;
  totalEquity: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  profitMargin: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  currentRatio: number | null;
  // Per-share metrics
  trailingEps: number | null;
  bookValue: number | null;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FinancialYear {
  year: string;
  revenue: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  totalDebt: number | null;
  totalEquity: number | null;
  operatingIncome: number | null;
  grossProfit: number | null;
}

export interface FinancialsData {
  ticker: string;
  annuals: FinancialYear[];
  sharesOutstanding: number | null;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

export interface StockSummary {
  quote: QuoteData;
  financials: FinancialsData;
  history: HistoricalPrice[];
}

// ─── Frontend Types ───────────────────────────────────────────────

export interface DCFInputs {
  freeCashFlow: number;
  sharesOutstanding: number;
  growthRate: number;
  terminalGrowthRate: number;
  discountRate: number;
}

export type TimeFrame = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';

// Map frontend time frame labels to API range params
export const TIME_FRAME_MAP: Record<TimeFrame, string> = {
  '1D': '1d',
  '5D': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  '1Y': '1y',
  '5Y': '5y',
};