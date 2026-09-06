import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const detail = await FileManager.readAsString(`${root}/page/hanime/video_detail.tsx`)
  const primaryMenuStart = detail.indexOf("<SystemPlayPrimaryButton")
  const recentResumeStart = detail.indexOf('<ShelfHeader title="最近续播"', primaryMenuStart)
  assert(primaryMenuStart >= 0 && recentResumeStart > primaryMenuStart, "详情页缺少主播放原位菜单")
  const primaryMenu = detail.slice(primaryMenuStart, recentResumeStart)

  assert(primaryMenu.includes("(detail?.videoUrls || []).map"), "主播放菜单必须列出详情页解析到的全部剧集或线路")
  assert(primaryMenu.includes('title={`${source.label} · 已下载`}'), "主播放菜单必须为本机可用剧集提供非颜色状态提示")
  assert(primaryMenu.includes('title="播放本机版本"'), "已下载剧集必须提供本机播放入口")
  assert(primaryMenu.includes('title="在线播放"'), "已下载剧集必须保留在线播放入口")
  assert(primaryMenu.includes("playSourceOnline(source)"), "在线剧集必须进入既有播放流程")
  assert(detail.includes('glassEffectTransition="materialize"'), "主播放菜单必须由原触发控件 materialize 展开")
  assert(!detail.includes("Dialog.actionSheet"), "详情页不得恢复独立 action sheet 选集")
  assert(!detail.includes("chooseEpisodeForPlayback"), "详情页不得保留旧独立选集弹窗流程")
  assert(detail.includes("<EpisodeGrid") && detail.includes("onOpenOnline={playSourceOnline}") && detail.includes("onOpenLocal={playSourceLocally}"), "剧集网格必须直接处理所选剧集的本机与在线播放")

  console.log(JSON.stringify({
    primaryPlay: "materialized episode menu",
    downloadedEpisode: "local and online actions",
    explicitEpisodeGrid: "direct selected episode playback",
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
