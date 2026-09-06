import { Script, fetch } from "scripting"

const BANGUMI_API = "https://api.bgm.tv"
const BANGUMI_PRIVATE_API = "https://next.bgm.tv"
const BANGUMI_AUTH_DOMAIN = "next.bgm.tv"
const BANGUMI_AUTH_DOMAIN_KEY = "bangumi.authDomain"
const BANGUMI_SCRIPT_NAME = "girigirilove Glass C"
const BANGUMI_AUTH_KEY = "bangumi.auth"
const BANGUMI_CLIENT_ID_KEY = "bangumi.clientId"
const BANGUMI_CLIENT_SECRET_KEY = "bangumi.clientSecret"
const BANGUMI_GIRIGIRI_SUBJECT_KEY_PREFIX = "bangumi.girigiri.subject."
const AUTH_REFRESH_SKEW_MS = 60 * 1000
const REQUEST_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "GiriGiri Scripting Client",
}
const CALENDAR_CACHE_TTL = 60 * 60 * 1000
let calendarCache: { value: BangumiCalendar; timestamp: number } | null = null
const searchRequests = new Map<string, Promise<BangumiMatch[]>>()
const subjectRequests = new Map<number, Promise<BangumiSubject>>()
const subjectDetailRequests = new Map<number, Promise<BangumiSubjectDetails>>()

export type BangumiInfoItem = { key: string; value: string }
export type BangumiCountItem = { key: string; label: string; count: number }
export type BangumiEpisodeCollectionStatus = "未看" | BangumiProgressStatus
export type BangumiEpisode = {
  id: number
  number: number
  name: string
  nameCn: string
  airdate: string
  duration: string
  description: string
  comments: number
  collection: BangumiEpisodeCollectionStatus
}
export type BangumiPerson = {
  id: number
  name: string
  relation: string
  episodes: string
}
export type BangumiCharacter = {
  id: number
  name: string
  relation: string
  imageUrl?: string
  actors: string[]
}
export type BangumiRelatedSubject = {
  id: number
  name: string
  nameCn: string
  relation: string
  type: number
  imageUrl?: string
}
export type BangumiSubject = {
  id: number
  name: string
  nameCn: string
  summary: string
  date: string
  platform: string
  episodes: number
  totalEpisodes: number
  score: number
  votes: number
  rank: number
  imageUrl?: string
  tags: string[]
  aliases: string[]
  metaTags: string[]
  infobox: BangumiInfoItem[]
  collection: BangumiCountItem[]
  ratingDistribution: BangumiCountItem[]
}
export type BangumiSubjectDetails = {
  subject: BangumiSubject
  episodes: BangumiEpisode[]
  characters: BangumiCharacter[]
  relatedSubjects: BangumiRelatedSubject[]
  persons: BangumiPerson[]
}
export type BangumiMatch = BangumiSubject & {
  matchKind: "精确匹配" | "相似候选"
}
export type BangumiCalendarItem = {
  id: number
  name: string
  nameCn: string
  airDate: string
  imageUrl?: string
  score: number
  votes: number
  rank: number
  doingCount: number
}
export type BangumiCalendarDay = {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7
  title: string
  shortTitle: string
  items: BangumiCalendarItem[]
}
export type BangumiCalendar = {
  days: BangumiCalendarDay[]
  timestamp: number
}

export type BangumiProgressStatus = "想看" | "在看" | "看过" | "搁置" | "抛弃"
export type BangumiProgressItem = {
  subject: BangumiSubject
  status: BangumiProgressStatus
  statusType: number
  watchedEpisodes: number
  totalEpisodes: number
  updatedAt: string
}

const BANGUMI_PROGRESS_TYPES: Array<{ type: number; label: BangumiProgressStatus }> = [
  { type: 1, label: "想看" },
  { type: 2, label: "看过" },
  { type: 3, label: "在看" },
  { type: 4, label: "搁置" },
  { type: 5, label: "抛弃" },
]

