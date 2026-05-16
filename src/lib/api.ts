/**
 * StockBuddy API Client
 *
 * Talks to the Python FastAPI backend for live stock data.
 */

import type {
  QuoteData,
  HistoricalPrice,
  FinancialsData,
  SearchResult,
  StockSummary,
  TimeFrame,
  TIME_FRAME_MAP,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// ─── Core fetch helper ───────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ─── API Functions ───────────────────────────────────────────────

/** Get live quote data for a single stock. */
export async function fetchQuote(ticker: string): Promise<QuoteData> {
  return apiFetch<QuoteData>(`/quote/${encodeURIComponent(ticker)}`);
}

/** Get historical price data. */
export async function fetchHistory(
  ticker: string,
  range: string = '1y'
): Promise<HistoricalPrice[]> {
  const data = await apiFetch<{ ticker: string; prices: HistoricalPrice[] }>(
    `/history/${encodeURIComponent(ticker)}?range=${range}`
  );
  return data.prices;
}

/** Get annual financial statements (up to 5 years). */
export async function fetchFinancials(ticker: string): Promise<FinancialsData> {
  return apiFetch<FinancialsData>(`/financials/${encodeURIComponent(ticker)}`);
}

/** Search for stocks by name or ticker. Returns max 4 results. */
export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const data = await apiFetch<{ query: string; results: SearchResult[] }>(
    `/search?q=${encodeURIComponent(query)}&limit=4`
  );
  return data.results;
}

/** Get combined summary (quote + financials + history) in one call. */
export async function fetchSummary(ticker: string): Promise<StockSummary> {
  return apiFetch<StockSummary>(`/summary/${encodeURIComponent(ticker)}`);
}

/** Fetch quotes for multiple tickers in a single API call (1 SQL query). */
export async function fetchMultipleQuotes(tickers: string[]): Promise<QuoteData[]> {
  if (tickers.length === 0) return [];
  return apiFetch<QuoteData[]>(
    `/quotes/batch?tickers=${tickers.map(encodeURIComponent).join(',')}`
  );
}

/** Get live market overview (indices). */
export async function fetchMarketOverview(): Promise<QuoteData[]> {
  return apiFetch<QuoteData[]>('/market-overview');
}

// ─── Featured / Popular Tickers ──────────────────────────────────

export const FEATURED_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
  'META', 'TSLA', 'BRK-B', 'JPM', 'V',
];
