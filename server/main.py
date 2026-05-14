"""
StockBuddy API — FastAPI backend powered by WRDS/Compustat (Wharton).

Provides stock data, financials, historical prices, and search via
direct SQL queries to the Wharton Research Data Services PostgreSQL database.
"""

import math
import logging
import os
import datetime
import urllib.parse

import pandas as pd
import sqlalchemy as sa
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockbuddy")

# ─── WRDS Connection ──────────────────────────────────────────────

class WRDSConnection:
    """Direct PostgreSQL connection to WRDS (Wharton Research Data Services)."""
    def __init__(self, username: str, password: str):
        encoded_password = urllib.parse.quote(password)
        pguri = (
            f"postgresql://{username}:{encoded_password}"
            f"@wrds-pgdata.wharton.upenn.edu:9737/wrds"
        )
        self.engine = sa.create_engine(
            pguri,
            isolation_level="AUTOCOMMIT",
            connect_args={"sslmode": "require"},
            pool_pre_ping=True,
            pool_recycle=300,
        )

    def raw_sql(self, sql: str) -> pd.DataFrame:
        return pd.read_sql_query(sql, self.engine)


_wrds_db: WRDSConnection | None = None

def get_db() -> WRDSConnection:
    global _wrds_db
    if _wrds_db is None:
        uname = os.environ.get("WRDS_USERNAME", "")
        pwd   = os.environ.get("WRDS_PASSWORD", "")
        if not uname or not pwd:
            raise RuntimeError("WRDS_USERNAME and WRDS_PASSWORD env vars are required.")
        _wrds_db = WRDSConnection(uname, pwd)
        logger.info("WRDS connection established.")
    return _wrds_db


# ─── Ticker Aliases (WRDS uses different tickers for some stocks) ─

TICKER_ALIASES = {
    "GOOG":  "GOOGL",
    "BRK-B": "BRK.B",
}
REVERSE_ALIASES = {v: k for k, v in TICKER_ALIASES.items()}

def to_wrds(ticker: str) -> str:
    return TICKER_ALIASES.get(ticker.upper(), ticker.upper())

def from_wrds(ticker: str) -> str:
    return REVERSE_ALIASES.get(ticker.upper(), ticker.upper())


# ─── GICS Sector Map ──────────────────────────────────────────────

GICS_MAP = {
    "10": "Energy", "15": "Materials", "20": "Industrials",
    "25": "Consumer Discretionary", "30": "Consumer Staples",
    "35": "Health Care", "40": "Financials",
    "45": "Information Technology", "50": "Communication Services",
    "55": "Utilities", "60": "Real Estate",
}


# ─── Helpers ──────────────────────────────────────────────────────

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
    f = safe_float(value)
    return int(f) if f is not None else default


# ─── FastAPI App ──────────────────────────────────────────────────