export const bangumiClient = {
  getOAuthConfig() {
    return {
      clientId: readString(BANGUMI_CLIENT_ID_KEY),
      clientSecret: readString(BANGUMI_CLIENT_SECRET_KEY),
      callbackURL: getOAuthCallbackURL(),
      authDomain: readString(BANGUMI_AUTH_DOMAIN_KEY) || BANGUMI_AUTH_DOMAIN,
    }
  },

  getOAuthStatus() {
    const auth = readAuth()
    const isExpired = Boolean(auth?.expiresAt && auth.expiresAt <= Date.now())
    return {
      isAuthenticated: (Boolean(auth?.accessToken) && (!isExpired || Boolean(auth?.refreshToken))) || Boolean(auth?.refreshToken),
      hasRefreshToken: Boolean(auth?.refreshToken),
      expiresAt: auth?.expiresAt || 0,
    }
  },

  getLinkedSubjectId(videoCode: string) {
    const value = Storage.get<number | string>(`${BANGUMI_GIRIGIRI_SUBJECT_KEY_PREFIX}${videoCode.trim()}`)
    const subjectId = typeof value === "number" ? value : Number(value)
    return Number.isFinite(subjectId) && subjectId > 0 ? subjectId : undefined
  },

  linkGirigiriSubject(videoCode: string, subjectId: number) {
    const normalizedCode = videoCode.trim()
    if (!normalizedCode || !Number.isFinite(subjectId) || subjectId <= 0) return
    Storage.set(`${BANGUMI_GIRIGIRI_SUBJECT_KEY_PREFIX}${normalizedCode}`, subjectId)
  },

  unlinkGirigiriSubject(videoCode: string) {
    const normalizedCode = videoCode.trim()
    if (!normalizedCode) return
    Storage.remove(`${BANGUMI_GIRIGIRI_SUBJECT_KEY_PREFIX}${normalizedCode}`)
  },

  saveOAuthClientConfig(clientId: string, clientSecret: string) {
    Storage.set(BANGUMI_CLIENT_ID_KEY, clientId.trim())
    Storage.set(BANGUMI_CLIENT_SECRET_KEY, clientSecret.trim())
  },

  saveOAuthAuthDomain(domain: string) {
    Storage.set(BANGUMI_AUTH_DOMAIN_KEY, domain.trim() || BANGUMI_AUTH_DOMAIN)
  },

  clearOAuthAuth() {
    Storage.remove(BANGUMI_AUTH_KEY)
  },

  buildOAuthURL() {
    const config = this.getOAuthConfig()
    return buildOAuthURLForClient(config.clientId, config.authDomain, config.callbackURL)
  },

  buildOAuthURLForCredentials(clientId: string, clientSecret: string) {
    const config = this.getOAuthConfig()
    return clientId.trim() && clientSecret.trim() ? buildOAuthURLForClient(clientId.trim(), config.authDomain, config.callbackURL) : ""
  },

  async consumeOAuthCallback(input: Record<string, any> | string | null | undefined) {
    const params = normalizeOAuthInput(input)
    if (!params || (!params.code && !params.error && !params.oauth_callback)) return { status: "idle" as const, message: "未检测到授权回调" }
    if (params.error) return { status: "error" as const, message: params.error_description || params.error }
    if (!params.code) return { status: "error" as const, message: "授权回调缺少 code" }
    const config = this.getOAuthConfig()
    if (!config.clientId || !config.clientSecret) return { status: "error" as const, message: "请先配置 Bangumi 应用 ID 和应用密钥" }
    try {
      const response = await fetch(`https://${config.authDomain}/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "authorization_code", client_id: config.clientId, client_secret: config.clientSecret, code: params.code, redirect_uri: config.callbackURL }),
      })
      if (!response.ok) throw new Error(`OAuth 授权失败（${response.status}）`)
      const auth = normalizeAuth(await response.json())
      if (!auth) throw new Error("OAuth 未返回有效登录凭据")
      Storage.set(BANGUMI_AUTH_KEY, JSON.stringify(auth))
      return { status: "success" as const, message: "Bangumi 已完成 OAuth 登录" }
    } catch (error) {
      return { status: "error" as const, message: error instanceof Error ? error.message : "OAuth 回调处理失败" }
    }
  },

  async getCalendar(forceRefresh = false): Promise<BangumiCalendar> {
    const now = Date.now()
    if (!forceRefresh && calendarCache && now - calendarCache.timestamp < CALENDAR_CACHE_TTL) return calendarCache.value
    const calendar = parseCalendar(await requestJson(`${BANGUMI_API}/calendar`))
    calendarCache = { value: calendar, timestamp: now }
    return calendar
  },

  async searchAnime(title: string): Promise<BangumiMatch[]> {
    const keyword = cleanTitle(title)
    if (!keyword) return []
    const requestKey = comparableTitle(keyword)
    const existing = searchRequests.get(requestKey)
    if (existing) return existing

    const request = (async () => {
      const payload = await requestJson(`${BANGUMI_API}/v0/search/subjects?limit=10&offset=0`, {
        method: "POST",
        body: JSON.stringify({ keyword, sort: "match", filter: { type: [2] } }),
      }) as { data?: unknown[] }
      return (payload.data || [])
        .map(parseSubject)
        .filter((subject): subject is BangumiSubject => subject !== null)
        .map((subject) => ({
          ...subject,
          matchKind: isExactTitleMatch(keyword, subject) ? "精确匹配" as const : "相似候选" as const,
        }))
        .sort((left, right) => Number(right.matchKind === "精确匹配") - Number(left.matchKind === "精确匹配"))
        .slice(0, 5)
    })()
    searchRequests.set(requestKey, request)
    try {
      return await request
    } finally {
      if (searchRequests.get(requestKey) === request) searchRequests.delete(requestKey)
    }
  },

  async getSubject(subjectId: number): Promise<BangumiSubject> {
    const existing = subjectRequests.get(subjectId)
    if (existing) return existing
    const request = (async () => {
      const subject = parseSubject(await requestJson(`${BANGUMI_API}/v0/subjects/${subjectId}`))
      if (!subject) throw new Error("Bangumi 返回了无法识别的条目详情。")
      return subject
    })()
    subjectRequests.set(subjectId, request)
    try {
      return await request
    } finally {
      if (subjectRequests.get(subjectId) === request) subjectRequests.delete(subjectId)
    }
  },

  async getSubjectDetails(subjectId: number): Promise<BangumiSubjectDetails> {
    const existing = subjectDetailRequests.get(subjectId)
    if (existing) return existing
    const request = (async () => {
      const [subject, episodeData, characterPayload, relatedPayload, personPayload] = await Promise.all([
        this.getSubject(subjectId),
        getAllEpisodes(subjectId),
        optionalRequest(`${BANGUMI_API}/v0/subjects/${subjectId}/characters`, []),
        optionalRequest(`${BANGUMI_API}/v0/subjects/${subjectId}/subjects`, []),
        optionalRequest(`${BANGUMI_API}/v0/subjects/${subjectId}/persons`, []),
      ])
      return {
        subject,
        episodes: episodeData.map(parseEpisode).filter((item): item is BangumiEpisode => item !== null),
        characters: (Array.isArray(characterPayload) ? characterPayload : [])
          .map(parseCharacter)
          .filter((item): item is BangumiCharacter => item !== null && isPrimaryCharacterRelation(item.relation))
          .slice(0, 8),
        relatedSubjects: (Array.isArray(relatedPayload) ? relatedPayload : []).map(parseRelatedSubject).filter((item): item is BangumiRelatedSubject => item !== null),
        persons: (Array.isArray(personPayload) ? personPayload : []).map(parsePerson).filter((item): item is BangumiPerson => item !== null),
      }
    })()
    subjectDetailRequests.set(subjectId, request)
    try {
      return await request
    } finally {
      if (subjectDetailRequests.get(subjectId) === request) subjectDetailRequests.delete(subjectId)
    }
  },

  subjectUrl(subjectId: number) {
    return `https://bgm.tv/subject/${subjectId}`
  },

  async getProgressCollections(type?: number): Promise<BangumiProgressItem[]> {
    const pageSize = 50
    const result: BangumiProgressItem[] = []
    for (let offset = 0; offset < 500; offset += pageSize) {
      const query = new URLSearchParams({ since: "0", limit: `${pageSize}`, offset: `${offset}` })
      if (type) query.set("type", `${type}`)
      const payload = await requestJson(`${BANGUMI_PRIVATE_API}/p1/collections/subjects?${query.toString()}`)
      const items = isRecord(payload) && Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : []
      const parsed = await Promise.all(items.map(async (raw) => {
        const direct = parseProgressItem(raw)
        const rawSubject = isRecord(raw) && isRecord(raw.subject) ? raw.subject : null
        const subjectId = direct?.subject.id || numberValue(isRecord(raw) ? raw.subject_id : 0) || numberValue(isRecord(raw) ? raw.subjectId : 0) || numberValue(rawSubject?.id)
        if (direct?.subject.nameCn) return direct
        if (!subjectId) return direct
        try {
          const subject = await this.getSubject(subjectId)
          if (!direct) return parseProgressItem({ ...((isRecord(raw) ? raw : {}) as Record<string, any>), subject })
          return {
            ...direct,
            subject: { ...direct.subject, ...subject, name: direct.subject.name || subject.name, nameCn: subject.nameCn || direct.subject.nameCn },
            totalEpisodes: subject.totalEpisodes || subject.episodes || direct.totalEpisodes,
          }
        } catch {
          return direct
        }
      }))
      result.push(...parsed.filter((item): item is BangumiProgressItem => item !== null))
      if (items.length < pageSize) break
    }
    return result
  },

  async getProgressEpisodes(subjectId: number): Promise<BangumiEpisode[]> {
    const payload = await requestJson(`${BANGUMI_PRIVATE_API}/p1/subjects/${subjectId}/episodes?limit=100&offset=0`)
    const items = isRecord(payload) && Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : []
    return items.map(parseEpisode).filter((item): item is BangumiEpisode => item !== null)
  },

  async getProgressForSubject(subjectId: number): Promise<BangumiProgressItem | null> {
    const payload = await requestJson(`${BANGUMI_PRIVATE_API}/p1/collections/subjects/${subjectId}`, { notFoundAsNull: true })
    if (payload === null) return null
    const direct = parseProgressItem(payload)
    if (direct) return direct
    const subject = await this.getSubject(subjectId)
    return parseProgressItem({ ...(isRecord(payload) ? payload : {}), subject })
  },

  async updateProgress(subjectId: number, type: number) {
    const body = JSON.stringify({ type, rate: 0, comment: "", private: false })
    return requestJson(`${BANGUMI_PRIVATE_API}/p1/collections/subjects/${subjectId}`, { method: "PUT", body })
  }
}

function parseProgressItem(input: unknown): BangumiProgressItem | null {
  if (!isRecord(input)) return null
  const subjectInput = isRecord(input.subject) ? input.subject : isRecord(input.target) ? input.target : input
  const subject = parseSubject(subjectInput)
  const interest = isRecord(input.interest) ? input.interest : {}
  const subjectInterest = isRecord(subjectInput) && isRecord(subjectInput.interest) ? subjectInput.interest : {}
  const statusType = numberValue(interest.type) || numberValue(subjectInterest.type) || numberValue(input.type) || numberValue(input.ctype) || numberValue(input.collection_type) || numberValue(input.collectionType)
  const status = BANGUMI_PROGRESS_TYPES.find((item) => item.type === statusType)?.label
  if (!subject || !status) return null
  const watchedEpisodes = numberValue(interest.epStatus) || numberValue(interest.ep_status) || numberValue(subjectInterest.epStatus) || numberValue(input.ep_status) || numberValue(input.epStatus) || numberValue(input.eps_status) || numberValue(input.watched_eps)
  return {
    subject,
    status,
    statusType,
    watchedEpisodes,
    totalEpisodes: subject.totalEpisodes || subject.episodes,
    updatedAt: stringValue(input.updated_at) || stringValue(input.updatedAt),
  }
}

function parseCalendar(input: unknown): BangumiCalendar {
  const weekdayDefinitions: Array<{ id: BangumiCalendarDay["id"]; title: string; shortTitle: string }> = [
    { id: 1, title: "星期一", shortTitle: "周一" },
    { id: 2, title: "星期二", shortTitle: "周二" },
    { id: 3, title: "星期三", shortTitle: "周三" },
    { id: 4, title: "星期四", shortTitle: "周四" },
    { id: 5, title: "星期五", shortTitle: "周五" },
    { id: 6, title: "星期六", shortTitle: "周六" },
    { id: 7, title: "星期日", shortTitle: "周日" },
  ]
  const payload = Array.isArray(input) ? input : []
  const days = weekdayDefinitions.map((definition): BangumiCalendarDay => {
    const rawDay = payload.find((entry) => isRecord(entry) && isRecord(entry.weekday) && numberValue(entry.weekday.id) === definition.id)
    const rawItems = isRecord(rawDay) && Array.isArray(rawDay.items) ? rawDay.items : []
    return {
      ...definition,
      items: rawItems.map(parseCalendarItem).filter((item): item is BangumiCalendarItem => item !== null),
    }
  })
  if (!days.some((day) => day.items.length > 0)) throw new Error("Bangumi 新番时间表暂无可用条目。")
  return { days, timestamp: Date.now() }
}

function parseCalendarItem(input: unknown): BangumiCalendarItem | null {
  if (!isRecord(input) || numberValue(input.type) !== 2) return null
  const id = numberValue(input.id)
  const name = stringValue(input.name)
  if (!id || !name) return null
  const images = isRecord(input.images) ? input.images : {}
  const rating = isRecord(input.rating) ? input.rating : {}
  const collection = isRecord(input.collection) ? input.collection : {}
  const imageUrl = stringValue(images.common) || stringValue(images.medium) || stringValue(images.large)
  return {
    id,
    name,
    nameCn: stringValue(input.name_cn),
    airDate: stringValue(input.air_date),
    imageUrl: imageUrl ? imageUrl.replace(/^http:\/\//i, "https://") : undefined,
    score: numberValue(rating.score),
    votes: numberValue(rating.total),
    rank: numberValue(input.rank),
    doingCount: numberValue(collection.doing),
  }
}

function parseSubject(input: unknown): BangumiSubject | null {
  if (!isRecord(input)) return null
  const id = numberValue(input.id)
  const name = stringValue(input.name)
  if (!id || !name) return null

  const rawInfobox = Array.isArray(input.infobox) ? input.infobox : []
  const infobox = parseInfobox(rawInfobox)
  const aliases = readInfoValues(infobox, ["别名", "中文名"])
  const rating = isRecord(input.rating) ? input.rating : {}
  const ratingCount = isRecord(rating.count) ? rating.count : {}
  const collection = isRecord(input.collection) ? input.collection : {}
  const images = isRecord(input.images) ? input.images : {}

  return {
    id,
    name,
    nameCn: stringValue(input.name_cn) || aliases.find(containsCjk) || "",
    summary: stringValue(input.summary),
    date: stringValue(input.date),
    platform: stringValue(input.platform) || readInfoValues(infobox, ["放送类型", "平台"])[0] || "动画",
    episodes: numberValue(input.eps),
    totalEpisodes: numberValue(input.total_episodes) || numberValue(input.eps),
    score: numberValue(rating.score),
    votes: numberValue(rating.total),
    rank: numberValue(input.rank) || numberValue(rating.rank),
    imageUrl: stringValue(images.large) || stringValue(images.common) || stringValue(images.medium) || undefined,
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => isRecord(tag) ? stringValue(tag.name) : "").filter(Boolean) : [],
    aliases: uniqueStrings(aliases),
    metaTags: Array.isArray(input.meta_tags) ? input.meta_tags.map(stringValue).filter(Boolean) : [],
    infobox,
    collection: [
      { key: "wish", label: "想看", count: numberValue(collection.wish) },
      { key: "doing", label: "在看", count: numberValue(collection.doing) },
      { key: "collect", label: "看过", count: numberValue(collection.collect) },
      { key: "on_hold", label: "搁置", count: numberValue(collection.on_hold) },
      { key: "dropped", label: "抛弃", count: numberValue(collection.dropped) },
    ],
    ratingDistribution: Array.from({ length: 10 }, (_, index) => {
      const score = 10 - index
      return { key: `${score}`, label: `${score} 分`, count: numberValue(ratingCount[score]) }
    }),
  }
}

function parseEpisode(input: unknown): BangumiEpisode | null {
  if (!isRecord(input)) return null
  const id = numberValue(input.id)
  if (!id) return null
  const nestedCollection = isRecord(input.collection) ? input.collection : {}
  const collectionType = numberValue(nestedCollection.status) || numberValue(input.collection_type) || numberValue(input.collectionType) || numberValue(input.collection)
  const collection = collectionType === 1 ? "想看" : collectionType === 2 ? "看过" : collectionType === 3 ? "在看" : collectionType === 4 ? "搁置" : collectionType === 5 ? "抛弃" : "未看"
  return {
    id,
    number: numberValue(input.ep) || numberValue(input.sort),
    name: stringValue(input.name),
    nameCn: stringValue(input.name_cn),
    airdate: stringValue(input.airdate),
    duration: stringValue(input.duration),
    description: stringValue(input.desc),
    comments: numberValue(input.comment),
    collection,
  }
}

function parseCharacter(input: unknown): BangumiCharacter | null {
  if (!isRecord(input)) return null
  const id = numberValue(input.id)
  const name = stringValue(input.name)
  if (!id || !name) return null
  const images = isRecord(input.images) ? input.images : {}
  const actors = Array.isArray(input.actors) ? input.actors : []
  return {
    id,
    name,
    relation: stringValue(input.relation) || "角色",
    imageUrl: stringValue(images.medium) || stringValue(images.grid) || undefined,
    actors: actors.map((actor) => isRecord(actor) ? stringValue(actor.name) : "").filter(Boolean).slice(0, 3),
  }
}

function parsePerson(input: unknown): BangumiPerson | null {
  if (!isRecord(input)) return null
  const id = numberValue(input.id)
  const name = stringValue(input.name)
  const relation = stringValue(input.relation)
  if (!id || !name || !relation) return null
  return { id, name, relation, episodes: stringValue(input.eps) }
}

async function getAllEpisodes(subjectId: number): Promise<unknown[]> {
  const limit = 100
  const maxPages = 20
  const items: unknown[] = []
  const seenEpisodeIds = new Set<number>()
  let offset = 0
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await optionalRequest(`${BANGUMI_API}/v0/episodes?subject_id=${subjectId}&type=0&limit=${limit}&offset=${offset}`, { data: [], total: 0 })
    if (!isRecord(payload) || !Array.isArray(payload.data)) break
    const uniquePageItems = payload.data.filter((item) => {
      const episodeId = isRecord(item) ? numberValue(item.id) : 0
      if (!episodeId || seenEpisodeIds.has(episodeId)) return false
      seenEpisodeIds.add(episodeId)
      return true
    })
    items.push(...uniquePageItems)
    const total = numberValue(payload.total)
    if (!payload.data.length || !uniquePageItems.length || payload.data.length < limit || (total > 0 && seenEpisodeIds.size >= total)) break
    offset += payload.data.length
  }
  return items
}

function isPrimaryCharacterRelation(relation: string): boolean {
  return relation.replace(/\s+/g, "") === "主角" || relation.replace(/\s+/g, "") === "配角"
}

function parseRelatedSubject(input: unknown): BangumiRelatedSubject | null {
  if (!isRecord(input)) return null
  const id = numberValue(input.id)
  const name = stringValue(input.name)
  if (!id || !name) return null
  const images = isRecord(input.images) ? input.images : {}
  return {
    id,
    name,
    nameCn: stringValue(input.name_cn),
    relation: stringValue(input.relation) || "关联",
    type: numberValue(input.type),
    imageUrl: stringValue(images.common) || stringValue(images.medium) || undefined,
  }
}

function parseInfobox(infobox: unknown[]): BangumiInfoItem[] {
  return infobox.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const key = stringValue(entry.key)
    const value = flattenInfoValue(entry.value)
    return key && value ? [{ key, value }] : []
  })
}

