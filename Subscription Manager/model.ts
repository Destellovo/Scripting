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
  appStoreURL: string
  icon: string
  iconPath?: string
  iconURL?: string
  color: string
  progressColor: string
  active: boolean
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
  currency?: string
  price?: number
  cycle?: BillingCycle
}

export const CATEGORIES = ["娱乐", "效率", "教育", "云服务", "健身", "阅读", "其他"]
export const CURRENCIES = ["CNY", "USD", "HKD", "TWD", "JPY", "EUR", "GBP"]
export const REMINDER_OPTIONS = [0, 1, 3, 7, 14]
export const ICON_OPTIONS = [
  "creditcard.fill", "music.note", "play.rectangle.fill", "cloud.fill",
  "gamecontroller.fill", "book.fill", "figure.run", "sparkles",
  "tv.fill", "cart.fill", "graduationcap.fill", "ellipsis.circle.fill",
]
export const COLOR_OPTIONS = ["systemBlue", "systemPurple", "systemGreen", "systemOrange", "systemRed", "systemPink", "systemTeal"]

export const POPULAR_SERVICES: CatalogItem[] = [
  { name: "Netflix", category: "娱乐", icon: "play.rectangle.fill", color: "systemRed" },
  { name: "Spotify", category: "娱乐", icon: "music.note", color: "systemGreen" },
  { name: "Apple Music", category: "娱乐", icon: "music.note", color: "systemPink" },
  { name: "YouTube Premium", category: "娱乐", icon: "play.rectangle.fill", color: "systemRed" },
  { name: "Disney+", category: "娱乐", icon: "play.rectangle.fill", color: "systemBlue" },
  { name: "HBO Max", category: "娱乐", icon: "tv.fill", color: "systemPurple" },
  { name: "Xbox Game Pass", category: "娱乐", icon: "gamecontroller.fill", color: "systemGreen" },
  { name: "iCloud+", category: "云服务", icon: "cloud.fill", color: "systemBlue" },
  { name: "Google One", category: "云服务", icon: "cloud.fill", color: "systemBlue" },
  { name: "Dropbox", category: "云服务", icon: "cloud.fill", color: "systemBlue" },
  { name: "ChatGPT Plus", category: "效率", icon: "sparkles", color: "systemGreen" },
  { name: "Microsoft 365", category: "效率", icon: "briefcase.fill", color: "systemBlue" },
  { name: "Notion", category: "效率", icon: "square.on.square", color: "systemBlack" },
  { name: "Linear", category: "效率", icon: "checkmark.circle.fill", color: "systemPurple" },
  { name: "GitHub Copilot", category: "效率", icon: "chevron.left.forwardslash.chevron.right", color: "systemGray" },
  { name: "Adobe Creative Cloud", category: "效率", icon: "paintpalette.fill", color: "systemRed" },
  { name: "Kindle Unlimited", category: "阅读", icon: "book.fill", color: "systemOrange" },
  { name: "Duolingo", category: "教育", icon: "graduationcap.fill", color: "systemGreen" },
  { name: "Strava", category: "健身", icon: "figure.run", color: "systemOrange" },
  { name: "Grammarly", category: "效率", icon: "textformat", color: "systemGreen" },
]

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: "CNY",
  defaultReminderDays: 3,
  notificationsEnabled: true,
}

const STORAGE_KEY = "subscription_manager_subscriptions_v3"
const LEGACY_STORAGE_KEYS = ["subscription_manager_subscriptions_v2", "subscription_manager_subscriptions_v1"]
const SETTINGS_KEY = "subscription_manager_settings_v3"
const LEGACY_SETTINGS_KEYS = ["subscription_manager_settings_v2", "subscription_manager_settings_v1"]
const DAY = 24 * 60 * 60 * 1000

export function makeID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function dateOnly(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(9, 0, 0, 0)
  return date.getTime()
}

export function createSubscription(settings: AppSettings = DEFAULT_SETTINGS, catalog?: CatalogItem): Subscription {
  const today = dateOnly(Date.now())
  return {
    id: makeID(),
    name: catalog?.name ?? "",
    price: catalog?.price ?? 0,
    currency: catalog?.currency ?? settings.defaultCurrency,
    cycle: catalog?.cycle ?? "monthly",
    category: catalog?.category ?? "其他",
    startDate: today,
    nextBillingDate: today,
    trialEndDate: null,
    endDate: null,
    autoRenew: catalog?.cycle !== "oneTime",
    reminderDays: settings.defaultReminderDays,
    notes: "",
    appStoreURL: "",
    icon: catalog?.icon ?? "creditcard.fill",
    iconPath: "",
    iconURL: "",
    color: catalog?.color ?? "systemBlue",
    progressColor: "systemBlue",
    active: true,
  }
}

function normalize(item: Partial<Subscription>): Subscription {
  const base = createSubscription()
  const cycle = String(item.cycle)
  const currency = String(item.currency)
  const category = String(item.category)
  return {
    ...base,
    ...item,
    id: typeof item.id === "string" && item.id ? item.id : makeID(),
    name: String(item.name || ""),
    price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
    currency: CURRENCIES.includes(currency) ? currency : base.currency,
    cycle: ["weekly", "monthly", "quarterly", "yearly", "oneTime"].includes(cycle) ? cycle as BillingCycle : "monthly",
    category: CATEGORIES.includes(category) ? category : "其他",
    startDate: Number(item.startDate) || base.startDate,
    nextBillingDate: Number(item.nextBillingDate) || base.nextBillingDate,
    reminderDays: REMINDER_OPTIONS.includes(Number(item.reminderDays)) ? Number(item.reminderDays) : base.reminderDays,
    trialEndDate: item.trialEndDate ? Number(item.trialEndDate) : null,
    endDate: item.endDate ? Number(item.endDate) : null,
    iconPath: typeof item.iconPath === "string" ? item.iconPath : "",
    iconURL: typeof item.iconURL === "string" ? item.iconURL : "",
    progressColor: typeof item.progressColor === "string" && item.progressColor ? item.progressColor : (typeof item.color === "string" && item.color ? item.color : "systemBlue"),
    autoRenew: item.autoRenew !== false,
    active: item.active !== false,
  }
}

