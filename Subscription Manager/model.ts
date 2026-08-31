export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly" | "oneTime"

export type Subscription = {
  id: string
  name: string
  price: number
  currency: string
  cycle: BillingCycle
  category: string
  startDate: number
  nextBillingDate: number
  trialEndDate: number | null
  endDate: number | null
  autoRenew: boolean
  reminderDays: number
  notes: string
  icon: string
  progressColor: string
  active: boolean
}

export type ExchangeRateTable = {
  base: "CNY"
  updatedAt: number
  rates: Record<string, number>
}

export type AppSettings = {
  defaultCurrency: string
  defaultReminderDays: number
  notificationsEnabled: boolean
}

export type CatalogItem = {
  name: string
  category: string
  icon: string
  color: string
}

export const CATEGORIES = ["娱乐", "效率", "教育", "云服务", "健身", "阅读", "其他"]
export const CURRENCIES = [
  "CNY", "USD", "HKD", "TWD", "JPY", "EUR", "GBP",
  "TRY", "ARS", "INR", "BRL", "RUB", "UAH", "IDR", "PHP",
  "MYR", "THB", "VND", "KRW", "MXN", "PKR", "EGP", "ZAR", "PLN",
]
export const REMINDER_OPTIONS = [0, 1, 3, 7, 14]
export const ICON_OPTIONS = [
  "creditcard.fill", "music.note", "play.rectangle.fill", "cloud.fill",
  "gamecontroller.fill", "book.fill", "figure.run", "sparkles",
  "tv.fill", "cart.fill", "graduationcap.fill", "briefcase.fill",
  "newspaper.fill", "film.fill", "headphones", "photo.fill",
  "shippingbox.fill", "network", "globe", "ellipsis.circle.fill",
]

export const POPULAR_SERVICES: CatalogItem[] = [
  { name: "Netflix", category: "娱乐", icon: "play.rectangle.fill", color: "systemRed" },
  { name: "Spotify", category: "娱乐", icon: "music.note", color: "systemGreen" },
  { name: "Apple Music", category: "娱乐", icon: "music.note", color: "systemPink" },
  { name: "YouTube Premium", category: "娱乐", icon: "play.rectangle.fill", color: "systemRed" },
  { name: "Disney+", category: "娱乐", icon: "film.fill", color: "systemBlue" },
  { name: "HBO Max", category: "娱乐", icon: "tv.fill", color: "systemPurple" },
  { name: "Xbox Game Pass", category: "娱乐", icon: "gamecontroller.fill", color: "systemGreen" },
  { name: "iCloud+", category: "云服务", icon: "cloud.fill", color: "systemBlue" },
  { name: "Google One", category: "云服务", icon: "cloud.fill", color: "systemBlue" },
  { name: "Dropbox", category: "云服务", icon: "shippingbox.fill", color: "systemBlue" },
  { name: "ChatGPT Plus", category: "效率", icon: "sparkles", color: "systemGreen" },
  { name: "Microsoft 365", category: "效率", icon: "briefcase.fill", color: "systemBlue" },
  { name: "Notion", category: "效率", icon: "square.on.square", color: "systemGray" },
  { name: "GitHub Copilot", category: "效率", icon: "chevron.left.forwardslash.chevron.right", color: "systemGray" },
  { name: "Adobe Creative Cloud", category: "效率", icon: "paintpalette.fill", color: "systemRed" },
  { name: "Kindle Unlimited", category: "阅读", icon: "book.fill", color: "systemOrange" },
  { name: "Duolingo", category: "教育", icon: "graduationcap.fill", color: "systemGreen" },
  { name: "Strava", category: "健身", icon: "figure.run", color: "systemOrange" },
]

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: "CNY",
  defaultReminderDays: 3,
  notificationsEnabled: true,
}

const DAY = 86_400_000
const DATA_DIR = `${FileManager.appGroupDocumentsDirectory}/subscription_manager_v2`
const SUBSCRIPTIONS_PATH = `${DATA_DIR}/subscriptions.json`
const SETTINGS_PATH = `${DATA_DIR}/settings.json`
const EXCHANGE_RATES_PATH = `${DATA_DIR}/exchange_rates.json`
const EXCHANGE_RATE_URL = "https://open.er-api.com/v6/latest/CNY"
const EXCHANGE_RATE_MAX_AGE = 12 * 60 * 60 * 1000

export function dateOnly(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(12, 0, 0, 0)
  return date.getTime()
}

export function makeID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createSubscription(
  settings: AppSettings = DEFAULT_SETTINGS,
  catalog?: CatalogItem,
): Subscription {
  const today = dateOnly(Date.now())
  return {
    id: makeID(),
    name: catalog?.name ?? "",
    price: 0,
    currency: settings.defaultCurrency,
    cycle: "monthly",
    category: catalog?.category ?? "其他",
    startDate: today,
    nextBillingDate: today,
    trialEndDate: null,
    endDate: null,
    autoRenew: true,
    reminderDays: settings.defaultReminderDays,
    notes: "",
    icon: catalog?.icon ?? "creditcard.fill",
    progressColor: catalog?.color ?? "systemBlue",
    active: true,
  }
}