app = FastAPI(
    title="StockBuddy API",
    description="Stock data API powered by WRDS/Compustat",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Quote Endpoint ───────────────────────────────────────────────

@app.get("/api/quote/{ticker}", response_model=QuoteResponse)
async def get_quote(ticker: str):
    """Get stock quote + key fundamentals for a single ticker."""
    ticker = ticker.upper().strip()
    cached = cache.get(f"quote:{ticker}")
    if cached:
        return cached

    wrds_ticker = to_wrds(ticker)
    db = get_db()

    try:
        # ── Latest 2 trading days (for price + change) ────────────
        price_sql = f"""
            SELECT datadate, prccd / NULLIF(ajexdi, 0) AS close,
                   prchd / NULLIF(ajexdi, 0) AS high,
                   prcld / NULLIF(ajexdi, 0) AS low,
                   prcod / NULLIF(ajexdi, 0) AS open,
                   cshtrd AS volume,
                   cshoc  AS shares_out
            FROM comp_na_daily_all.secd
            WHERE tic = '{wrds_ticker}'
            ORDER BY datadate DESC
            LIMIT 2
        """
        price_df = db.raw_sql(price_sql)

        if price_df is None or price_df.empty:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found in WRDS.")

        latest  = price_df.iloc[0]
        prev    = price_df.iloc[1] if len(price_df) > 1 else latest

        price       = safe_float(latest["close"], 0.0)
        prev_close  = safe_float(prev["close"], price)
        change      = round(price - prev_close, 2)
        change_pct  = round((change / prev_close * 100) if prev_close else 0, 2)
        shares_out  = safe_int(latest["shares_out"])
        volume      = safe_int(latest["volume"])

        # ── Company info ──────────────────────────────────────────
        company_sql = f"""
            SELECT conm AS name, gsector AS sector, gind AS industry,
                   loc AS country, busdesc AS description
            FROM comp.company
            WHERE tic = '{wrds_ticker}'
            LIMIT 1
        """
        co_df = db.raw_sql(company_sql)
        name        = co_df["name"].iloc[0]       if not co_df.empty else ticker
        raw_sector  = str(co_df["sector"].iloc[0]) if not co_df.empty else None
        industry    = co_df["industry"].iloc[0]    if not co_df.empty else None
        description = co_df["description"].iloc[0] if not co_df.empty else None
        sector      = GICS_MAP.get(raw_sector.split(".")[0] if raw_sector else "", None)

        # ── Most recent annual fundamentals ───────────────────────
        funda_sql = f"""
            SELECT sale AS revenue, ni AS net_income, dltt AS total_debt,
                   ceq AS equity, oibdp AS op_income, gp AS gross_profit,
                   act AS current_assets, lct AS current_liabilities,
                   oancf AS op_cf, capx, csho AS shares_annual,
                   epspx AS eps, dvpsx_f AS div_yield,
                   mkvalt AS market_cap, at AS total_assets
            FROM comp.funda
            WHERE tic = '{wrds_ticker}'
              AND indfmt = 'INDL' AND datafmt = 'STD'
              AND popsrc = 'D'   AND consol = 'C'
            ORDER BY datadate DESC
            LIMIT 1
        """
        fun_df = db.raw_sql(funda_sql)

        revenue         = None
        net_income      = None
        total_debt      = None
        total_equity    = None
        op_income       = None
        gross_profit    = None
        free_cash_flow  = None
        current_ratio   = None
        market_cap      = None
        eps             = None
        div_yield       = None
        profit_margin   = None
        gross_margin    = None
        op_margin       = None
        roe             = None
        de_ratio        = None

        if not fun_df.empty:
            r = fun_df.iloc[0]
            revenue      = safe_float(r.get("revenue"))
            net_income   = safe_float(r.get("net_income"))
            total_debt   = safe_float(r.get("total_debt"))
            total_equity = safe_float(r.get("equity"))
            op_income    = safe_float(r.get("op_income"))
            gross_profit = safe_float(r.get("gross_profit"))
            op_cf        = safe_float(r.get("op_cf"))
            capx         = safe_float(r.get("capx"))
            cur_assets   = safe_float(r.get("current_assets"))
            cur_liab     = safe_float(r.get("current_liabilities"))
            eps          = safe_float(r.get("eps"))
            div_yield    = safe_float(r.get("div_yield"))
            mkcap        = safe_float(r.get("market_cap"))
            market_cap   = (mkcap * 1_000_000) if mkcap else (
                (price * shares_out) if (price and shares_out) else None
            )

            # Derived ratios
            if op_cf is not None and capx is not None:
                free_cash_flow = (op_cf - abs(capx)) * 1_000_000
            if cur_assets and cur_liab and cur_liab != 0:
                current_ratio = round(cur_assets / cur_liab, 2)
            if revenue and revenue != 0:
                if net_income is not None:
                    profit_margin = round(net_income / revenue, 4)
                if gross_profit is not None:
                    gross_margin  = round(gross_profit / revenue, 4)
                if op_income is not None:
                    op_margin     = round(op_income / revenue, 4)
            if net_income and total_equity and total_equity != 0:
                roe = round(net_income / total_equity, 4)
            if total_debt and total_equity and total_equity != 0:
                de_ratio = round(total_debt / total_equity, 2)

            # Scale to dollars (Compustat stores in $M)
            if revenue:      revenue      *= 1_000_000
            if net_income:   net_income   *= 1_000_000
            if total_debt:   total_debt   *= 1_000_000
            if total_equity: total_equity *= 1_000_000

        # ── Derived valuation ratios ──────────────────────────────
        pe_ratio = round(price / eps, 2) if (price and eps and eps > 0) else None
        pb_ratio = None
        if price and shares_out and total_equity and shares_out > 0:
            book_per_share = (total_equity / shares_out)
            pb_ratio = round(price / book_per_share, 2) if book_per_share > 0 else None
        ps_ratio = None
        if price and shares_out and revenue and shares_out > 0:
            rev_per_share = revenue / shares_out
            ps_ratio = round(price / rev_per_share, 2) if rev_per_share > 0 else None

        # ── 52-week high/low ─────────────────────────────────────
        year_ago = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
        hl_sql = f"""
            SELECT MAX(prchd / NULLIF(ajexdi, 0)) AS week52_high,
                   MIN(prcld / NULLIF(ajexdi, 0)) AS week52_low
            FROM comp_na_daily_all.secd
            WHERE tic = '{wrds_ticker}' AND datadate >= '{year_ago}'
        """
        hl_df = db.raw_sql(hl_sql)
        week52_high = safe_float(hl_df["week52_high"].iloc[0]) if not hl_df.empty else None
        week52_low  = safe_float(hl_df["week52_low"].iloc[0])  if not hl_df.empty else None

        result = QuoteResponse(
            ticker=ticker,
            name=str(name),
            price=price,
            previousClose=prev_close,
            change=change,
            changePercent=change_pct,
            marketCap=market_cap,
            peRatio=pe_ratio,
            forwardPE=None,        # not available in Compustat
            psRatio=ps_ratio,
            pbRatio=pb_ratio,
            beta=None,             # could be computed from secd, skipping for now
            fiftyTwoWeekHigh=week52_high,
            fiftyTwoWeekLow=week52_low,
            volume=volume,
            avgVolume=None,
            dividendYield=div_yield,
            sector=sector,
            industry=str(industry) if industry else None,
            description=str(description) if description else None,
            freeCashFlow=free_cash_flow,
            sharesOutstanding=shares_out,
            totalRevenue=revenue,
            netIncome=net_income,
            totalDebt=total_debt,
            totalEquity=total_equity,
            debtToEquity=de_ratio,
            returnOnEquity=roe,
            profitMargin=profit_margin,
            grossMargin=gross_margin,
            operatingMargin=op_margin,
            revenueGrowth=None,
            earningsGrowth=None,
            currentRatio=current_ratio,
            trailingEps=eps,
            bookValue=(total_equity / shares_out) if (total_equity and shares_out) else None,
        )

        cache.set(f"quote:{ticker}", result, QUOTE_TTL)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quote error for {ticker}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data for '{ticker}': {e}")


# ─── History Endpoint ─────────────────────────────────────────────

RANGE_MAP = {
    "1d":  1,
    "5d":  5,
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y":  365,
    "5y":  1825,
}

@app.get("/api/history/{ticker}", response_model=HistoryResponse)
async def get_history(
    ticker: str,
    range: str = Query("1y", description="Time range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y"),
):
    """Get historical adjusted OHLCV data from Compustat."""
    ticker    = ticker.upper().strip()
    range_key = range.lower()

    if range_key not in RANGE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid range. Use: {list(RANGE_MAP.keys())}")

    cache_key = f"history:{ticker}:{range_key}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    wrds_ticker = to_wrds(ticker)
    days        = RANGE_MAP[range_key]
    start_date  = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    db = get_db()

    try:
        sql = f"""
            SELECT datadate AS date,
                   prcod / NULLIF(ajexdi, 0) AS open,
                   prchd / NULLIF(ajexdi, 0) AS high,
                   prcld / NULLIF(ajexdi, 0) AS low,
                   prccd / NULLIF(ajexdi, 0) AS close,
                   cshtrd AS volume
            FROM comp_na_daily_all.secd
            WHERE tic = '{wrds_ticker}'
              AND datadate >= '{start_date}'
            ORDER BY datadate ASC
        """
        df = db.raw_sql(sql)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No history for '{ticker}'")

        prices = [
            HistoricalPrice(
                date=str(row["date"])[:10],
                open=round(float(row["open"]), 2),
                high=round(float(row["high"]), 2),
                low=round(float(row["low"]), 2),
                close=round(float(row["close"]), 2),
                volume=int(row["volume"]) if row["volume"] else 0,
            )
            for _, row in df.dropna(subset=["close"]).iterrows()
        ]

        result = HistoryResponse(ticker=ticker, prices=prices)
        cache.set(cache_key, result, HISTORY_TTL)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"History error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed history for '{ticker}': {e}")


