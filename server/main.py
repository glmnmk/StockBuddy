"""
StockBuddy API — FastAPI backend powered by yfinance.

Provides live stock data, financials, historical prices, and search.
"""

import math
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockbuddy")

app = FastAPI(
    title="StockBuddy API",
    description="Live stock data API for StockBuddy",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from models import (
    QuoteResponse,
    HistoricalPrice,
    HistoryResponse,
    FinancialYear,
    FinancialsResponse,
    SearchResult,
    SearchResponse,
    SummaryResponse,
    ErrorResponse,
)
from cache import cache, QUOTE_TTL, FINANCIALS_TTL, HISTORY_TTL, SEARCH_TTL


def safe_float(value, default=None) -> float | None:
    if value is None:
        return default
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def safe_int(value, default=None) -> int | None:
    if value is None:
        return default
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return int(f)
    except (ValueError, TypeError):
        return default


# ─── Quote Endpoint ───────────────────────────────────────────────

@app.get("/api/quote/{ticker}", response_model=QuoteResponse)
async def get_quote(ticker: str):
    ticker = ticker.upper().strip()
    cached = cache.get(f"quote:{ticker}")
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        if not info or info.get("regularMarketPrice") is None:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")

        price = safe_float(info.get("regularMarketPrice") or info.get("currentPrice"), 0)
        prev_close = safe_float(info.get("regularMarketPreviousClose") or info.get("previousClose"), price)
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close * 100) if prev_close else 0, 2)

        result = QuoteResponse(
            ticker=ticker,
            name=info.get("shortName") or info.get("longName") or ticker,
            price=price,
            previousClose=prev_close,
            change=change,
            changePercent=change_pct,
            marketCap=safe_float(info.get("marketCap")),
            peRatio=safe_float(info.get("trailingPE")),
            forwardPE=safe_float(info.get("forwardPE")),
            psRatio=safe_float(info.get("priceToSalesTrailing12Months")),
            pbRatio=safe_float(info.get("priceToBook")),
            beta=safe_float(info.get("beta")),
            fiftyTwoWeekHigh=safe_float(info.get("fiftyTwoWeekHigh")),
            fiftyTwoWeekLow=safe_float(info.get("fiftyTwoWeekLow")),
            volume=safe_int(info.get("volume")),
            avgVolume=safe_int(info.get("averageVolume")),
            dividendYield=safe_float(info.get("dividendYield")),
            sector=info.get("sector"),
            industry=info.get("industry"),
            description=info.get("longBusinessSummary"),
            freeCashFlow=safe_float(info.get("freeCashflow")),
            sharesOutstanding=safe_int(info.get("sharesOutstanding")),
            totalRevenue=safe_float(info.get("totalRevenue")),
            netIncome=safe_float(info.get("netIncomeToCommon")),
            totalDebt=safe_float(info.get("totalDebt")),
            totalEquity=safe_float(info.get("totalStockholderEquity")),
            debtToEquity=safe_float(info.get("debtToEquity")),
            returnOnEquity=safe_float(info.get("returnOnEquity")),
            profitMargin=safe_float(info.get("profitMargins")),
            grossMargin=safe_float(info.get("grossMargins")),
            operatingMargin=safe_float(info.get("operatingMargins")),
            revenueGrowth=safe_float(info.get("revenueGrowth")),
            earningsGrowth=safe_float(info.get("earningsGrowth")),
            currentRatio=safe_float(info.get("currentRatio")),
            trailingEps=safe_float(info.get("trailingEps")),
            bookValue=safe_float(info.get("bookValue")),
        )

        cache.set(f"quote:{ticker}", result, QUOTE_TTL)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quote for {ticker}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data for '{ticker}': {type(e).__name__}: {str(e)}")


# ─── History Endpoint ─────────────────────────────────────────────

RANGE_MAP = {
    "1d":  ("1d",  "5m"),
    "5d":  ("5d",  "15m"),
    "1mo": ("1mo", "1h"),
    "3mo": ("3mo", "1d"),
    "6mo": ("6mo", "1d"),
    "1y":  ("1y",  "1d"),
    "5y":  ("5y",  "1wk"),
}