function normalize(raw: Partial<Subscription> & Record<string, any>): Subscription {
  const base = createSubscription()
  const cycle = String(raw.cycle)
  const icon = typeof raw.icon === "string" && !raw.icon.startsWith("remote:") && !raw.icon.startsWith("local:") && !raw.icon.startsWith("custom:")
    ? raw.icon
    : "creditcard.fill"
  return {
    ...base,
    ...raw,
    id: typeof raw.id === "string" && raw.id ? raw.id : makeID(),
    name: String(raw.name || ""),
    price: Number.isFinite(Number(raw.price)) ? Math.max(0, Number(raw.price)) : 0,
    currency: CURRENCIES.includes(String(raw.currency)) ? String(raw.currency) : base.currency,
    cycle: ["weekly", "monthly", "quarterly", "yearly", "oneTime"].includes(cycle)
      ? cycle as BillingCycle
      : "monthly",
    category: CATEGORIES.includes(String(raw.category)) ? String(raw.category) : "其他",
    startDate: Number(raw.startDate) || base.startDate,
    nextBillingDate: Number(raw.nextBillingDate) || base.nextBillingDate,
    trialEndDate: raw.trialEndDate ? Number(raw.trialEndDate) : null,
    endDate: raw.endDate ? Number(raw.endDate) : null,
    reminderDays: REMINDER_OPTIONS.includes(Number(raw.reminderDays))
      ? Number(raw.reminderDays)
      : base.reminderDays,
    notes: String(raw.notes || ""),
    icon,
    progressColor: typeof raw.progressColor === "string" && raw.progressColor
      ? raw.progressColor
      : (typeof raw.color === "string" && raw.color ? raw.color : "systemBlue"),
    autoRenew: raw.autoRenew !== false,
    active: raw.active !== false,
  }
}

function ensureDirectory(): void {
  if (!FileManager.existsSync(DATA_DIR)) {
    FileManager.createDirectorySync(DATA_DIR, true)
  }
}

function readJSON<T>(path: string): T | null {
  try {
    if (!FileManager.existsSync(path)) return null
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch (error) {
    console.error("读取订阅文件失败", error)
    return null
  }
}

function writeJSON(path: string, value: unknown): void {
  ensureDirectory()
  FileManager.writeAsStringSync(path, JSON.stringify(value, null, 2))
}

export function loadSubscriptions(): Subscription[] {
  const data = readJSON<Array<Partial<Subscription> & Record<string, any>>>(SUBSCRIPTIONS_PATH)
  return Array.isArray(data) ? data.map(normalize) : []
}

export function saveSubscriptions(items: Subscription[]): void {
  writeJSON(SUBSCRIPTIONS_PATH, items.map(item => normalize(item)))
}

export function loadSettings(): AppSettings {
  const data = readJSON<Partial<AppSettings>>(SETTINGS_PATH)
  if (!data) return { ...DEFAULT_SETTINGS }
  return {
    defaultCurrency: CURRENCIES.includes(String(data.defaultCurrency))
      ? String(data.defaultCurrency)
      : DEFAULT_SETTINGS.defaultCurrency,
    defaultReminderDays: REMINDER_OPTIONS.includes(Number(data.defaultReminderDays))
      ? Number(data.defaultReminderDays)
      : DEFAULT_SETTINGS.defaultReminderDays,
    notificationsEnabled: data.notificationsEnabled !== false,
  }
}

export function saveSettings(settings: AppSettings): void {
  writeJSON(SETTINGS_PATH, settings)
}

export function cycleLabel(cycle: BillingCycle): string {
  switch (cycle) {
    case "weekly": return "每周"
    case "monthly": return "每月"
    case "quarterly": return "每季"
    case "yearly": return "每年"
    case "oneTime": return "一次性"
  }
}

export function cycleMultiplier(cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly": return 52
    case "monthly": return 12
    case "quarterly": return 4
    case "yearly": return 1
    case "oneTime": return 0
  }
}

export function activeItems(items: Subscription[]): Subscription[] {
  const now = dateOnly(Date.now())
  return items.filter(item => item.active && (!item.endDate || item.endDate >= now))
}

export function monthlyCost(items: Subscription[]): number {
  return activeItems(items).reduce((sum, item) => {
    return sum + item.price * cycleMultiplier(item.cycle) / 12
  }, 0)
}

export function costByCurrency(
  items: Subscription[],
  annual = false,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of activeItems(items)) {
    const value = annual
      ? item.price * cycleMultiplier(item.cycle)
      : item.price * cycleMultiplier(item.cycle) / 12
    result[item.currency] = (result[item.currency] || 0) + value
  }
  return result
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return `${currency} ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`
  }
}