# ─── Financials Endpoint ──────────────────────────────────────────

@app.get("/api/financials/{ticker}", response_model=FinancialsResponse)
async def get_financials(ticker: str):
    """Get 5 years of annual financial statements from Compustat."""
    ticker = ticker.upper().strip()
    cached = cache.get(f"financials:{ticker}")
    if cached:
        return cached

    wrds_ticker = to_wrds(ticker)
    db = get_db()

    try:
        sql = f"""
            SELECT fyear AS year,
                   sale   AS revenue,
                   ni     AS net_income,
                   oancf  AS op_cash_flow,
                   capx   AS capex,
                   dltt   AS total_debt,
                   ceq    AS equity,
                   oibdp  AS op_income,
                   gp     AS gross_profit,
                   csho   AS shares
            FROM comp.funda
            WHERE tic = '{wrds_ticker}'
              AND indfmt = 'INDL' AND datafmt = 'STD'
              AND popsrc = 'D'   AND consol = 'C'
            ORDER BY fyear DESC
            LIMIT 5
        """
        df = db.raw_sql(sql)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No financials for '{ticker}'")

        # Latest shares outstanding (from secd for accuracy)
        shares_sql = f"""
            SELECT cshoc AS shares_out
            FROM comp_na_daily_all.secd
            WHERE tic = '{wrds_ticker}'
            ORDER BY datadate DESC LIMIT 1
        """
        shares_df  = db.raw_sql(shares_sql)
        shares_out = safe_int(shares_df["shares_out"].iloc[0]) if not shares_df.empty else None

        annuals = []
        for _, row in df.iterrows():
            revenue    = safe_float(row.get("revenue"))
            net_income = safe_float(row.get("net_income"))
            op_cf      = safe_float(row.get("op_cash_flow"))
            capx       = safe_float(row.get("capex"))
            fcf        = ((op_cf - abs(capx)) * 1_000_000) if (op_cf and capx) else None

            annuals.append(FinancialYear(
                year=str(int(row["year"])),
                revenue=(revenue * 1_000_000)      if revenue    else None,
                netIncome=(net_income * 1_000_000) if net_income else None,
                freeCashFlow=fcf,
                totalDebt=(safe_float(row.get("total_debt"), 0) * 1_000_000) or None,
                totalEquity=(safe_float(row.get("equity"), 0) * 1_000_000)   or None,
                operatingIncome=(safe_float(row.get("op_income"), 0) * 1_000_000) or None,
                grossProfit=(safe_float(row.get("gross_profit"), 0) * 1_000_000)  or None,
            ))

        # Reverse so oldest year is first
        annuals.reverse()

        result = FinancialsResponse(ticker=ticker, annuals=annuals, sharesOutstanding=shares_out)
        cache.set(f"financials:{ticker}", result, FINANCIALS_TTL)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Financials error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed financials for '{ticker}': {e}")


