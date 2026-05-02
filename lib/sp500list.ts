export interface SP500Stock {
  symbol: string
  name: string
  sector: string
}

export const SP500_LIST: SP500Stock[] = [
  // Technology
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology' },
  { symbol: 'META', name: 'Meta', sector: 'Technology' },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'Technology' },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology' },
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology' },
  // Consumer / E-commerce
  { symbol: 'AMZN', name: 'Amazon', sector: 'Consumer' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'Consumer' },
  { symbol: 'WMT', name: 'Walmart', sector: 'Consumer' },
  { symbol: 'COST', name: 'Costco', sector: 'Consumer' },
  { symbol: 'MCD', name: 'McDonald\'s', sector: 'Consumer' },
  { symbol: 'NKE', name: 'Nike', sector: 'Consumer' },
  // Finance
  { symbol: 'JPM', name: 'JPMorgan', sector: 'Finance' },
  { symbol: 'V', name: 'Visa', sector: 'Finance' },
  { symbol: 'MA', name: 'Mastercard', sector: 'Finance' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare' },
  // Industrial / Energy
  { symbol: 'XOM', name: 'ExxonMobil', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron', sector: 'Energy' },
  { symbol: 'CAT', name: 'Caterpillar', sector: 'Industrial' },
  { symbol: 'HON', name: 'Honeywell', sector: 'Industrial' },
  // Defensive
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Defensive' },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'Defensive' },
]