export function formatCostSummary(
  items: Subscription[],
  annual = false,
): string {
  const entries = Object.entries(costByCurrency(items, annual))
  if (entries.length === 0) return formatMoney(0, "CNY")
  return entries
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join("  ·  ")
}

export function loadExchangeRates(): ExchangeRateTable | null {
  const cached = readJSON<Partial<ExchangeRateTable>>(EXCHANGE_RATES_PATH)
  if (!cached || !cached.rates || typeof cached.updatedAt !== "number") return null
  return {
    base: "CNY",
    updatedAt: cached.updatedAt,
    rates: cached.rates as Record<string, number>,
  }
}

export async function refreshExchangeRates(force = false): Promise<ExchangeRateTable | null> {
  const cached = loadExchangeRates()
  if (!force && cached && Date.now() - cached.updatedAt < EXCHANGE_RATE_MAX_AGE) {
    return cached
  }
  try {
    const response = await fetch(EXCHANGE_RATE_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as { result?: string; rates?: Record<string, number> }
    if (data.result !== "success" || !data.rates) throw new Error("汇率数据无效")
    const table: ExchangeRateTable = {
      base: "CNY",
      updatedAt: Date.now(),
      rates: { ...data.rates, CNY: 1 },
    }
    writeJSON(EXCHANGE_RATES_PATH, table)
    return table
  } catch (error) {
    console.error("更新汇率失败", error)
    return cached
  }
}

export function convertToCNY(
  amount: number,
  currency: string,
  rates: ExchangeRateTable | null,
): number | null {
  if (currency === "CNY") return amount
  const rate = rates?.rates[currency]
  return rate && Number.isFinite(rate) && rate > 0 ? amount / rate : null
}

export function convertedCost(
  items: Subscription[],
  rates: ExchangeRateTable | null,
  annual = false,
): number | null {
  let total = 0
  for (const [currency, amount] of Object.entries(costByCurrency(items, annual))) {
    const value = convertToCNY(amount, currency, rates)
    if (value === null) return null
    total += value
  }
  return total
}

export function formatConvertedCost(
  items: Subscription[],
  rates: ExchangeRateTable | null,
  annual = false,
): string {
  const total = convertedCost(items, rates, annual)
  if (total !== null) return formatMoney(total, "CNY")
  const currencies = Object.keys(costByCurrency(items, annual))
  return currencies.every(currency => currency === "CNY")
    ? formatMoney(costByCurrency(items, annual).CNY || 0, "CNY")
    : "正在获取汇率…"
}

export function formatDate(timestamp: number | null): string {
  if (!timestamp) return "未设置"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(timestamp))
}

export function daysUntil(timestamp: number): number {
  return Math.ceil((dateOnly(timestamp) - dateOnly(Date.now())) / DAY)
}

export function effectiveDueDate(item: Subscription): number {
  const dates = [item.nextBillingDate]
  if (item.trialEndDate && daysUntil(item.trialEndDate) >= 0) {
    dates.push(item.trialEndDate)
  }
  if (item.endDate) dates.push(item.endDate)
  return Math.min(...dates.filter(value => Number.isFinite(value) && value > 0))
}

export function remainingDays(item: Subscription): number {
  return Math.max(0, daysUntil(effectiveDueDate(item)))
}

function previousBillingDate(
  timestamp: number,
  cycle: BillingCycle,
): number {
  const date = new Date(timestamp)
  switch (cycle) {
    case "weekly": date.setDate(date.getDate() - 7); break
    case "monthly": date.setMonth(date.getMonth() - 1); break
    case "quarterly": date.setMonth(date.getMonth() - 3); break
    case "yearly": date.setFullYear(date.getFullYear() - 1); break
    case "oneTime": break
  }
  return dateOnly(date.getTime())
}

export function remainingProgress(item: Subscription): number {
  const end = effectiveDueDate(item)
  const start = item.cycle === "oneTime"
    ? item.startDate
    : Math.max(item.startDate, previousBillingDate(end, item.cycle))
  const total = Math.max(DAY, end - start)
  const remaining = Math.max(0, end - dateOnly(Date.now()))
  return Math.max(0, Math.min(1, remaining / total))
}

export function sortByNextBilling(
  items: Subscription[],
): Subscription[] {
  return [...items].sort((a, b) => effectiveDueDate(a) - effectiveDueDate(b))
}

export function advanceBillingDate(
  timestamp: number,
  cycle: BillingCycle,
): number {
  const date = new Date(timestamp)
  switch (cycle) {
    case "weekly": date.setDate(date.getDate() + 7); break
    case "monthly": date.setMonth(date.getMonth() + 1); break
    case "quarterly": date.setMonth(date.getMonth() + 3); break
    case "yearly": date.setFullYear(date.getFullYear() + 1); break
    case "oneTime": break
  }
  return dateOnly(date.getTime())
}
