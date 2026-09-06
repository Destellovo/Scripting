import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [adapter, settings, settingIndex, detail] = await Promise.all([
    FileManager.readAsString(`${root}/class/external_player.ts`),
    FileManager.readAsString(`${root}/page/setting/player-settings.tsx`),
    FileManager.readAsString(`${root}/page/setting/index.tsx`),
    FileManager.readAsString(`${root}/page/hanime/video_detail.tsx`),
  ])

  assert(adapter.includes('DEFAULT_EXTERNAL_PLAYER_ID: ExternalPlayerID = "system"'), "默认播放器必须安全回退为系统播放器")
  assert(adapter.includes('girigiri_default_player_v1'), "默认播放器必须使用本项目版本化 Storage key")
  const expectedSchemes = [
    "lenna://x-callback-url/play?url=",
    "SenPlayer://x-callback-url/play?url=",
    "infuse://x-callback-url/play?url=",
    "filebox://play?url=",
    "vidhub://x-callback-url/play?url=",
    "iina://weblink?url=",
    "nplayer-http://",
    "vlc://",
    "kmplayer://",
  ]
  for (const scheme of expectedSchemes) assert(adapter.includes(scheme), `缺少第三方播放器协议：${scheme}`)
  assert(adapter.includes("player.encodesURL ? encodeURIComponent(videoURL) : videoURL"), "外部播放器 URL 未按协议决定是否编码")

  assert(settings.includes('<ShelfHeader title="播放方式" caption="选择详情页默认使用的播放器" />'), "播放器设置页未复用本项目 ShelfHeader")
  assert(settings.includes("...glassListRowStyleProps"), "播放器选项未使用本项目整行 Glass 设计")
  assert(settings.includes('systemName={selected ? "checkmark.circle.fill" : "circle"}'), "默认播放器选中状态缺少形状线索")
  assert(settings.includes("当前默认播放器"), "默认播放器选项缺少 VoiceOver 当前状态")
  assert(!settings.includes("foregroundStyle={selected ? \"white\""), "播放器设置不得复制糖心的纯色胶囊设计")

  assert(settingIndex.includes('<ShelfHeader title="播放" caption={`默认：${defaultPlayerTitle}`} />'), "设置首页缺少播放器分区与当前摘要")
  assert(settingIndex.includes('label={<SettingActionRow icon="play.rectangle.on.rectangle"'), "设置首页默认播放器行必须直接成为 Menu owner")
  assert(settingIndex.includes("EXTERNAL_PLAYERS.map"), "设置首页原位菜单未列出全部播放器")
  assert(settingIndex.includes("setDefaultExternalPlayerID(id)"), "设置首页原位菜单未持久化默认播放器")
  assert(settingIndex.includes("setDefaultPlayerTitle(getExternalPlayer(id).title)"), "选择播放器后未即时刷新摘要")

  assert(detail.includes("buildExternalPlayerURL(resolved.url, defaultPlayer.id)"), "详情页未按默认播放器构造外部 URL")
  assert(detail.includes("await Safari.openURL(externalURL)"), "详情页未打开第三方播放器 URL Scheme")
  assert(detail.includes("将自动改用系统播放器打开当前话数"), "第三方播放器无法打开时缺少安全系统回退")
  assert(detail.includes('accessibilityLabel="播放，展开话数选择"'), "播放按钮未直接承载选集 Menu")
  assert(detail.includes("(detail?.videoUrls || []).map((source)"), "播放菜单未列出可用话数")
  assert(detail.includes("void playSourceOnline(source)"), "选定话数后未进入默认播放器流程")

  console.log(JSON.stringify({
    defaultPlayer: "system",
    externalPlayers: expectedSchemes.length,
    settingDesign: "ShelfHeader + full-row Glass + shape selection",
    playbackFlow: "episode first, then default player, system fallback",
  }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
