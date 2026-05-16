"""StockBuddy API — WRDS/Compustat primary, yfinance fallback (mirrors mini-aladdin)."""
import math, logging, os, datetime, urllib.parse, requests
import asyncio
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import sqlalchemy as sa
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models import (QuoteResponse, HistoricalPrice, HistoryResponse,
                    FinancialYear, FinancialsResponse, SearchResult,
                    SearchResponse, SummaryResponse)
from cache import cache, QUOTE_TTL, FINANCIALS_TTL, HISTORY_TTL, SEARCH_TTL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stockbuddy")

# ── WRDS connection (exact same pattern as mini-aladdin) ──────────────────────
class NativeWRDSConnection:
    def __init__(self, username, password):
        pwd = urllib.parse.quote(password)
        uri = f"postgresql://{username}:{pwd}@wrds-pgdata.wharton.upenn.edu:9737/wrds"
        self.engine = sa.create_engine(uri, isolation_level="AUTOCOMMIT",
                                       connect_args={"sslmode": "require"})
    def raw_sql(self, sql):
        return pd.read_sql_query(sql, self.engine)

WRDS_DB = None
def get_wrds_connection():
    global WRDS_DB
    if WRDS_DB is None:
        try:
            u = os.environ.get("WRDS_USERNAME")
            p = os.environ.get("WRDS_PASSWORD")
            if u and p:
                WRDS_DB = NativeWRDSConnection(u, p)
                logger.info("WRDS connected.")
        except Exception as e:
            logger.error(f"WRDS connection error: {e}")
    return WRDS_DB

# Ticker aliases for WRDS
ALIASES = {"GOOG": "GOOGL", "BRK-B": "BRK.B"}
REV_ALIASES = {v: k for k, v in ALIASES.items()}

GICS = {"10":"Energy","15":"Materials","20":"Industrials","25":"Consumer Discretionary",
        "30":"Consumer Staples","35":"Health Care","40":"Financials",
        "45":"Information Technology","50":"Communication Services","55":"Utilities","60":"Real Estate"}

def sf(v, d=None):
    if v is None: return d
    try:
        f = float(v)
        return d if (math.isnan(f) or math.isinf(f)) else f
    except: return d

def si(v, d=None):
    f = sf(v)
    return int(f) if f is not None else d

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="StockBuddy API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

_executor = ThreadPoolExecutor(max_workers=8)