function flattenInfoValue(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (!Array.isArray(value)) return ""
  return value.map((item) => isRecord(item) ? stringValue(item.v) : stringValue(item)).filter(Boolean).join(" / ")
}

function readInfoValues(infobox: BangumiInfoItem[], keys: string[]): string[] {
  return infobox.filter((item) => keys.includes(item.key)).flatMap((item) => item.value.split(" / ")).map((item) => item.trim()).filter(Boolean)
}

async function requestJson(url: string, options: { method?: "GET" | "POST" | "PATCH" | "PUT"; body?: string; notFoundAsNull?: boolean } = {}) {
  const auth = await ensureAuth()
  const headers = auth?.accessToken ? { ...REQUEST_HEADERS, Authorization: `Bearer ${auth.accessToken}` } : REQUEST_HEADERS
  const response = await fetch(url, { method: options.method || "GET", headers, body: options.body })
  if (response.status === 401 && auth?.refreshToken) {
    const refreshed = await refreshAuth(auth.refreshToken)
    if (refreshed) {
      const retryHeaders = { ...REQUEST_HEADERS, Authorization: `Bearer ${refreshed.accessToken}` }
      const retryResponse = await fetch(url, { method: options.method || "GET", headers: retryHeaders, body: options.body })
      if (options.notFoundAsNull && retryResponse.status === 404) return null
      if (!retryResponse.ok) throw new Error(`Bangumi 请求失败（${retryResponse.status}）`)
      return readResponseBody(retryResponse)
    }
  }
  if (options.notFoundAsNull && response.status === 404) return null
  if (!response.ok) throw new Error(`Bangumi 请求失败（${response.status}）`)
  return readResponseBody(response)
}

