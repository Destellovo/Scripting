import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [entry, shell, preferences, setting, library, search, saved, download] = await Promise.all([
    FileManager.readAsString(`${root}/home_screen_default_ui.tsx`),
    FileManager.readAsString(`${root}/page/home-screen.tsx`),
    FileManager.readAsString(`${root}/class/home_screen_preferences.ts`),
    FileManager.readAsString(`${root}/page/setting/index.tsx`),
    FileManager.readAsString(`${root}/page/library/index.tsx`),
    FileManager.readAsString(`${root}/page/search/index.tsx`),
    FileManager.readAsString(`${root}/page/saved/index.tsx`),
    FileManager.readAsString(`${root}/page/download/index.tsx`),
  ])

  assert(entry.includes('import { NavigationStack } from "scripting"'), "Home 默认入口必须显式导入 NavigationStack")
  assert(entry.includes("<NavigationStack>"), "Home 默认入口必须显式提供唯一导航栈")
  assert(entry.includes("<BackgroundThemeProvider>"), "Home 默认入口必须复用主题 Provider")
  assert(entry.includes('from "./page/home-screen"'), "Home 默认入口必须复用无入口副作用的 Home shell")
  assert(!entry.includes('from "./index"'), "Home 默认入口不得导入独立运行入口")
  for (const forbidden of ["Navigation.present", "Script.exit", "Script.minimize", "useDismiss"]) {
    assert(!entry.includes(forbidden) && !shell.includes(forbidden), `Home UI 不得包含独立运行副作用：${forbidden}`)
  }

  for (const page of ['value: "discover"', 'value: "search"', 'value: "library"', 'value: "downloads"', 'value: "settings"']) {
    assert(shell.includes(page), `Home UI 缺少稳定页面 identity：${page}`)
  }
  assert(shell.includes('pickerStyle="segmented"'), "展开模式必须使用系统 segmented Picker")
  assert(shell.includes("? { principal: pagePicker }"), "展开模式 Picker 必须位于 principal")
  assert(shell.includes(": { topBarLeading: collapsedMenu }"), "折叠模式必须使用 topBarLeading Menu")
  assert(!shell.includes("topBarTrailing"), "Home shell 不得占用宿主三点菜单的 topBarTrailing")
  assert(shell.includes('withTintColor(color, "alwaysOriginal")'), "Picker 必须保留 SF Symbol 原始红色选中渲染")
  assert(shell.includes("selectedIcon"), "选中状态必须同时使用 SF Symbol 变体")
  assert(shell.includes("，已选择"), "选中页面必须提供 VoiceOver 状态")
  assert(shell.includes("useObservable<AppTab>"), "Home 页面选择必须使用 observable")
  assert(shell.includes("expandedTabs.setValue(enabled)"), "工具栏模式修改后必须立即更新 observable")

  assert(preferences.includes('girigirilove_glass_c_home_screen_expanded_tabs_v1'), "Home 模式必须使用本项目独占版本化 Storage key")
  assert(preferences.includes("Storage.get<boolean>"), "Home 模式必须从 Storage 恢复")
  assert(preferences.includes("Storage.set"), "Home 模式必须持久化")
  assert(setting.includes('<ShelfHeader title="首页导航"'), "设置页缺少首页导航分区")
  assert(setting.includes("<Toggle"), "设置页缺少顶部标签 / 折叠菜单开关")
  assert(setting.includes("只影响 Scripting 首页"), "设置说明必须明确不影响独立运行入口")
  assert(setting.includes("props.onHomeScreenNavigationChanged?.(enabled)"), "Home 设置切换必须即时通知稳定 shell")

  for (const [name, source] of [["浏览", library], ["搜索", search], ["片库", saved], ["下载", download], ["设置", setting]] as const) {
    assert(source.includes('scrollEdgeEffectHidden={{ edges: "top", hidden:'), `${name}页必须在真实滚动 owner 上隔离顶部 edge effect`)
    assert(source.includes('homeScreen ? ""') || source.includes('props.homeScreen ? ""'), `${name}页必须只在 Home 分支隐藏标题`)
  }

  console.log(JSON.stringify({
    navigationStack: "explicit",
    pages: 5,
    toolbarModes: ["principal segmented Picker", "topBarLeading Menu"],
    hostTrailingOwner: "reserved",
    preferenceKey: "girigirilove_glass_c_home_screen_expanded_tabs_v1",
    homeScrollEdgeOwners: 5,
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
