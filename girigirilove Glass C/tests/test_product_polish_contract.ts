import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [saved, download, search, setting, home, shelf, errorState, emptyState, localPlayer, detail] = await Promise.all([
    FileManager.readAsString(`${root}/page/saved/index.tsx`),
    FileManager.readAsString(`${root}/page/download/index.tsx`),
    FileManager.readAsString(`${root}/page/search/index.tsx`),
    FileManager.readAsString(`${root}/page/setting/index.tsx`),
    FileManager.readAsString(`${root}/page/home-screen.tsx`),
    FileManager.readAsString(`${root}/design-glass/shelf.tsx`),
    FileManager.readAsString(`${root}/page/components/error_state.tsx`),
    FileManager.readAsString(`${root}/page/components/empty_state.tsx`),
    FileManager.readAsString(`${root}/page/hanime/local_video_player.tsx`),
    FileManager.readAsString(`${root}/page/hanime/video_detail.tsx`),
  ])

  assert(saved.includes('LoadingState message="正在载入片库…"'), "片库缺少明确的首次加载状态")
  assert(saved.includes("!loading && !error && downloads.length === 0"), "片库错误与空状态必须互斥")
  assert(saved.includes("观看历史、续播记录与本机离线文件会保留"), "清空收藏必须说明保留范围")
  assert(saved.includes("同时移除全部剧集续播点") && saved.includes("收藏与本机离线文件会保留"), "清空观看记录必须说明影响范围")
  assert(saved.includes("function RecentResumeCard") && !saved.includes("<HanimeActionPill title={localItem"), "最近续播卡不得嵌套第二层交互 Glass")
  assert(saved.includes("<Button\n      {...glassListRowStyleProps}\n      action={onResume}"), "最近续播卡必须由整卡单一 Button 持有交互")

  assert(download.includes('LoadingState message="正在检查下载记录与本机文件…"'), "下载页缺少首次加载状态")
  assert(download.includes("!loading && !error && tasks.length === 0"), "下载页错误与空状态必须互斥")
  assert(download.includes("正在封装 MP4 · ${percent}%"), "封装阶段必须显示真实进度语义")
  assert(!shelf.includes("vertical: 4"), "海报货架不得重复计算垂直 padding")

  assert(search.includes("const bangumiRequestId = useRef(0)"), "Bangumi 搜索缺少 latest-request-wins 标识")
  assert(search.includes('label={<Label title="清空搜索记录"'), "搜索记录清理必须使用原位确认菜单")
  assert(setting.includes("同时移除全部剧集续播点"), "设置页清理说明必须覆盖续播点")
  assert(home.includes('selectedIcon: "magnifyingglass.circle.fill"'), "Home 搜索标签必须提供非颜色选中图标变体")

  assert(errorState.includes('title = "暂时无法载入内容"'), "通用错误状态必须使用中性正式标题")
  assert(!errorState.includes("可能是网络波动或站点验证"), "通用错误状态不得错误归因为站点验证")
  assert(!errorState.includes("lineLimit={2}") && !emptyState.includes("lineLimit={4}"), "通用状态说明不得以固定行数裁切长文案")
  assert(localPlayer.includes("const [deleting, setDeleting]"), "本机文件删除缺少重复提交保护")
  assert(localPlayer.includes('title: "无法删除本机文件"'), "本机文件删除缺少正式失败反馈")
  assert(detail.includes('title: savedAsHLS ? "HLS 离线播放包已保存" : "视频已保存为 MP4"'), "下载成功反馈必须准确区分 MP4 与 HLS")

  console.log(JSON.stringify({
    stateModel: "loading / error / content / empty",
    destructiveCopy: "scope disclosed",
    visualOwnership: "single interactive resume row",
    copyTone: "formal and actionable",
  }))
}

main()
  .catch(error => {
    console.error(error)
    throw error
  })
  .finally(() => Script.exit())