async function optionalRequest(url: string, fallback: unknown) {
  try {
    return await requestJson(url)
  } catch (error) {
    console.warn(`Bangumi 扩展资料加载失败：${url}`, error)
    return fallback
  }
}

function isExactTitleMatch(query: string, subject: BangumiSubject): boolean {
  const normalizedQuery = comparableTitle(query)
  return [subject.name, subject.nameCn, ...subject.aliases].some((title) => comparableTitle(title) === normalizedQuery)
}

function comparableTitle(value: string): string {
  return cleanTitle(value).toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "")
}

function cleanTitle(value: string): string {
  return value
    .replace(/\s*[（(【\[]?(?:第\s*)?\d+(?:\.\d+)?\s*(?:季|期|部|章|篇)[）)】\]]?\s*$/u, "")
    .replace(/\s+(?:BD|OVA|OAD|SP)$/i, "")
    .trim()
}

function containsCjk(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value)
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

async function readResponseBody(response: { text: () => Promise<string> }): Promise<unknown> {
  const text = await response.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

type BangumiOAuthAuth = { accessToken: string; refreshToken: string; expiresAt: number }

function readString(key: string): string {
  const value = Storage.get<string>(key)
  return typeof value === "string" ? value.trim() : ""
}

function readAuth(): BangumiOAuthAuth | null {
  const raw = Storage.get<string>(BANGUMI_AUTH_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<BangumiOAuthAuth>
    const accessToken = typeof value.accessToken === "string" ? value.accessToken.trim() : ""
    const refreshToken = typeof value.refreshToken === "string" ? value.refreshToken.trim() : ""
    if (!accessToken && !refreshToken) return null
    return { accessToken, refreshToken, expiresAt: typeof value.expiresAt === "number" ? value.expiresAt : 0 }
  } catch {
    return null
  }
}

function getOAuthCallbackURL(): string {
  return Script.createRunSingleURLScheme(BANGUMI_SCRIPT_NAME, { oauth_callback: "1" })
}

function buildOAuthURLForClient(clientId: string, authDomain: string, callbackURL: string): string {
  if (!clientId.trim()) return ""
  return `https://${authDomain}/oauth/authorize?client_id=${encodeURIComponent(clientId.trim())}&response_type=code&redirect_uri=${encodeURIComponent(callbackURL)}`
}

function normalizeOAuthInput(input: Record<string, any> | string | null | undefined): Record<string, string> | null {
  if (!input) return null
  if (typeof input === "object") return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]))
  const rawQuery = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input
  return Object.fromEntries(rawQuery.split("&").filter(Boolean).map((part) => {
    const [key, ...rest] = part.split("=")
    return [decodeURIComponent(key), decodeURIComponent(rest.join("=").replace(/\+/g, " "))]
  }))
}

