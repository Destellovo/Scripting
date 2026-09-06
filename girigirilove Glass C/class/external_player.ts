export type ExternalPlayerID =
  | "system"
  | "lenna"
  | "senplayer"
  | "infuse"
  | "fileball"
  | "vidhub"
  | "iina"
  | "nplayer"
  | "vlc"
  | "kmplayer"

export type ExternalPlayerDefinition = {
  id: ExternalPlayerID
  title: string
  systemImage: string
  scheme: string | null
  encodesURL: boolean
}

const DEFAULT_PLAYER_STORAGE_KEY = "girigiri_default_player_v1"
export const DEFAULT_EXTERNAL_PLAYER_ID: ExternalPlayerID = "system"

/**
 * URL Scheme 与糖心脚本的已验证播放器协议保持兼容；本项目使用稳定英文 ID 持久化，
 * 显示名称、图标与设置页布局则遵循 GiriGiri 自己的设计语言。
 */
export const EXTERNAL_PLAYERS: ReadonlyArray<ExternalPlayerDefinition> = [
  { id: "system", title: "系统播放器", systemImage: "play.rectangle", scheme: null, encodesURL: false },
  { id: "lenna", title: "Lenna", systemImage: "play.square", scheme: "lenna://x-callback-url/play?url=", encodesURL: true },
  { id: "senplayer", title: "SenPlayer", systemImage: "play.tv", scheme: "SenPlayer://x-callback-url/play?url=", encodesURL: true },
  { id: "infuse", title: "Infuse", systemImage: "flame", scheme: "infuse://x-callback-url/play?url=", encodesURL: true },
  { id: "fileball", title: "Fileball", systemImage: "folder", scheme: "filebox://play?url=", encodesURL: true },
  { id: "vidhub", title: "VidHub", systemImage: "rectangle.stack.badge.play", scheme: "vidhub://x-callback-url/play?url=", encodesURL: true },
  { id: "iina", title: "IINA", systemImage: "play.circle", scheme: "iina://weblink?url=", encodesURL: true },
  { id: "nplayer", title: "nPlayer", systemImage: "n.square", scheme: "nplayer-http://", encodesURL: false },
  { id: "vlc", title: "VLC", systemImage: "cone", scheme: "vlc://", encodesURL: false },
  { id: "kmplayer", title: "KMPlayer", systemImage: "k.square", scheme: "kmplayer://", encodesURL: false },
]

const validPlayerIDs = new Set<ExternalPlayerID>(EXTERNAL_PLAYERS.map((player) => player.id))

export function isExternalPlayerID(value: unknown): value is ExternalPlayerID {
  return typeof value === "string" && validPlayerIDs.has(value as ExternalPlayerID)
}

export function getDefaultExternalPlayerID(): ExternalPlayerID {
  const stored = Storage.get<string>(DEFAULT_PLAYER_STORAGE_KEY)
  return isExternalPlayerID(stored) ? stored : DEFAULT_EXTERNAL_PLAYER_ID
}

export function setDefaultExternalPlayerID(id: ExternalPlayerID): void {
  if (!isExternalPlayerID(id)) return
  Storage.set(DEFAULT_PLAYER_STORAGE_KEY, id)
}

export function getExternalPlayer(id: ExternalPlayerID = getDefaultExternalPlayerID()): ExternalPlayerDefinition {
  return EXTERNAL_PLAYERS.find((player) => player.id === id) ?? EXTERNAL_PLAYERS[0]
}

/** 系统播放器返回 null；第三方播放器返回可交给 Safari.openURL 的 URL Scheme。 */
export function buildExternalPlayerURL(videoURL: string, id: ExternalPlayerID = getDefaultExternalPlayerID()): string | null {
  const player = getExternalPlayer(id)
  if (!player.scheme) return null
  return player.scheme + (player.encodesURL ? encodeURIComponent(videoURL) : videoURL)
}
