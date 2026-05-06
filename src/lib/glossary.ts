export type GlossaryCategory = 'valuation' | 'fundamentals' | 'market' | 'ratios' | 'general';

export interface GlossaryDefinition {
  id: string;
  term: string;
  definition: string;
  category: GlossaryCategory;
  example?: string;
}

export const GLOSSARY: Record<string, GlossaryDefinition> = {
  // Valuation
  marketCap: {
    id: 'marketCap',
    term: 'Market Capitalization',
    definition: 'The total value of all a company\'s shares of stock. It is calculated by multiplying the current stock price by the total number of outstanding shares.',
    category: 'valuation',
    example: 'If a company has 1 million shares and the stock is $50, the Market Cap is $50 million.'
  },
  peRatio: {
    id: 'peRatio',
    term: 'P/E Ratio (Price-to-Earnings)',
    definition: 'Tells you how much you are paying for $1 of the company\'s profit. A lower P/E might mean the stock is cheap, while a high P/E might mean it is expensive or expected to grow fast.',
    category: 'valuation',
    example: 'A P/E of 20 means investors are willing to pay $20 for every $1 the company earns.'
  },
  forwardPE: {
    id: 'forwardPE',
    term: 'Forward P/E Ratio',
    definition: 'Similar to the regular P/E ratio, but it uses expected future earnings for the next 12 months instead of past earnings.',
    category: 'valuation'
  },
  pbRatio: {
    id: 'pbRatio',
    term: 'P/B Ratio (Price-to-Book)',
    definition: 'Compares the company\'s stock price to its "book value" (what would be left if it sold all assets and paid all debts). A P/B under 1 means it might be undervalued.',
    category: 'valuation'
  },
  psRatio: {
    id: 'psRatio',
    term: 'P/S Ratio (Price-to-Sales)',
    definition: 'Compares a company\'s stock price to its revenues. Useful for valuing companies that aren\'t making a profit yet.',
    category: 'valuation'
  },
  
  // Fundamentals
  freeCashFlow: {
    id: 'freeCashFlow',
    term: 'Free Cash Flow (FCF)',
    definition: 'The cash a company has left over after paying for its operating expenses and capital expenditures (like buying equipment). This is the cash it can use to pay dividends, buy back stock, or pay off debt.',
    category: 'fundamentals',
    example: 'A lemonade stand makes $100, spends $50 on lemons, and $20 on a new stand. The FCF is $30.'
  },
  profitMargin: {
    id: 'profitMargin',
    term: 'Profit Margin',
    definition: 'The percentage of revenue that the company keeps as pure profit. Higher is better.',
    category: 'fundamentals',
    example: 'A 20% profit margin means for every $1 in sales, the company keeps 20 cents as profit.'
  },
  grossMargin: {
    id: 'grossMargin',
    term: 'Gross Margin',
    definition: 'The percentage of revenue left after subtracting the direct costs of making the product (like raw materials).',
    category: 'fundamentals'
  },
  revenueGrowth: {
    id: 'revenueGrowth',
    term: 'Revenue Growth',
    definition: 'How much the company\'s total sales have increased compared to the previous year.',
    category: 'fundamentals'
  },
  earningsGrowth: {
    id: 'earningsGrowth',
    term: 'Earnings Growth',
    definition: 'How much the company\'s profits have increased compared to the previous year.',
    category: 'fundamentals'
  },

  // Ratios
  debtToEquity: {
    id: 'debtToEquity',
    term: 'Debt-to-Equity Ratio',
    definition: 'Measures how much debt a company is using to finance its operations compared to its own money (equity). A high number means higher risk.',
    category: 'ratios',
    example: 'A ratio over 100% means the company has more debt than equity.'
  },
  currentRatio: {
    id: 'currentRatio',
    term: 'Current Ratio',
    definition: 'Measures a company\'s ability to pay off its short-term debts with its short-term assets (like cash and inventory). A ratio above 1 is generally healthy.',
    category: 'ratios'
  },
  roe: {
    id: 'roe',
    term: 'Return on Equity (ROE)',
    definition: 'How efficiently a company uses investors\' money to generate profit. Higher is better.',
    category: 'ratios',
    example: 'An ROE of 15% means the company generates 15 cents of profit for every $1 invested by shareholders.'
  },
  
  // Market
  beta: {
    id: 'beta',
    term: 'Beta',
    definition: 'Measures how volatile a stock is compared to the overall market. A beta of 1 means it moves with the market. >1 means it is more volatile (risky), <1 means less volatile.',
    category: 'market'
  },
  volume: {
    id: 'volume',
    term: 'Volume',
    definition: 'The number of shares traded during the current day. High volume indicates strong interest in the stock.',
    category: 'market'
  },
  avgVolume: {
    id: 'avgVolume',
    term: 'Average Volume',
    definition: 'The average number of shares traded daily over a specific period (usually 3 months).',
    category: 'market'
  },
  fiftyTwoWeekHigh: {
    id: 'fiftyTwoWeekHigh',
    term: '52-Week High',
    definition: 'The highest price the stock has reached in the past year.',
    category: 'market'
  },
  fiftyTwoWeekLow: {
    id: 'fiftyTwoWeekLow',
    term: '52-Week Low',
    definition: 'The lowest price the stock has reached in the past year.',
    category: 'market'
  },

  // DCF Calculator specifics
  sharesOutstanding: {
    id: 'sharesOutstanding',
    term: 'Shares Outstanding',
    definition: 'The total number of shares currently held by all shareholders. We divide the total company value by this number to get the per-share price.',
    category: 'general'
  },
  growthRate: {
    id: 'growthRate',
    term: 'Expected Growth Rate',
    definition: 'Your guess for how fast the company\'s cash flow will grow each year for the next 5 years.',
    category: 'general'
  },
  terminalGrowthRate: {
    id: 'terminalGrowthRate',
    term: 'Terminal Growth Rate',
    definition: 'The conservative growth rate expected forever after the initial 5-year period (usually matching inflation, around 2-3%).',
    category: 'general'
  },
  discountRate: {
    id: 'discountRate',
    term: 'Discount Rate',
    definition: 'The minimum return you expect to earn. We use this to "discount" future cash back to today\'s value, because $1 today is worth more than $1 tomorrow.',
    category: 'general',
    example: 'Think of it like this: would you rather have $100 today or $100 next year? Today, right? The discount rate captures that preference.'
  },

  // ─── Additional Fundamentals ────────────────────────────────
  operatingMargin: {
    id: 'operatingMargin',
    term: 'Operating Margin',
    definition: 'The percentage of revenue left after paying for the costs of running the business day-to-day (salaries, rent, materials), but before taxes and interest. It shows how efficiently the company is managed.',
    category: 'fundamentals',
    example: 'If a restaurant makes $100 in sales and spends $70 to operate, the operating margin is 30%.'
  },
  dividendYield: {
    id: 'dividendYield',
    term: 'Dividend Yield',
    definition: 'The percentage of the stock price that the company pays out to shareholders as dividends each year. Like an annual "thank you" payment for holding the stock.',
    category: 'fundamentals',
    example: 'A $100 stock paying $3/year in dividends has a 3% dividend yield.'
  },
  revenue: {
    id: 'revenue',
    term: 'Revenue',
    definition: 'The total amount of money a company brings in from selling its products or services — before subtracting any costs. Also called "sales" or "top line."',
    category: 'fundamentals',
    example: 'If a bakery sells 100 cakes at $10 each, the revenue is $1,000 — even if the ingredients cost $500.'
  },
  netIncome: {
    id: 'netIncome',
    term: 'Net Income',
    definition: 'The company\'s total profit after ALL expenses are paid — costs, salaries, taxes, interest, everything. This is the "bottom line" — what the company actually keeps.',
    category: 'fundamentals',
    example: 'Revenue of $1,000 minus $800 in total costs = $200 net income.'
  },
  trailingEps: {
    id: 'trailingEps',
    term: 'Earnings Per Share (EPS)',
    definition: 'The company\'s total profit divided by the number of shares. It tells you how much profit "belongs" to each share you own.',
    category: 'fundamentals',
    example: 'If a company earns $1 billion and has 500 million shares, the EPS is $2.00.'
  },
  bookValue: {
    id: 'bookValue',
    term: 'Book Value Per Share',
    definition: 'What each share would be worth if the company sold everything it owns and paid off all its debts. Think of it as the "fire sale" value of the company.',
    category: 'valuation',
    example: 'A company with $10 billion in assets, $4 billion in debt, and 1 billion shares has a book value of $6 per share.'
  },

  // ─── DCF Result Labels ──────────────────────────────────────
  currentPrice: {
    id: 'currentPrice',
    term: 'Current Price',
    definition: 'The price one share of the stock is trading at right now on the stock market. This changes every second during market hours.',
    category: 'market'
  },
  dcfFairValue: {
    id: 'dcfFairValue',
    term: 'DCF Fair Value',
    definition: 'The price we calculate the stock SHOULD be worth based on how much cash the company will generate in the future. If this is higher than the current price, the stock might be a bargain!',
    category: 'valuation',
    example: 'If DCF Fair Value is $150 and the stock trades at $120, there may be a 25% upside opportunity.'
  },
  dcfDifference: {
    id: 'dcfDifference',
    term: 'Difference (%)',
    definition: 'How far apart the current stock price is from our calculated fair value. A positive number means the stock looks cheap, a negative number means it looks expensive.',
    category: 'valuation'
  },

  // ─── DCF Scenario Labels ────────────────────────────────────
  dcfMethod: {
    id: 'dcfMethod',
    term: 'DCF Method',
    definition: 'Values a company by estimating all the cash it will generate in the future, then converting those future dollars into today\'s dollars. The gold standard of stock valuation.',
    category: 'valuation',
    example: 'Like calculating how much a money tree is worth by adding up all the fruit it will grow.'
  },
  peMethod: {
    id: 'peMethod',
    term: 'P/E Method',
    definition: 'Values a stock by comparing its Price-to-Earnings ratio with similar companies. If similar companies trade at 20x earnings, we apply that multiple to this company.',
    category: 'valuation',
    example: 'Like pricing a house by comparing it to similar houses in the neighborhood.'
  },
  bookValueMethod: {
    id: 'bookValueMethod',
    term: 'Book Value Method',
    definition: 'Values a company based on what it owns (assets) minus what it owes (debts). Useful for banks and asset-heavy companies, but misses intangible value like brands.',
    category: 'valuation',
    example: 'Like selling everything the company owns and paying off all debts — what\'s left?'
  }
};

export function getGlossaryDefinition(id: string): GlossaryDefinition | null {
  return GLOSSARY[id] || null;
}