async def run_sql(db, sql):
    """Run a blocking SQL query in a thread so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, db.raw_sql, sql)

# ── Quote ─────────────────────────────────────────────────────────────────────
@app.get("/api/quote/{ticker}", response_model=QuoteResponse)
async def get_quote(ticker: str):
    ticker = ticker.upper().strip()
    if c := cache.get(f"quote:{ticker}"): return c

    wrds_t = ALIASES.get(ticker, ticker)
    db = get_wrds_connection()

    # Try WRDS first — run all 3 queries in parallel
    if db:
        try:
            yr = (datetime.date.today()-datetime.timedelta(days=365)).isoformat()

            # Query 1: latest 2 prices + 52-week hi/lo in one CTE
            price_sql = f"""
                WITH ranked AS (
                    SELECT datadate, prccd/NULLIF(ajexdi,0) AS close,
                           prchd/NULLIF(ajexdi,0) AS high, prcld/NULLIF(ajexdi,0) AS low,
                           prcod/NULLIF(ajexdi,0) AS open, cshtrd AS volume, cshoc AS shares,
                           ROW_NUMBER() OVER (ORDER BY datadate DESC) AS rn
                    FROM comp_na_daily_all.secd WHERE tic='{wrds_t}'
                ),
                yearly AS (
                    SELECT MAX(prchd/NULLIF(ajexdi,0)) AS wk52hi,
                           MIN(prcld/NULLIF(ajexdi,0)) AS wk52lo
                    FROM comp_na_daily_all.secd WHERE tic='{wrds_t}' AND datadate>='{yr}'
                )
                SELECT r.*, y.wk52hi, y.wk52lo
                FROM ranked r, yearly y WHERE r.rn <= 2
            """

            # Query 2: company info
            company_sql = f"""
                SELECT c.conm AS name, c.gsector AS sector, c.busdesc AS description
                FROM comp_na_daily_all.company c
                JOIN comp_na_daily_all.names n ON c.gvkey=n.gvkey
                WHERE n.tic='{wrds_t}' AND CURRENT_DATE BETWEEN n.namedt AND n.nameenddt
                LIMIT 1"""

            # Query 3: latest annual fundamentals
            funda_sql = f"""
                SELECT sale AS rev, ni, dltt AS debt, ceq AS equity,
                       oibdp AS oi, gp, act, lct, oancf, capx,
                       epspx AS eps, dvpsx_f AS dy, mkvalt AS mkcap
                FROM comp_na_daily_all.funda
                WHERE tic='{wrds_t}' AND indfmt='INDL' AND datafmt='STD'
                  AND popsrc='D' AND consol='C'
                ORDER BY datadate DESC LIMIT 1"""

            # Run all 3 in parallel
            pdf, cdf, fdf = await asyncio.gather(
                run_sql(db, price_sql),
                run_sql(db, company_sql),
                run_sql(db, funda_sql),
            )

            if pdf is not None and not pdf.empty:
                today_row = pdf[pdf["rn"]==1].iloc[0]
                prev_row  = pdf[pdf["rn"]==2]
                price  = sf(today_row["close"], 0.0)
                prev   = sf(prev_row.iloc[0]["close"] if not prev_row.empty else today_row["close"], price)
                chg    = round(price - prev, 2)
                chgp   = round(chg/prev*100 if prev else 0, 2)
                shares = si(today_row["shares"])
                wkhi   = sf(today_row["wk52hi"])
                wklo   = sf(today_row["wk52lo"])

                name   = str(cdf["name"].iloc[0])   if not cdf.empty else ticker
                gsec   = str(cdf["sector"].iloc[0])  if not cdf.empty else None
                sector = GICS.get(str(gsec).split(".")[0] if gsec else "", None)
                desc   = str(cdf["description"].iloc[0]) if not cdf.empty else None

                rev=ni=debt=eq=oi=gp=fcf=cr=mkcap=eps=dy=pm=gm=om=roe=de=None
                if not fdf.empty:
                    fr   = fdf.iloc[0]
                    rev  = sf(fr.get("rev"))
                    ni   = sf(fr.get("ni"))
                    debt = sf(fr.get("debt"))
                    eq   = sf(fr.get("equity"))
                    oi   = sf(fr.get("oi"))
                    gp   = sf(fr.get("gp"))
                    ocf  = sf(fr.get("oancf"))
                    capx = sf(fr.get("capx"))
                    eps  = sf(fr.get("eps"))
                    dy   = sf(fr.get("dy"))
                    mkcap= sf(fr.get("mkcap"))
                    act  = sf(fr.get("act"))
                    lct  = sf(fr.get("lct"))
                    if ocf and capx: fcf = (ocf - abs(capx)) * 1e6
                    if act and lct and lct!=0: cr = round(act/lct,2)
                    if rev and rev!=0:
                        if ni:  pm = round(ni/rev,4)
                        if gp:  gm = round(gp/rev,4)
                        if oi:  om = round(oi/rev,4)
                    if ni and eq and eq!=0: roe = round(ni/eq,4)
                    if debt and eq and eq!=0: de = round(debt/eq,2)
                    mkcap = (mkcap*1e6) if mkcap else (price*shares if price and shares else None)
                    rev  = rev*1e6  if rev  else None
                    ni   = ni*1e6   if ni   else None
                    debt = debt*1e6 if debt else None
                    eq   = eq*1e6   if eq   else None

                pe = round(price/eps,2) if price and eps and eps>0 else None
                pb = round(price/(eq/shares),2) if (price and eq and shares and shares>0 and eq/shares>0) else None
                ps = round(price/(rev/shares),2) if (price and rev and shares and shares>0) else None

                result = QuoteResponse(
                    ticker=ticker, name=name, price=price, previousClose=prev,
                    change=chg, changePercent=chgp, marketCap=mkcap,
                    peRatio=pe, forwardPE=None, psRatio=ps, pbRatio=pb, beta=None,
                    fiftyTwoWeekHigh=wkhi, fiftyTwoWeekLow=wklo,
                    volume=si(today_row["volume"]), avgVolume=None, dividendYield=dy,
                    sector=sector, industry=None, description=desc,
                    freeCashFlow=fcf, sharesOutstanding=shares,
                    totalRevenue=rev, netIncome=ni, totalDebt=debt, totalEquity=eq,
                    debtToEquity=de, returnOnEquity=roe, profitMargin=pm,
                    grossMargin=gm, operatingMargin=om, revenueGrowth=None,
                    earningsGrowth=None, currentRatio=cr, trailingEps=eps,
                    bookValue=(eq/shares if eq and shares else None))
                cache.set(f"quote:{ticker}", result, QUOTE_TTL)
                return result
        except Exception as e:
            logger.warning(f"WRDS quote failed for {ticker}, falling back to yfinance: {e}")

    # yfinance fallback
    try:
        info = yf.Ticker(ticker).info
        if not info or not info.get("regularMarketPrice"):
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")
        price = sf(info.get("regularMarketPrice") or info.get("currentPrice"), 0)
        prev  = sf(info.get("regularMarketPreviousClose") or info.get("previousClose"), price)
        chg   = round(price-prev,2)
        chgp  = round(chg/prev*100 if prev else 0,2)
        result = QuoteResponse(
            ticker=ticker, name=info.get("shortName") or ticker,
            price=price, previousClose=prev, change=chg, changePercent=chgp,
            marketCap=sf(info.get("marketCap")), peRatio=sf(info.get("trailingPE")),
            forwardPE=sf(info.get("forwardPE")), psRatio=sf(info.get("priceToSalesTrailing12Months")),
            pbRatio=sf(info.get("priceToBook")), beta=sf(info.get("beta")),
            fiftyTwoWeekHigh=sf(info.get("fiftyTwoWeekHigh")),
            fiftyTwoWeekLow=sf(info.get("fiftyTwoWeekLow")),
            volume=si(info.get("volume")), avgVolume=si(info.get("averageVolume")),
            dividendYield=sf(info.get("dividendYield")), sector=info.get("sector"),
            industry=info.get("industry"), description=info.get("longBusinessSummary"),
            freeCashFlow=sf(info.get("freeCashflow")),
            sharesOutstanding=si(info.get("sharesOutstanding")),
            totalRevenue=sf(info.get("totalRevenue")),
            netIncome=sf(info.get("netIncomeToCommon")),
            totalDebt=sf(info.get("totalDebt")),
            totalEquity=sf(info.get("totalStockholderEquity")),
            debtToEquity=sf(info.get("debtToEquity")),
            returnOnEquity=sf(info.get("returnOnEquity")),
            profitMargin=sf(info.get("profitMargins")),
            grossMargin=sf(info.get("grossMargins")),
            operatingMargin=sf(info.get("operatingMargins")),
            revenueGrowth=sf(info.get("revenueGrowth")),
            earningsGrowth=sf(info.get("earningsGrowth")),
            currentRatio=sf(info.get("currentRatio")),
            trailingEps=sf(info.get("trailingEps")), bookValue=sf(info.get("bookValue")))
        cache.set(f"quote:{ticker}", result, QUOTE_TTL)
        return result
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch '{ticker}': {e}")

# ── History ───────────────────────────────────────────────────────────────────
RANGE_MAP = {"1d":(1,"5m"),"5d":(5,"15m"),"1mo":(30,"1h"),"3mo":(90,"1d"),
             "6mo":(180,"1d"),"1y":(365,"1d"),"5y":(1825,"1d")}
YF_RANGE  = {"1d":"1d","5d":"5d","1mo":"1mo","3mo":"3mo","6mo":"6mo","1y":"1y","5y":"5y"}
YF_INT    = {"1d":"5m","5d":"15m","1mo":"1h","3mo":"1d","6mo":"1d","1y":"1d","5y":"1wk"}

@app.get("/api/history/{ticker}", response_model=HistoryResponse)
async def get_history(ticker: str, range: str = Query("1y")):
    ticker = ticker.upper().strip()
    rk = range.lower()
    if rk not in RANGE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid range. Use: {list(RANGE_MAP)}")
    ck = f"history:{ticker}:{rk}"
    if c := cache.get(ck): return c

    wrds_t = ALIASES.get(ticker, ticker)
    db = get_wrds_connection()

    if db and rk not in ("1d","5d","1mo"):  # WRDS only has daily data
        try:
            days, _ = RANGE_MAP[rk]
            start = (datetime.date.today()-datetime.timedelta(days=days)).isoformat()
            df = db.raw_sql(f"""
                SELECT datadate AS date, prcod/NULLIF(ajexdi,0) AS open,
                       prchd/NULLIF(ajexdi,0) AS high, prcld/NULLIF(ajexdi,0) AS low,
                       prccd/NULLIF(ajexdi,0) AS close, cshtrd AS volume
                FROM comp_na_daily_all.secd
                WHERE tic='{wrds_t}' AND datadate>='{start}'
                ORDER BY datadate ASC""")
            if df is not None and not df.empty:
                prices = [HistoricalPrice(
                    date=str(row["date"])[:10],
                    open=round(float(row["open"]),2), high=round(float(row["high"]),2),
                    low=round(float(row["low"]),2),   close=round(float(row["close"]),2),
                    volume=int(row["volume"]) if row["volume"] else 0)
                    for _,row in df.dropna(subset=["close"]).iterrows()]
                result = HistoryResponse(ticker=ticker, prices=prices)
                cache.set(ck, result, HISTORY_TTL)
                return result
        except Exception as e:
            logger.warning(f"WRDS history failed for {ticker}: {e}")

    # yfinance fallback
    try:
        hist = yf.Ticker(ticker).history(period=YF_RANGE[rk], interval=YF_INT[rk])
        if hist.empty: raise HTTPException(status_code=404, detail=f"No history for '{ticker}'")
        prices = []
        for date, row in hist.iterrows():
            fmt = "%Y-%m-%d %H:%M" if YF_INT[rk] in ("5m","15m","1h") else "%Y-%m-%d"
            prices.append(HistoricalPrice(date=date.strftime(fmt),
                open=round(float(row["Open"]),2), high=round(float(row["High"]),2),
                low=round(float(row["Low"]),2),   close=round(float(row["Close"]),2),
                volume=int(row["Volume"])))
        result = HistoryResponse(ticker=ticker, prices=prices)
        cache.set(ck, result, HISTORY_TTL)
        return result
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History failed for '{ticker}': {e}")

# ── Financials ────────────────────────────────────────────────────────────────
@app.get("/api/financials/{ticker}", response_model=FinancialsResponse)
async def get_financials(ticker: str):
    ticker = ticker.upper().strip()
    if c := cache.get(f"financials:{ticker}"): return c

    wrds_t = ALIASES.get(ticker, ticker)
    db = get_wrds_connection()

    if db:
        try:
            df = db.raw_sql(f"""
                SELECT fyear AS year, sale AS rev, ni, dltt AS debt,
                       ceq AS equity, oibdp AS oi, gp, oancf, capx, csho
                FROM comp_na_daily_all.funda
                WHERE tic='{wrds_t}' AND indfmt='INDL' AND datafmt='STD'
                  AND popsrc='D' AND consol='C'
                ORDER BY fyear DESC LIMIT 5""")
            sdf = db.raw_sql(f"""
                SELECT cshoc AS shares FROM comp_na_daily_all.secd
                WHERE tic='{wrds_t}' ORDER BY datadate DESC LIMIT 1""")
            shares = si(sdf["shares"].iloc[0]) if not sdf.empty else None

            if df is not None and not df.empty:
                annuals = []
                for _, row in df.iterrows():
                    ocf  = sf(row.get("oancf"))
                    capx = sf(row.get("capx"))
                    fcf  = ((ocf-abs(capx))*1e6) if (ocf and capx) else None
                    annuals.append(FinancialYear(
                        year=str(int(row["year"])),
                        revenue=(sf(row.get("rev"),0)*1e6) or None,
                        netIncome=(sf(row.get("ni"),0)*1e6) or None,
                        freeCashFlow=fcf,
                        totalDebt=(sf(row.get("debt"),0)*1e6) or None,
                        totalEquity=(sf(row.get("equity"),0)*1e6) or None,
                        operatingIncome=(sf(row.get("oi"),0)*1e6) or None,
                        grossProfit=(sf(row.get("gp"),0)*1e6) or None))
                annuals.reverse()
                result = FinancialsResponse(ticker=ticker, annuals=annuals, sharesOutstanding=shares)
                cache.set(f"financials:{ticker}", result, FINANCIALS_TTL)
                return result
        except Exception as e:
            logger.warning(f"WRDS financials failed for {ticker}: {e}")

    # yfinance fallback
    try:
        stock = yf.Ticker(ticker)
        info  = stock.info
        inc   = stock.income_stmt
        bal   = stock.balance_sheet
        cf    = stock.cashflow
        annuals = []
        if inc is not None and not inc.empty:
            for col in inc.columns[:5]:
                rev = sf(inc.loc["Total Revenue",col])     if "Total Revenue"    in inc.index else None
                ni  = sf(inc.loc["Net Income",col])        if "Net Income"       in inc.index else None
                oi  = sf(inc.loc["Operating Income",col])  if "Operating Income" in inc.index else None
                gp  = sf(inc.loc["Gross Profit",col])      if "Gross Profit"     in inc.index else None
                debt= sf(bal.loc["Total Debt",col])        if (bal is not None and not bal.empty and "Total Debt" in bal.index and col in bal.columns) else None
                eq  = sf(bal.loc["Stockholders Equity",col]) if (bal is not None and not bal.empty and "Stockholders Equity" in bal.index and col in bal.columns) else None
                ocf = sf(cf.loc["Operating Cash Flow",col])  if (cf is not None and not cf.empty and "Operating Cash Flow" in cf.index and col in cf.columns) else None
                capx= sf(cf.loc["Capital Expenditure",col])  if (cf is not None and not cf.empty and "Capital Expenditure" in cf.index and col in cf.columns) else None
                fcf = (ocf+capx) if (ocf and capx) else None
                annuals.append(FinancialYear(year=col.strftime("%Y"),revenue=rev,netIncome=ni,
                    freeCashFlow=fcf,totalDebt=debt,totalEquity=eq,operatingIncome=oi,grossProfit=gp))
        annuals.reverse()
        result = FinancialsResponse(ticker=ticker, annuals=annuals, sharesOutstanding=si(info.get("sharesOutstanding")))
        cache.set(f"financials:{ticker}", result, FINANCIALS_TTL)
        return result
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Financials failed for '{ticker}': {e}")

# ── Search ────────────────────────────────────────────────────────────────────
@app.get("/api/search", response_model=SearchResponse)
async def search_stocks(q: str = Query(..., min_length=1), limit: int = Query(4)):
    query = q.strip()
    ck = f"search:{query.upper()}:{limit}"
    if c := cache.get(ck): return c

    db = get_wrds_connection()
    if db:
        try:
            df = db.raw_sql(f"""
                SELECT DISTINCT ON (tic) tic, conm AS name, exchg
                FROM comp_na_daily_all.names
                WHERE (tic ILIKE '{query}%' OR conm ILIKE '%{query}%')
                  AND CURRENT_DATE BETWEEN namedt AND nameenddt
                  AND exchg IN (11,12,14)
                ORDER BY tic, namedt DESC LIMIT {limit}""")
            if df is not None and not df.empty:
                exchg_map={11:"NYSE",12:"AMEX",14:"NASDAQ"}
                results=[SearchResult(ticker=REV_ALIASES.get(str(r["tic"]),str(r["tic"])),
                    name=str(r["name"]), exchange=exchg_map.get(int(r["exchg"]) if r["exchg"] else 0,""),
                    type="EQUITY") for _,r in df.iterrows()]
                result = SearchResponse(query=q, results=results)
                cache.set(ck, result, SEARCH_TTL)
                return result
        except Exception as e:
            logger.warning(f"WRDS search failed: {e}")

    # Yahoo autocomplete fallback
    try:
        resp = requests.get(f"https://query2.finance.yahoo.com/v1/finance/search?q={query}",
                            headers={"User-Agent":"Mozilla/5.0"}, timeout=5)
        quotes = resp.json().get("quotes",[])
        us = {"NMS","NYQ","NGM","NCM","PCX","ASE"}
        results=[SearchResult(ticker=i["symbol"],name=i.get("shortname") or i.get("symbol",""),
                 exchange=i.get("exchange",""),type="EQUITY")
                 for i in quotes if i.get("quoteType")=="EQUITY" and i.get("exchange","") in us][:limit]
        result = SearchResponse(query=q, results=results)
        cache.set(ck, result, SEARCH_TTL)
        return result
    except Exception as e:
        logger.error(f"Search error: {e}")
        return SearchResponse(query=q, results=[])

# ── Summary ───────────────────────────────────────────────────────────────────
@app.get("/api/summary/{ticker}", response_model=SummaryResponse)
async def get_summary(ticker: str):
    ticker = ticker.upper().strip()
    if c := cache.get(f"summary:{ticker}"): return c
    quote = await get_quote(ticker)
    fin   = await get_financials(ticker)
    hist  = await get_history(ticker, range="1y")
    result = SummaryResponse(quote=quote, financials=fin, history=hist.prices)
    cache.set(f"summary:{ticker}", result, QUOTE_TTL)
    return result

# ── Market Overview ───────────────────────────────────────────────────────────
@app.get("/api/market-overview", response_model=list[QuoteResponse])
async def get_market_overview():
    if c := cache.get("market_overview"): return c
    indices = {"^GSPC":"S&P 500","^IXIC":"NASDAQ","^DJI":"Dow Jones"}
    results = []
    for sym, name in indices.items():
        try:
            info  = yf.Ticker(sym).info
            price = sf(info.get("regularMarketPrice") or info.get("previousClose"), 0)
            prev  = sf(info.get("regularMarketPreviousClose") or info.get("previousClose"), price)
            chg   = price-prev
            chgp  = chg/prev*100 if prev else 0
            results.append(QuoteResponse(ticker=sym,name=name,price=price,previousClose=prev,
                change=chg,changePercent=chgp,marketCap=None,peRatio=None,forwardPE=None,
                psRatio=None,pbRatio=None,beta=None,
                fiftyTwoWeekHigh=sf(info.get("fiftyTwoWeekHigh")),
                fiftyTwoWeekLow=sf(info.get("fiftyTwoWeekLow")),
                volume=si(info.get("regularMarketVolume")),avgVolume=None,
                dividendYield=None,sector=None,industry="Index",description=None,
                freeCashFlow=None,sharesOutstanding=None,totalRevenue=None,
                netIncome=None,totalDebt=None,totalEquity=None,debtToEquity=None,
                returnOnEquity=None,profitMargin=None,grossMargin=None,
                operatingMargin=None,revenueGrowth=None,earningsGrowth=None,
                currentRatio=None,trailingEps=None,bookValue=None))
        except Exception as e:
            logger.warning(f"Market overview failed for {sym}: {e}")
    cache.set("market_overview", results, QUOTE_TTL)
    return results

# ── Batch Quotes (1 SQL query for N tickers) ─────────────────────────────────
@app.get("/api/quotes/batch", response_model=list[QuoteResponse])
async def batch_quotes(tickers: str = Query(..., description="Comma-separated tickers")):
    """Fetch lightweight quotes for multiple tickers in a single WRDS query."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return []

    # Check cache first — return any we already have, query only the missing ones
    results = {}
    missing = []
    for t in ticker_list:
        cached = cache.get(f"quote_light:{t}")
        if cached:
            results[t] = cached
        else:
            missing.append(t)

    if not missing:
        return [results[t] for t in ticker_list if t in results]

    db = get_wrds_connection()
    if db:
        try:
            # Map tickers for WRDS
            wrds_map = {ALIASES.get(t, t): t for t in missing}
            wrds_tickers = list(wrds_map.keys())

            if len(wrds_tickers) == 1:
                tickers_sql = f"('{wrds_tickers[0]}')"
            else:
                tickers_sql = str(tuple(wrds_tickers))

            # Single query: latest price + previous close + company name
            sql = f"""
                WITH latest AS (
                    SELECT tic, datadate,
                           prccd/NULLIF(ajexdi,0) AS close,
                           cshtrd AS volume, cshoc AS shares,
                           ROW_NUMBER() OVER (PARTITION BY tic ORDER BY datadate DESC) AS rn
                    FROM comp_na_daily_all.secd
                    WHERE tic IN {tickers_sql}
                ),
                company AS (
                    SELECT DISTINCT ON (n.tic) n.tic, c.conm AS name
                    FROM comp_na_daily_all.company c
                    JOIN comp_na_daily_all.names n ON c.gvkey = n.gvkey
                    WHERE n.tic IN {tickers_sql}
                      AND CURRENT_DATE BETWEEN n.namedt AND n.nameenddt
                    ORDER BY n.tic, n.namedt DESC
                )
                SELECT l.tic, l.close, l.volume, l.shares, l.rn,
                       co.name
                FROM latest l
                LEFT JOIN company co ON l.tic = co.tic
                WHERE l.rn <= 2
                ORDER BY l.tic, l.rn
            """
            df = await run_sql(db, sql)

            if df is not None and not df.empty:
                for wrds_t in wrds_tickers:
                    orig_t = wrds_map[wrds_t]
                    rows = df[df["tic"] == wrds_t]
                    if rows.empty:
                        continue
                    today = rows[rows["rn"] == 1]
                    prev  = rows[rows["rn"] == 2]
                    if today.empty:
                        continue
                    tr = today.iloc[0]
                    price = sf(tr["close"], 0.0)
                    prev_close = sf(prev.iloc[0]["close"] if not prev.empty else tr["close"], price)
                    chg = round(price - prev_close, 2)
                    chgp = round(chg / prev_close * 100 if prev_close else 0, 2)
                    name = str(tr["name"]) if tr.get("name") else orig_t

                    q = QuoteResponse(
                        ticker=orig_t, name=name, price=price,
                        previousClose=prev_close, change=chg, changePercent=chgp,
                        marketCap=None, peRatio=None, forwardPE=None,
                        psRatio=None, pbRatio=None, beta=None,
                        fiftyTwoWeekHigh=None, fiftyTwoWeekLow=None,
                        volume=si(tr["volume"]), avgVolume=None,
                        dividendYield=None, sector=None, industry=None,
                        description=None, freeCashFlow=None,
                        sharesOutstanding=si(tr["shares"]),
                        totalRevenue=None, netIncome=None,
                        totalDebt=None, totalEquity=None, debtToEquity=None,
                        returnOnEquity=None, profitMargin=None, grossMargin=None,
                        operatingMargin=None, revenueGrowth=None, earningsGrowth=None,
                        currentRatio=None, trailingEps=None, bookValue=None,
                    )
                    results[orig_t] = q
                    cache.set(f"quote_light:{orig_t}", q, QUOTE_TTL)
        except Exception as e:
            logger.warning(f"Batch quotes WRDS error: {e}")

    return [results[t] for t in ticker_list if t in results]

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    db = get_wrds_connection()
    try:
        if db: db.raw_sql("SELECT 1")
        source = "WRDS/Compustat" if db else "yfinance-only"
        return {"status":"ok","data_source":source}
    except Exception as e:
        return {"status":"degraded","error":str(e)}
