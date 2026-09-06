import {
  Button,
  Image,
  Menu,
  Picker,
  ProgressView,
  Text,
  VStack,
  ZStack,
  useEffect,
  useObservable,
} from "scripting"
import type { Color } from "scripting"
import { hanimeDatabase } from "../class/hanime_database"
import { hanimeDownloadManager } from "../class/hanime_download_manager"
import { getHomeScreenExpandedTabs, setHomeScreenExpandedTabs } from "../class/home_screen_preferences"
import { PageBackground, type AppTab } from "../design-glass"
import { DownloadView } from "./download"
import { LibraryView } from "./library"
import { SavedView } from "./saved"
import { SearchView } from "./search"
import { SettingView } from "./setting"

type HomeScreenPage = {
  value: AppTab
  title: string
  icon: string
  selectedIcon: string
}

const HOME_SCREEN_PAGES: ReadonlyArray<HomeScreenPage> = [
  { value: "discover", title: "浏览", icon: "house", selectedIcon: "house.fill" },
  { value: "search", title: "搜索", icon: "magnifyingglass", selectedIcon: "magnifyingglass.circle.fill" },
  { value: "library", title: "片库", icon: "rectangle.stack", selectedIcon: "rectangle.stack.fill" },
  { value: "downloads", title: "下载", icon: "arrow.down.circle", selectedIcon: "arrow.down.circle.fill" },
  { value: "settings", title: "设置", icon: "gearshape", selectedIcon: "gearshape.fill" },
]

function pickerSymbol(name: string, color: Color): UIImage {
  const symbol = UIImage.fromSFSymbol(name) ?? UIImage.fromSFSymbol("circle")!
  return symbol.withTintColor(color, "alwaysOriginal") ?? symbol
}

export function HomeScreenView() {
  const selectedPage = useObservable<AppTab>("discover")
  const expandedTabs = useObservable(() => getHomeScreenExpandedTabs())
  const ready = useObservable(false)
  const initializationError = useObservable<string | null>(null)
  const selected = selectedPage.value
  const selectedPageIndex = Math.max(0, HOME_SCREEN_PAGES.findIndex(page => page.value === selected))

  useEffect(() => {
    let active = true
    const initialize = async (): Promise<void> => {
      try {
        await hanimeDatabase.init()
        await hanimeDownloadManager.restorePendingTasks()
        if (active) ready.setValue(true)
      } catch (error) {
        console.error("初始化 GiriGiri Glass C 首页失败:", error)
        if (active) initializationError.setValue(`${error}`)
      }
    }
    void initialize()
    return () => { active = false }
  }, [])

  function selectPage(page: AppTab): void {
    if (page === selected) return
    HapticFeedback.selection()
    selectedPage.setValue(page)
  }

  function updateExpandedTabs(enabled: boolean): void {
    setHomeScreenExpandedTabs(enabled)
    expandedTabs.setValue(enabled)
  }

  const collapsedMenu = (
    <Menu
      label={<Image systemName="wind" foregroundStyle="label" font="title2" />}
      accessibilityLabel={`GiriGiri 页面，当前${HOME_SCREEN_PAGES[selectedPageIndex]?.title ?? "浏览"}`}
    >
      {HOME_SCREEN_PAGES.map(page => (
        <Button
          key={page.value}
          title={page.title}
          systemImage={selected === page.value ? "checkmark" : page.icon}
          action={() => selectPage(page.value)}
        />
      ))}
    </Menu>
  )

  const pagePicker = (
    <Picker
      title="页面"
      pickerStyle="segmented"
      tint="systemRed"
      value={selectedPageIndex}
      onChanged={(index: number) => {
        const page = HOME_SCREEN_PAGES[index]
        if (page) selectPage(page.value)
      }}
      frame={{ width: 300 }}
    >
      {HOME_SCREEN_PAGES.map((page, index) => {
        const isSelected = index === selectedPageIndex
        return (
          <Image
            key={page.value}
            tag={index}
            image={pickerSymbol(isSelected ? page.selectedIcon : page.icon, isSelected ? "systemRed" : "label")}
            renderingMode="original"
            contentTransition="symbolEffectReplace"
            accessibilityLabel={`${page.title}${isSelected ? "，已选择" : ""}`}
          />
        )
      })}
    </Picker>
  )

  const toolbar = expandedTabs.value
    ? { principal: pagePicker }
    : { topBarLeading: collapsedMenu }

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} toolbar={toolbar}>
      <PageBackground />
      {!ready.value && !initializationError.value ? <HomeScreenLoading /> : null}
      {initializationError.value ? <HomeScreenInitializationError message={initializationError.value} /> : null}
      {ready.value ? (
        <HomeScreenPageContent
          page={selected}
          onExpandedTabsChanged={updateExpandedTabs}
        />
      ) : null}
    </ZStack>
  )
}

function HomeScreenPageContent(props: {
  page: AppTab
  onExpandedTabsChanged: (enabled: boolean) => void
}) {
  if (props.page === "search") return <SearchView homeScreen />
  if (props.page === "library") return <SavedView homeScreen />
  if (props.page === "downloads") return <DownloadView homeScreen />
  if (props.page === "settings") {
    return <SettingView homeScreen onHomeScreenNavigationChanged={props.onExpandedTabsChanged} />
  }
  return <LibraryView homeScreen />
}

function HomeScreenLoading() {
  return (
    <VStack spacing={12} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}>
      <ProgressView />
      <Text font="subheadline" foregroundStyle="secondaryLabel">正在初始化 GiriGiri…</Text>
    </VStack>
  )
}

function HomeScreenInitializationError({ message }: { message: string }) {
  return (
    <VStack spacing={8} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }} padding={24}>
      <Image systemName="exclamationmark.triangle" font="title2" foregroundStyle="systemRed" />
      <Text font="headline">无法初始化 GiriGiri</Text>
      <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="center">{message}</Text>
    </VStack>
  )
}
