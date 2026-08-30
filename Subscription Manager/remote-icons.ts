import { fetch, Storage } from "scripting"

export type RemoteIcon = { name: string; url: string }
export type IconLibrary = { name?: string; description?: string; icons?: RemoteIcon[] }

export const DEFAULT_ICON_LIBRARY_URL = "https://raw.githubusercontent.com/Destellovo/icon/main/KeLee_icon.json"
const LIBRARIES_KEY = "subscription_manager_icon_libraries_v1"

export function loadIconLibraryURLs(): string[] {
  try {
    const value = Storage.get<string[]>(LIBRARIES_KEY)
    if (Array.isArray(value)) {
      const valid = value.filter(url => typeof url === "string" && /^https:\/\//.test(url))
      if (valid.length > 0) return valid
    }
  } catch { /* 使用默认库 */ }
  return [DEFAULT_ICON_LIBRARY_URL]
}

export function saveIconLibraryURLs(urls: string[]): void {
  const valid = Array.from(new Set(urls.filter(url => typeof url === "string" && /^https:\/\//.test(url))))
  Storage.set(LIBRARIES_KEY, valid.length > 0 ? valid : [DEFAULT_ICON_LIBRARY_URL])
}

export async function fetchIconLibrary(url: string): Promise<RemoteIcon[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`图标库请求失败：${response.status}`)
  const data = await response.json() as IconLibrary
  if (!Array.isArray(data.icons)) throw new Error("图标库格式错误：缺少 icons 数组")
  return data.icons.filter(icon => typeof icon?.name === "string" && typeof icon?.url === "string" && /^https:\/\//.test(icon.url))
}

export async function fetchAllRemoteIcons(): Promise<RemoteIcon[]> {
  const result: RemoteIcon[] = []
  for (const url of loadIconLibraryURLs()) {
    try { result.push(...await fetchIconLibrary(url)) }
    catch (error) { console.error("读取远程图标库失败", url, error) }
  }
  const seen = new Set<string>()
  return result.filter(icon => {
    const key = `${icon.name}\n${icon.url}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