function normalizeAuth(input: any, fallbackRefreshToken = ""): BangumiOAuthAuth | null {
  if (!input || typeof input !== "object" || typeof input.access_token !== "string" || !input.access_token.trim()) return null
  const expiresIn = typeof input.expires_in === "number" && Number.isFinite(input.expires_in) ? input.expires_in : 0
  return {
    accessToken: input.access_token.trim(),
    refreshToken: typeof input.refresh_token === "string" && input.refresh_token.trim() ? input.refresh_token.trim() : fallbackRefreshToken,
    expiresAt: expiresIn > 0 ? Date.now() + expiresIn * 1000 : 0,
  }
}

async function ensureAuth(): Promise<BangumiOAuthAuth | null> {
  const auth = readAuth()
  if (!auth) return null
  if (!auth.accessToken) {
    if (!auth.refreshToken) return null
    return refreshAuth(auth.refreshToken)
  }
  if (!auth.expiresAt || auth.expiresAt > Date.now() + AUTH_REFRESH_SKEW_MS) return auth
  if (!auth.refreshToken) {
    Storage.remove(BANGUMI_AUTH_KEY)
    return null
  }
  const refreshed = await refreshAuth(auth.refreshToken)
  if (!refreshed) return null
  return refreshed
}

async function refreshAuth(refreshToken: string): Promise<BangumiOAuthAuth | null> {
  const preservedRefreshToken = refreshToken.trim()
  if (!preservedRefreshToken) return null
  const config = bangumiClient.getOAuthConfig()
  if (!config.clientId || !config.clientSecret) return null
  const response = await fetch(`https://${config.authDomain}/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: preservedRefreshToken, redirect_uri: config.callbackURL }) })
  if (!response.ok) return null
  const auth = normalizeAuth(await response.json(), preservedRefreshToken)
  if (auth) Storage.set(BANGUMI_AUTH_KEY, JSON.stringify(auth))
  return auth
}