@app.get("/api/history/{ticker}", response_model=HistoryResponse)
async def get_history(
    ticker: str,
    range: str = Query("1y", description="Time range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y"),
):
    ticker = ticker.upper().strip()
    range_key = range.lower()

    if range_key not in RANGE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid range '{range}'. Use: {list(RANGE_MAP.keys())}")

    cache_key = f"history:{ticker}:{range_key}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        period, interval = RANGE_MAP[range_key]
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No history data for '{ticker}'")

        prices = []
        for date, row in hist.iterrows():
            date_str = date.strftime("%Y-%m-%d %H:%M") if interval in ("5m", "15m", "1h") else date.strftime("%Y-%m-%d")
            prices.append(HistoricalPrice(
                date=date_str,
                open=round(float(row["Open"]), 2),
                high=round(float(row["High"]), 2),
                low=round(float(row["Low"]), 2),
                close=round(float(row["Close"]), 2),
                volume=int(row["Volume"]),
            ))

        result = HistoryResponse(ticker=ticker, prices=prices)
        cache.set(cache_key, result, HISTORY_TTL)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history for '{ticker}': {e}")


# ─── Financials Endpoint ──────────────────────────────────────────

@app.get("/api/financials/{ticker}", response_model=FinancialsResponse)
async def get_financials(ticker: str):
    ticker = ticker.upper().strip()
    cached = cache.get(f"financials:{ticker}")
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        income_stmt = stock.income_stmt
        balance_sheet = stock.balance_sheet
        cashflow = stock.cashflow

        annuals = []

        if income_stmt is not None and not income_stmt.empty:
            for col in income_stmt.columns[:5]:
                year = col.strftime("%Y")

                revenue = safe_float(income_stmt.loc["Total Revenue", col]) if "Total Revenue" in income_stmt.index else None
                net_income = safe_float(income_stmt.loc["Net Income", col]) if "Net Income" in income_stmt.index else None
                operating_income = safe_float(income_stmt.loc["Operating Income", col]) if "Operating Income" in income_stmt.index else None
                gross_profit = safe_float(income_stmt.loc["Gross Profit", col]) if "Gross Profit" in income_stmt.index else None

                total_debt = None
                total_equity = None
                if balance_sheet is not None and not balance_sheet.empty and col in balance_sheet.columns:
                    total_debt = safe_float(balance_sheet.loc["Total Debt", col]) if "Total Debt" in balance_sheet.index else None
                    total_equity = safe_float(balance_sheet.loc["Stockholders Equity", col]) if "Stockholders Equity" in balance_sheet.index else (
                        safe_float(balance_sheet.loc["Total Equity Gross Minority Interest", col]) if "Total Equity Gross Minority Interest" in balance_sheet.index else None
                    )

                fcf = None
                if cashflow is not None and not cashflow.empty and col in cashflow.columns:
                    operating_cf = safe_float(cashflow.loc["Operating Cash Flow", col]) if "Operating Cash Flow" in cashflow.index else None
                    capex = safe_float(cashflow.loc["Capital Expenditure", col]) if "Capital Expenditure" in cashflow.index else None
                    if operating_cf is not None and capex is not None:
                        fcf = operating_cf + capex
                    elif "Free Cash Flow" in cashflow.index:
                        fcf = safe_float(cashflow.loc["Free Cash Flow", col])

                annuals.append(FinancialYear(
                    year=year,
                    revenue=revenue,
                    netIncome=net_income,
                    freeCashFlow=fcf,
                    totalDebt=total_debt,
                    totalEquity=total_equity,
                    operatingIncome=operating_income,
                    grossProfit=gross_profit,
                ))

        annuals.reverse()

        result = FinancialsResponse(
            ticker=ticker,
            annuals=annuals,
            sharesOutstanding=safe_int(info.get("sharesOutstanding")),
        )

        cache.set(f"financials:{ticker}", result, FINANCIALS_TTL)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financials for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch financials for '{ticker}': {e}")


