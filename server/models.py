"""Pydantic response models for the StockBuddy API."""

from pydantic import BaseModel
from typing import Optional


class QuoteResponse(BaseModel):
    """Live stock quote data."""
    ticker: str
    name: str
    price: float
    previousClose: float
    change: float
    changePercent: float
    marketCap: Optional[float] = None
    peRatio: Optional[float] = None
    forwardPE: Optional[float] = None
    psRatio: Optional[float] = None
    pbRatio: Optional[float] = None
    beta: Optional[float] = None
    fiftyTwoWeekHigh: Optional[float] = None
    fiftyTwoWeekLow: Optional[float] = None
    volume: Optional[int] = None
    avgVolume: Optional[int] = None
    dividendYield: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    # Financial summary
    freeCashFlow: Optional[float] = None
    sharesOutstanding: Optional[int] = None
    totalRevenue: Optional[float] = None
    netIncome: Optional[float] = None
    totalDebt: Optional[float] = None
    totalEquity: Optional[float] = None
    debtToEquity: Optional[float] = None
    returnOnEquity: Optional[float] = None
    profitMargin: Optional[float] = None
    grossMargin: Optional[float] = None
    operatingMargin: Optional[float] = None
    revenueGrowth: Optional[float] = None
    earningsGrowth: Optional[float] = None
    currentRatio: Optional[float] = None
    # Per-share metrics for DCF alternative methods
    trailingEps: Optional[float] = None
    bookValue: Optional[float] = None


class HistoricalPrice(BaseModel):
    """Single historical price data point."""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoryResponse(BaseModel):
    """Historical price data response."""
    ticker: str
    prices: list[HistoricalPrice]


class FinancialYear(BaseModel):
    """Annual financial data for one year."""
    year: str
    revenue: Optional[float] = None
    netIncome: Optional[float] = None
    freeCashFlow: Optional[float] = None
    totalDebt: Optional[float] = None
    totalEquity: Optional[float] = None
    operatingIncome: Optional[float] = None
    grossProfit: Optional[float] = None


class FinancialsResponse(BaseModel):
    """Multi-year financial data response."""
    ticker: str
    annuals: list[FinancialYear]
    sharesOutstanding: Optional[int] = None


class SearchResult(BaseModel):
    """Single search result."""
    ticker: str
    name: str
    exchange: str
    type: str


class SearchResponse(BaseModel):
    """Search results response."""
    query: str
    results: list[SearchResult]


class SummaryResponse(BaseModel):
    """Combined summary: quote + financials in one call."""
    quote: QuoteResponse
    financials: FinancialsResponse
    history: list[HistoricalPrice]


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
