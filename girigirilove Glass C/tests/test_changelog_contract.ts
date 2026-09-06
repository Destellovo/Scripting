import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [scriptJSON, changelog, setting] = await Promise.all([
    FileManager.readAsString(`${root}/script.json`),
    FileManager.readAsString(`${root}/page/setting/changelog.tsx`),
    FileManager.readAsString(`${root}/page/setting/index.tsx`),
  ])
  const metadata = JSON.parse(scriptJSON)

  assert(metadata.version === "5.1.1", `脚本版本应为 5.1.1，实际为 ${metadata.version}`)
  assert(changelog.includes('version: "5.1.1"'), "更新日志缺少 5.1.1 版本记录")
  assert(changelog.includes('date: "2026年8月6日"'), "5.1.1 更新日志缺少发布日期")
  for (const topic of [
    "搜索结果导航体验优化",
    "优化搜索结果卡片呈现",
    "提升卡片点击准确性",
    "修复详情页返回异常",
  ]) {
    assert(changelog.includes(topic), `5.1.1 更新日志缺少内容：${topic}`)
  }
  assert(changelog.includes('version: "5.1.0"'), "更新日志未保留 5.1.0 历史版本记录")
  assert(changelog.includes('date: "2026年8月4日"'), "5.1.0 更新日志缺少发布日期")
  for (const topic of [
    "适配 Scripting 首页默认界面",
    "统一原位形变菜单",
    "重整播放选择流程",
    "完善 Glass 外观一致性",
    "强化首页滚动与标题边界",
    "保持数据与业务兼容",
  ]) {
    assert(changelog.includes(topic), `5.1.0 更新日志缺少内容：${topic}`)
  }

  assert(changelog.includes("<PageBackground />") || changelog.includes("background={<PageBackground />}") , "更新日志页面必须复用当前主题背景")
  assert(changelog.includes("<GlassListRow>"), "更新日志条目必须使用项目 Glass 行")
  assert(changelog.includes("<ShelfHeader"), "更新日志版本标题必须复用 ShelfHeader")
  assert(changelog.includes('foregroundStyle="secondaryLabel"'), "更新日志说明必须使用系统语义色")
  for (const icon of [
    "rectangle.grid.2x2.fill",
    "hand.tap.fill",
    "arrow.uturn.backward.circle.fill",
    "house.and.flag.fill",
    "square.3.layers.3d.down.right",
    "play.rectangle.on.rectangle.fill",
    "paintpalette.fill",
    "scroll.fill",
    "checkmark.shield.fill",
  ]) {
    assert(changelog.includes(`icon: "${icon}"`), `更新日志条目缺少 SF Symbol：${icon}`)
  }
  assert(!changelog.includes('icon: "rectangle.stack.badge.checkmark"'), "不得继续使用当前系统无法显示的 SF Symbol")
  assert(changelog.includes("function ChangelogSymbol"), "更新日志必须统一复用图标槽")
  assert(changelog.includes('frame={{ width: 36, maxHeight: "infinity", alignment: "center" }}'), "SF Symbol 图标槽必须占满整行高度并垂直居中")
  assert(changelog.includes('<ChangelogSymbol systemName="sparkles"'), "摘要卡 SF Symbol 也必须使用居中图标槽")
  assert(changelog.includes("<ChangelogSymbol systemName={item.icon} />"), "每条更新日志都必须显示 SF Symbol")
  assert(setting.includes('import { ChangelogView } from "./changelog"'), "设置页未导入更新日志页面")
  assert(setting.includes("destination={<ChangelogView />}"), "设置页关于分区未接入更新日志入口")
  assert(setting.includes('title="更新日志"'), "更新日志入口缺少明确标题")
  assert(setting.includes("Script.metadata.version"), "设置页版本展示必须跟随脚本元数据")

  console.log(JSON.stringify({
    version: metadata.version,
    releases: 2,
    entries: 9,
    surface: "PageBackground + ShelfHeader + GlassListRow + centered symbol slot",
    entryPoint: "Settings / About",
  }))
}

main()
  .catch(error => {
    console.error(error)
    throw error
  })
  .finally(() => Script.exit())