# ─── Search Endpoint ──────────────────────────────────────────────

@app.get("/api/search", response_model=SearchResponse)
async def search_stocks(
    q: str = Query(..., min_length=1),
    limit: int = Query(4, ge=1, le=10),
):
    query = q.strip().upper()
    cache_key = f"search:{query}:{limit}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        # Use Yahoo Finance autocomplete API directly (same as mini-aladdin)
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=5)
        data = response.json()
        quotes = data.get("quotes", [])

        results = []
        us_exchanges = {"NMS", "NYQ", "NGM", "NCM", "PCX", "ASE", "BTS", "NAS", "NYSE", "NASDAQ"}
        for item in quotes:
            if item.get("quoteType") == "EQUITY" and item.get("exchange", "") in us_exchanges:
                results.append(SearchResult(
                    ticker=item.get("symbol", ""),
                    name=item.get("shortname") or item.get("longname") or item.get("symbol", ""),
                    exchange=item.get("exchange", ""),
                    type="EQUITY",
                ))
            if len(results) >= limit:
                break

        result = SearchResponse(query=q, results=results)
        cache.set(cache_key, result, SEARCH_TTL)
        return result

    except Exception as e:
        logger.error(f"Search error for '{q}': {e}")
        return SearchResponse(query=q, results=[])


# ─── Summary Endpoint ─────────────────────────────────────────────

@app.get("/api/summary/{ticker}", response_model=SummaryResponse)
async def get_summary(ticker: str):
    ticker = ticker.upper().strip()
    cached = cache.get(f"summary:{ticker}")
    if cached:
        return cached

    quote = await get_quote(ticker)
    financials = await get_financials(ticker)
    history_resp = await get_history(ticker, range="1y")

    result = SummaryResponse(
        quote=quote,
        financials=financials,
        history=history_resp.prices,
    )
    cache.set(f"summary:{ticker}", result, QUOTE_TTL)
    return result


# ─── Market Overview ──────────────────────────────────────────────

@app.get("/api/market-overview", response_model=list[QuoteResponse])
async def get_market_overview():
    indices = ["^GSPC", "^IXIC", "^DJI"]
    cache_key = "market_overview"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        tickers = yf.Tickers(" ".join(indices))
        results = []
        name_map = {"^GSPC": "S&P 500", "^IXIC": "NASDAQ", "^DJI": "Dow Jones"}

        for symbol in indices:
            info = tickers.tickers[symbol].info
            price = safe_float(info.get("regularMarketPrice") or info.get("currentPrice") or info.get("previousClose") or 0)
            prev_close = safe_float(info.get("regularMarketPreviousClose") or info.get("previousClose") or price)
            change = price - prev_close
            change_percent = (change / prev_close * 100) if prev_close > 0 else 0

            results.append(QuoteResponse(
                ticker=symbol, name=name_map.get(symbol, symbol),
                price=price, previousClose=prev_close,
                change=change, changePercent=change_percent,
                marketCap=None, peRatio=None, forwardPE=None, psRatio=None, pbRatio=None,
                beta=None, fiftyTwoWeekHigh=safe_float(info.get("fiftyTwoWeekHigh")),
                fiftyTwoWeekLow=safe_float(info.get("fiftyTwoWeekLow")),
                volume=safe_int(info.get("regularMarketVolume")),
                avgVolume=safe_int(info.get("averageVolume")),
                dividendYield=None, sector=None, industry="Index", description=None,
                freeCashFlow=None, sharesOutstanding=None, totalRevenue=None,
                netIncome=None, totalDebt=None, totalEquity=None, debtToEquity=None,
                returnOnEquity=None, profitMargin=None, grossMargin=None,
                operatingMargin=None, revenueGrowth=None, earningsGrowth=None,
                currentRatio=None, trailingEps=None, bookValue=None
            ))

        cache.set(cache_key, results, QUOTE_TTL)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "stockbuddy-api", "region": "oregon"}
