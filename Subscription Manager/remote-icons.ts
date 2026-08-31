import { fetch, Storage } from "scripting"

export type RemoteIcon = { name: string; url: string }
export type IconLibrary = { name?: string; description?: string; icons?: RemoteIcon[] }

export const DEFAULT_ICON_LIBRARY_URL = "https://raw.githubusercontent.com/Destellovo/icon/main/Scripting_icon.json"
const LIBRARIES_KEY = "subscription_manager_icon_libraries_v2"
const CACHE_KEY = "subscription_manager_remote_icons_cache_v2"

function validURL(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\//.test(value)
}

export async function loadIconLibraryURLs(): Promise<string[]> {
  try {
    const value = await Storage.get<string[]>(LIBRARIES_KEY, { shared: false })
    if (Array.isArray(value)) {
      const valid = value.filter(validURL)
      if (valid.length > 0) return valid
    }
  } catch { /* 使用默认图标库 */ }
  return [DEFAULT_ICON_LIBRARY_URL]
}

export async function saveIconLibraryURLs(urls: string[]): Promise<void> {
  const valid = Array.from(new Set(urls.filter(validURL)))
  const value = valid.length > 0 ? valid : [DEFAULT_ICON_LIBRARY_URL]
  await Storage.set(LIBRARIES_KEY, value, { shared: false })
}

export async function loadCachedRemoteIcons(): Promise<RemoteIcon[]> {
  try {
    const value = await Storage.get<RemoteIcon[]>(CACHE_KEY, { shared: false })
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export async function saveCachedRemoteIcons(icons: RemoteIcon[]): Promise<void> {
  await Storage.set(CACHE_KEY, icons, { shared: false })
}

export async function fetchIconLibrary(url: string): Promise<RemoteIcon[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`图标库请求失败：${response.status}`)
  const data = await response.json() as IconLibrary
  if (!Array.isArray(data.icons)) throw new Error("图标库格式错误：缺少 icons 数组")
  return data.icons.filter(icon => typeof icon?.name === "string" && validURL(icon?.url))
}

export async function fetchAllRemoteIcons(): Promise<RemoteIcon[]> {
  const result: RemoteIcon[] = []
  const urls = await loadIconLibraryURLs()
  for (const url of urls) {
    try { result.push(...await fetchIconLibrary(url)) }
    catch (error) { console.error("读取远程图标库失败", url, error) }
  }
  const seen = new Set<string>()
  const unique = result.filter(icon => {
    if (seen.has(icon.url)) return false
    seen.add(icon.url)
    return true
  })
  if (unique.length > 0) await saveCachedRemoteIcons(unique)
  return unique
}