async function getStorageValue<T>(key: string): Promise<T | null> {
  try {
    const privateValue = await Storage.get<T>(key, { shared: false })
    if (privateValue != null) return privateValue
  } catch { /* 尝试共享域 */ }
  try {
    const sharedValue = await Storage.get<T>(key, { shared: true })
    return sharedValue ?? null
  } catch {
    return null
  }
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  try {
    let value = await getStorageValue<Partial<Subscription>[]>(STORAGE_KEY)
    if (!Array.isArray(value)) {
      for (const key of LEGACY_STORAGE_KEYS) {
        value = await getStorageValue<Partial<Subscription>[]>(key)
        if (Array.isArray(value)) break
      }
    }
    return Array.isArray(value) ? value.map(normalize) : []
  } catch (error) {
    console.error("读取订阅失败", error)
    return []
  }
}

export async function saveSubscriptions(items: Subscription[]): Promise<void> {
  const normalized = items.map(normalize)
  await Storage.set(STORAGE_KEY, normalized, { shared: false })
  await Storage.set(STORAGE_KEY, normalized, { shared: true })
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    let value = await getStorageValue<Partial<AppSettings>>(SETTINGS_KEY)
    if (!value || typeof value !== "object") {
      for (const key of LEGACY_SETTINGS_KEYS) {
        value = await getStorageValue<Partial<AppSettings>>(key)
        if (value && typeof value === "object") break
      }
    }
    if (value && typeof value === "object") {
      return {
        ...DEFAULT_SETTINGS,
        ...value,
        defaultCurrency: CURRENCIES.includes(String(value.defaultCurrency)) ? String(value.defaultCurrency) : DEFAULT_SETTINGS.defaultCurrency,
        defaultReminderDays: REMINDER_OPTIONS.includes(Number(value.defaultReminderDays)) ? Number(value.defaultReminderDays) : DEFAULT_SETTINGS.defaultReminderDays,
        notificationsEnabled: value.notificationsEnabled !== false,
      }
    }
  } catch (error) {
    console.error("读取设置失败", error)
  }
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await Storage.set(SETTINGS_KEY, settings, { shared: false })
  await Storage.set(SETTINGS_KEY, settings, { shared: true })
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

export function monthlyEquivalent(item: Subscription): number {
  return item.active ? item.price * cycleMultiplier(item.cycle) / 12 : 0
}

export function annualEquivalent(item: Subscription): number {
  return item.active ? item.price * cycleMultiplier(item.cycle) : 0
}

export function activeItems(items: Subscription[]): Subscription[] {
  const now = dateOnly(Date.now())
  return items.filter(item => item.active && (!item.endDate || item.endDate >= now))
}

export function monthlyCost(items: Subscription[]): number {
  return activeItems(items).reduce((sum, item) => sum + monthlyEquivalent(item), 0)
}

export function costByCurrency(items: Subscription[], annual = false): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of activeItems(items)) {
    const amount = annual ? annualEquivalent(item) : monthlyEquivalent(item)
    result[item.currency] = (result[item.currency] || 0) + amount
  }
  return result
}

export function formatMoney(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function formatCostSummary(items: Subscription[], annual = false): string {
  const entries = Object.entries(costByCurrency(items, annual))
  if (entries.length === 0) return formatMoney(0, "CNY")
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join("  ·  ")
}

export function formatDate(timestamp: number | null): string {
  if (!timestamp) return "未设置"
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(timestamp))
  } catch {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  }
}

export function daysUntil(timestamp: number): number {
  return Math.ceil((dateOnly(timestamp) - dateOnly(Date.now())) / DAY)
}

export function effectiveDueDate(item: Subscription): number {
  const dates = [item.nextBillingDate]
  if (item.trialEndDate && daysUntil(item.trialEndDate) >= 0) dates.push(item.trialEndDate)
  if (item.endDate) dates.push(item.endDate)
  return Math.min(...dates.filter(value => Number.isFinite(value) && value > 0))
}

export function remainingDays(item: Subscription): number {
  return Math.max(0, daysUntil(effectiveDueDate(item)))
}

function previousBillingDate(timestamp: number, cycle: BillingCycle): number {
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

/** 剩余周期占比：刚开始时接近 1，临近到期时接近 0。 */
export function remainingProgress(item: Subscription): number {
  const end = effectiveDueDate(item)
  let start = item.startDate
  if (item.cycle !== "oneTime") start = Math.max(start, previousBillingDate(end, item.cycle))
  const total = Math.max(DAY, end - start)
  const remaining = Math.max(0, end - dateOnly(Date.now()))
  return Math.max(0, Math.min(1, remaining / total))
}

export function sortByNextBilling(items: Subscription[]): Subscription[] {
  return [...items].sort((a, b) => effectiveDueDate(a) - effectiveDueDate(b))
}

export function advanceBillingDate(timestamp: number, cycle: BillingCycle): number {
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
