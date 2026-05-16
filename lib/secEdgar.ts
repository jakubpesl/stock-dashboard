const EDGAR_HEADERS = {
  'User-Agent': 'StockIntelligenceDashboard/1.0 (jkoudy@seznam.cz)',
  'Accept': 'application/json',
}

export interface SecFinancials {
  revenue: { year: number; value: number }[]
  netIncome: { year: number; value: number }[]
  operatingCF: { year: number; value: number }[]
  freeCashFlow: { year: number; value: number }[]
  totalDebt: number | null
  revenueGrowthYoY: number | null
  netMarginLatest: number | null
}

type USDFact = { end: string; val: number; form: string; fp?: string; fy?: number }

const _cikMap: Record<string, string> = {}

async function resolveCIK(ticker: string): Promise<string | null> {
  const t = ticker.toUpperCase()
  if (_cikMap[t]) return _cikMap[t]
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: EDGAR_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const raw = await res.json() as Record<string, { cik_str: number; ticker: string }>
    for (const v of Object.values(raw)) {
      _cikMap[v.ticker.toUpperCase()] = String(v.cik_str).padStart(10, '0')
    }
    return _cikMap[t] ?? null
  } catch { return null }
}

async function fetchConcept(cik: string, concept: string): Promise<USDFact[]> {
  try {
    const res = await fetch(
      `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`,
      { headers: EDGAR_HEADERS, next: { revalidate: 86400 } }
    )
    if (!res.ok) return []
    const data = await res.json() as { units?: { USD?: USDFact[] } }
    return data.units?.USD ?? []
  } catch { return [] }
}

function toAnnual(items: USDFact[], count = 3): { year: number; value: number }[] {
  const seen = new Set<number>()
  return items
    .filter(i => (i.form === '10-K' || i.form === '20-F') && i.fp === 'FY')
    .sort((a, b) => b.end.localeCompare(a.end))
    .filter(i => {
      const y = i.fy ?? new Date(i.end).getFullYear()
      if (seen.has(y)) return false
      seen.add(y)
      return true
    })
    .slice(0, count)
    .map(i => ({ year: i.fy ?? new Date(i.end).getFullYear(), value: i.val }))
    .reverse()
}

export async function fetchSecFinancials(ticker: string): Promise<SecFinancials | null> {
  try {
    const cik = await resolveCIK(ticker)
    if (!cik) return null

    const [rev1, rev2, rev3, niItems, ocfItems, capexItems, debtItems] = await Promise.all([
      fetchConcept(cik, 'Revenues'),
      fetchConcept(cik, 'RevenueFromContractWithCustomerExcludingAssessedTax'),
      fetchConcept(cik, 'SalesRevenueNet'),
      fetchConcept(cik, 'NetIncomeLoss'),
      fetchConcept(cik, 'NetCashProvidedByUsedInOperatingActivities'),
      fetchConcept(cik, 'PaymentsToAcquirePropertyPlantAndEquipment'),
      fetchConcept(cik, 'LongTermDebt'),
    ])

    const revItems = rev1.length ? rev1 : rev2.length ? rev2 : rev3
    const revenue = toAnnual(revItems)
    const netIncome = toAnnual(niItems)
    const operatingCF = toAnnual(ocfItems)
    const capex = toAnnual(capexItems)

    const freeCashFlow = operatingCF.map(ocf => {
      const cx = capex.find(c => c.year === ocf.year)
      return { year: ocf.year, value: ocf.value - (cx?.value ?? 0) }
    })

    const totalDebt = toAnnual(debtItems, 1)[0]?.value ?? null

    let revenueGrowthYoY: number | null = null
    if (revenue.length >= 2) {
      const latest = revenue[revenue.length - 1].value
      const prior = revenue[revenue.length - 2].value
      revenueGrowthYoY = prior > 0 ? parseFloat(((latest - prior) / prior * 100).toFixed(1)) : null
    }

    let netMarginLatest: number | null = null
    if (netIncome.length > 0 && revenue.length > 0) {
      const latestNI = netIncome[netIncome.length - 1]
      const latestRev = revenue.find(r => r.year === latestNI.year) ?? revenue[revenue.length - 1]
      if (latestRev.value > 0) {
        netMarginLatest = parseFloat((latestNI.value / latestRev.value * 100).toFixed(1))
      }
    }

    if (revenue.length === 0 && netIncome.length === 0) return null
    return { revenue, netIncome, operatingCF, freeCashFlow, totalDebt, revenueGrowthYoY, netMarginLatest }
  } catch { return null }
}

export function fmtBig(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(1)}M`
  return `${sign}$${abs.toLocaleString()}`
}
