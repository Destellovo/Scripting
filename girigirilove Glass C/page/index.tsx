import {
  Button,
  Image,
  Navigation,
  NavigationStack,
  Script,
  Tab,
  TabView,
  Toolbar,
  ZStack,
  ToolbarItem,
  useEffect,
  useObservable,
} from "scripting"
import { LibraryView } from "./library"
import { SavedView } from "./saved"
import { DownloadView } from "./download"
import { SearchView } from "./search"
import { SettingView } from "./setting"
import { PageBackground, type AppTab } from "../design-glass"

export function HomePage() {
  const selection = useObservable("discover" as AppTab)
  const dismissView = Navigation.useDismiss()
  const supportsMinimization = Script.supportsMinimization()

  function handleClose() {
    dismissView("close")
  }

  async function handleMinimize() {
    if (!supportsMinimization) return
    if (Script.isMinimized()) return

    const success = await Script.minimize()
    if (!success) {
      console.log("GiriGiri 最小化未执行")
    }
  }

  useEffect(() => {
    const removeResume = Script.onResume((details) => {
      if (details.resumeFromMinimized) {
        console.log("GiriGiri 从最小化恢复")
      }
    })

    return () => {
      removeResume()
    }
  }, [])

  const chromeToolbar = (
    <Toolbar>
      <ToolbarItem placement="topBarLeading" sharedBackgroundVisibility="visible">
        <Button title="关闭" systemImage="xmark" action={handleClose} buttonStyle="plain" frame={{ minWidth: 44, minHeight: 44 }} />
      </ToolbarItem>

      {supportsMinimization && (
        <ToolbarItem placement="topBarTrailing" sharedBackgroundVisibility="visible">
          <Button title="最小化" systemImage="arrow.down.right.and.arrow.up.left" action={handleMinimize} buttonStyle="plain" frame={{ minWidth: 44, minHeight: 44 }} />
        </ToolbarItem>
      )}
    </Toolbar>
  )

  return (
    <NavigationStack>
      <TabView
        selection={selection as any}
        tint="systemPink"
        tabViewStyle="sidebarAdaptable"
        tabBarMinimizeBehavior="onScrollDown"
        toolbar={chromeToolbar}
      >
        <Tab title="浏览" systemImage="house.fill" value={"discover" as AppTab}>
          <NavigationStack>
            <ZStack>
              <PageBackground />
              <LibraryView />
            </ZStack>
          </NavigationStack>
        </Tab>

        <Tab title="搜索" systemImage="magnifyingglass" value={"search" as AppTab} role="search">
          <NavigationStack>
            <ZStack>
              <PageBackground />
              <SearchView />
            </ZStack>
          </NavigationStack>
        </Tab>

        <Tab title="片库" systemImage="rectangle.stack.fill" value={"library" as AppTab}>
          <NavigationStack>
            <ZStack>
              <PageBackground />
              <SavedView />
            </ZStack>
          </NavigationStack>
        </Tab>

        <Tab title="下载" systemImage="arrow.down.circle.fill" value={"downloads" as AppTab}>
          <NavigationStack>
            <ZStack>
              <PageBackground />
              <DownloadView />
            </ZStack>
          </NavigationStack>
        </Tab>

        <Tab title="设置" systemImage="gear" value={"settings" as AppTab}>
          <NavigationStack>
            <ZStack>
              <PageBackground />
              <SettingView />
            </ZStack>
          </NavigationStack>
        </Tab>
      </TabView>
    </NavigationStack>
  )
}
