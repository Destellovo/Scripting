import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [detail, appearance, settings, saved, download, localPlayer, designIndex] = await Promise.all([
    FileManager.readAsString(`${root}/page/hanime/video_detail.tsx`),
    FileManager.readAsString(`${root}/page/setting/background-appearance-editor.tsx`),
    FileManager.readAsString(`${root}/page/setting/index.tsx`),
    FileManager.readAsString(`${root}/page/saved/index.tsx`),
    FileManager.readAsString(`${root}/page/download/index.tsx`),
    FileManager.readAsString(`${root}/page/hanime/local_video_player.tsx`),
    FileManager.readAsString(`${root}/design-glass/index.ts`),
  ])
  const production = [detail, appearance, settings, saved, download, localPlayer].join("\n")

  assert(!designIndex.includes("themed-dialog"), "不得保留错误的独立主题模态层")
  assert(!production.includes("themedDialog"), "生产页面不得调用独立主题模态")
  assert(!production.includes("Dialog.actionSheet"), "选项型入口不得使用脱离触发按钮的 actionSheet")
  assert(!production.includes("Dialog.confirm"), "确认型入口必须由原触发按钮 Menu 展开")

  assert(detail.includes('<Menu\n              label={(\n                <SystemPlayPrimaryButton'), "主播放按钮必须直接成为 Menu owner")
  assert(detail.includes('accessibilityLabel="播放，展开话数选择"'), "主播放菜单缺少明确辅助功能语义")
  assert(detail.includes('glassEffectTransition="materialize"'), "播放菜单必须使用 materialize 形变")
  assert(detail.includes('<Menu key={getDownloadKey(item.videoCode, source)} title={`${source.label} · 已下载`}'), "已下载话数必须在播放菜单内展开本机/在线子菜单")
  assert(detail.includes('accessibilityLabel={`${episode.label}，已下载，展开播放方式`}'), "已下载剧集按钮必须自身展开播放方式")

  assert(appearance.includes("<Menu"), "保存设置与主题管理必须使用 Menu")
  assert(appearance.includes("保存自定义设置"), "缺少保存自定义设置触发按钮")
  assert(appearance.includes('glassEffectTransition="materialize"'), "主题菜单必须由按钮 materialize 形变")
  assert(!appearance.includes("themedDialog.actionSheet"), "主题入口不得打开独立动作弹窗")

  assert(settings.includes('<Menu\n            label={<SettingActionRow icon="play.rectangle.on.rectangle"'), "默认播放器行必须直接成为 Menu owner")
  assert(settings.includes("EXTERNAL_PLAYERS.map"), "默认播放器菜单必须包含全部播放器")
  assert(settings.includes('accessibilityLabel="清空观看与搜索记录，展开确认选项"'), "本机数据清理必须由原行展开确认")

  assert(saved.includes("确认清空"), "片库清理菜单缺少显式确认项")
  assert(download.includes("确认删除临时数据"), "下载任务菜单缺少显式确认项")
  assert(localPlayer.includes("确认删除本机文件"), "本地播放器删除菜单缺少显式确认项")

  console.log(JSON.stringify({
    independentThemedModal: false,
    systemActionSheets: 0,
    systemConfirms: 0,
    menuOwners: ["play button", "downloaded episode", "save theme", "saved theme", "default player", "destructive rows"],
    transition: "materialize",
  }))
}

main()
  .catch(error => {
    console.error(error)
    throw error
  })
  .finally(() => Script.exit())