# ─── Search Endpoint ──────────────────────────────────────────────

@app.get("/api/search", response_model=SearchResponse)
async def search_stocks(
    q: str = Query(..., min_length=1),
    limit: int = Query(4, ge=1, le=10),
):
    """Search for US stocks by ticker or company name via Compustat names table."""
    query = q.strip()
    cache_key = f"search:{query.upper()}:{limit}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    db = get_db()

    try:
        sql = f"""
            SELECT DISTINCT ON (tic) tic, conm AS name, exchg
            FROM comp_na_daily_all.names
            WHERE (tic ILIKE '{query}%' OR conm ILIKE '%{query}%')
              AND CURRENT_DATE BETWEEN namedt AND nameenddt
              AND exchg IN (11, 12, 14)  -- NYSE=11, AMEX=12, NASDAQ=14
            ORDER BY tic, namedt DESC
            LIMIT {limit}
        """
        df = db.raw_sql(sql)

        results = []
        if df is not None and not df.empty:
            for _, row in df.iterrows():
                exchg_map = {11: "NYSE", 12: "AMEX", 14: "NASDAQ"}
                exchg_code = int(row["exchg"]) if row["exchg"] else 0
                results.append(SearchResult(
                    ticker=from_wrds(str(row["tic"])),
                    name=str(row["name"]),
                    exchange=exchg_map.get(exchg_code, str(exchg_code)),
                    type="EQUITY",
                ))

        result = SearchResponse(query=q, results=results)
        cache.set(cache_key, result, SEARCH_TTL)
        return result

    except Exception as e:
        logger.error(f"Search error for '{q}': {e}")
        return SearchResponse(query=q, results=[])


# ─── Summary Endpoint ─────────────────────────────────────────────

@app.get("/api/summary/{ticker}", response_model=SummaryResponse)
async def get_summary(ticker: str):
    """Combined quote + financials + history in one call."""
    ticker = ticker.upper().strip()
    cached = cache.get(f"summary:{ticker}")
    if cached:
        return cached

    quote      = await get_quote(ticker)
    financials = await get_financials(ticker)
    history    = await get_history(ticker, range="1y")

    result = SummaryResponse(
        quote=quote,
        financials=financials,
        history=history.prices,
    )
    cache.set(f"summary:{ticker}", result, QUOTE_TTL)
    return result


# ─── Market Overview ──────────────────────────────────────────────

@app.get("/api/market-overview", response_model=list[QuoteResponse])
async def get_market_overview():
    """
    Latest data for S&P 500, NASDAQ, and Dow Jones.
    WRDS stores indices under their own tickers in secd.
    """
    cache_key = "market_overview"
    cached = cache.get(cache_key)
    if cached:
        return cached

    indices = [
        ("^GSPC", "S&P 500"),
        ("^IXIC", "NASDAQ"),
        ("^DJI",  "Dow Jones"),
    ]
    db = get_db()
    results = []

    for wrds_sym, display_name in indices:
        try:
            sql = f"""
                SELECT datadate,
                       prccd / NULLIF(ajexdi, 0) AS close
                FROM comp_na_daily_all.secd
                WHERE tic = '{wrds_sym}'
                ORDER BY datadate DESC LIMIT 2
            """
            df = db.raw_sql(sql)
            if df is None or df.empty:
                continue

            price      = safe_float(df.iloc[0]["close"], 0.0)
            prev_close = safe_float(df.iloc[1]["close"], price) if len(df) > 1 else price
            change     = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0

            results.append(QuoteResponse(
                ticker=wrds_sym, name=display_name,
                price=price, previousClose=prev_close,
                change=change, changePercent=change_pct,
                marketCap=None, peRatio=None, forwardPE=None,
                psRatio=None, pbRatio=None, beta=None,
                fiftyTwoWeekHigh=None, fiftyTwoWeekLow=None,
                volume=None, avgVolume=None,
                dividendYield=None, sector=None, industry="Index",
                description=None, freeCashFlow=None,
                sharesOutstanding=None, totalRevenue=None,
                netIncome=None, totalDebt=None, totalEquity=None,
                debtToEquity=None, returnOnEquity=None,
                profitMargin=None, grossMargin=None,
                operatingMargin=None, revenueGrowth=None,
                earningsGrowth=None, currentRatio=None,
                trailingEps=None, bookValue=None,
            ))
        except Exception as e:
            logger.warning(f"Could not fetch index {wrds_sym}: {e}")
            continue

    cache.set(cache_key, results, QUOTE_TTL)
    return results


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check — also tests the WRDS connection."""
    try:
        db = get_db()
        db.raw_sql("SELECT 1")
        return {"status": "ok", "service": "stockbuddy-api", "data_source": "WRDS/Compustat"}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}
