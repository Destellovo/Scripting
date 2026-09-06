import {
  Button,
  HStack,
  Image,
  List,
  Menu,
  NavigationLink,
  Script,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
  useEffect,
  useState,
} from "scripting"
import { hanimeDatabase, HanimeStats } from "../../class/hanime_database"
import { EXTERNAL_PLAYERS, ExternalPlayerID, getExternalPlayer, setDefaultExternalPlayerID } from "../../class/external_player"
import { getHomeScreenExpandedTabs, setHomeScreenExpandedTabs } from "../../class/home_screen_preferences"
import {
  glassEffectFor,
  glassListRowStyleProps,
  GlassListRow,
  GlassSurface,
  ShelfHeader,
} from "../../design-glass"
import { BackgroundAppearanceEditor } from "./background-appearance-editor"
import { BangumiOAuthView } from "./bangumi_oauth"
import { ChangelogView } from "./changelog"

// 所有设置行共用固定图标列，确保标题与说明从同一条垂直基线开始。
const SETTING_ICON_COLUMN_WIDTH = 32
const SETTING_ROW_GAP = 14
export function SettingView(props: { homeScreen?: boolean; onHomeScreenNavigationChanged?: (enabled: boolean) => void } = {}) {
  const [stats, setStats] = useState<HanimeStats>({ favorites: 0, history: 0, downloads: 0 })
  const [loading, setLoading] = useState(true)
  const [defaultPlayerTitle, setDefaultPlayerTitle] = useState(() => getExternalPlayer().title)
  const [homeScreenExpandedTabs, setHomeScreenExpandedTabsState] = useState(() => getHomeScreenExpandedTabs())

  useEffect(() => {
    void loadStats()
  }, [])

  async function loadStats() {
    try {
      setLoading(true)
      setStats(await hanimeDatabase.getStats())
    } catch (error) {
      console.error("加载 GiriGiri 设置统计失败:", error)
    } finally {
      setLoading(false)
    }
  }

  function updateHomeScreenNavigation(enabled: boolean) {
    setHomeScreenExpandedTabs(enabled)
    setHomeScreenExpandedTabsState(enabled)
    props.onHomeScreenNavigationChanged?.(enabled)
  }

  function selectDefaultPlayer(id: ExternalPlayerID) {
    setDefaultExternalPlayerID(id)
    setDefaultPlayerTitle(getExternalPlayer(id).title)
  }

  async function clearLocalData() {
    try {
      await hanimeDatabase.clearHistory()
      await hanimeDatabase.clearSearchHistory()
      await loadStats()
    } catch (clearError) {
      console.error("清理 GiriGiri 本机记录失败:", clearError)
      await Dialog.alert({ title: "无法清空本机记录", message: "观看记录、续播点或搜索记录未能完整清除。请稍后重试。" })
      await loadStats()
    }
  }

  return (
    <List
      listStyle="inset"
      listRowSpacing={10}
      listSectionSpacing={24}
      scrollContentBackground="hidden"
      scrollEdgeEffectHidden={{ edges: "top", hidden: props.homeScreen === true }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle={props.homeScreen ? "" : "设置"}
      navigationBarTitleDisplayMode={props.homeScreen ? "inline" : "large"}
      onAppear={() => {
        void loadStats()
        setDefaultPlayerTitle(getExternalPlayer().title)
        setHomeScreenExpandedTabsState(getHomeScreenExpandedTabs())
      }}
    >
      <Section>
        <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <SettingMetric icon="heart.fill" title="收藏" value={loading ? "—" : `${stats.favorites}`} />
          <SettingMetric icon="clock.fill" title="历史" value={loading ? "—" : `${stats.history}`} />
          <SettingMetric icon="tray.fill" title="本机" value={loading ? "—" : `${stats.downloads}`} />
        </HStack>
      </Section>

      <Section>
        <VStack
          alignment="leading"
          spacing={10}
          frame={{ maxWidth: "infinity", alignment: "leading" }}
          listRowBackground={<></>}
          listRowSeparator="hidden"
        >
          <BackgroundAppearanceEditor />
        </VStack>
      </Section>

      <Section>
        <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <ShelfHeader title="首页导航" caption={homeScreenExpandedTabs ? "当前：顶部标签" : "当前：折叠菜单"} />
          <GlassListRow>
            <HStack alignment="center" spacing={SETTING_ROW_GAP} padding={{ vertical: 8 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <SettingSymbol icon="wind" tint="label" />
              <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="subheadline" fontWeight="semibold">顶部标签</Text>
                <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3} multilineTextAlignment="leading">
                  {homeScreenExpandedTabs ? "在 Scripting 首页顶部直接显示五个页面入口；只影响 Scripting 首页。" : "在 Scripting 首页使用单一折叠菜单切换页面；只影响 Scripting 首页。"}
                </Text>
              </VStack>
              <Toggle
                title="顶部标签"
                value={homeScreenExpandedTabs}
                onChanged={updateHomeScreenNavigation}
                labelsHidden={true}
                accessibilityLabel={homeScreenExpandedTabs ? "首页顶部标签，已开启" : "首页折叠菜单，已开启"}
                accessibilityHint="不改变单独打开脚本时的底部标签页。"
              />
            </HStack>
          </GlassListRow>
        </VStack>
      </Section>

      <Section>
        <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <ShelfHeader title="播放" caption={`默认：${defaultPlayerTitle}`} />
          <Menu
            label={<SettingActionRow icon="play.rectangle.on.rectangle" iconTint="secondaryLabel" title="默认播放器" subtitle={`当前使用 ${defaultPlayerTitle}。点按可选择其他可用播放器。`} />}
            {...glassListRowStyleProps}
            menuIndicator="hidden"
            menuStyle="button"
            buttonStyle="plain"
            glassEffectTransition="materialize"
            accessibilityLabel={`默认播放器，当前为 ${defaultPlayerTitle}，展开播放器选项`}
          >
            {EXTERNAL_PLAYERS.map(player => (
              <Button
                key={player.id}
                title={player.title}
                systemImage={player.title === defaultPlayerTitle ? "checkmark" : player.systemImage}
                action={() => selectDefaultPlayer(player.id)}
              />
            ))}
            <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
          </Menu>
        </VStack>
      </Section>

      <Section>
        <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <ShelfHeader title="Bangumi 账号" caption="OAuth 授权与进度同步" />
          <NavigationLink {...glassListRowStyleProps} destination={<BangumiOAuthView />} accessibilityLabel="打开 Bangumi 授权配置">
            <SettingActionRow icon="key" iconTint="secondaryLabel" title="账号授权" subtitle="配置 Bangumi 开发者应用并连接账号，同步收藏状态与追番进度。" />
          </NavigationLink>
        </VStack>
      </Section>

      <Section>
        <ShelfHeader title="本机数据" />
        <Menu
          label={<SettingActionRow icon="trash.circle" title="清空观看与搜索记录" subtitle="同时移除全部剧集续播点；收藏与本机离线文件会保留。" destructive />}
          {...glassListRowStyleProps}
          menuIndicator="hidden"
          menuStyle="button"
          buttonStyle="plain"
          glassEffectTransition="materialize"
          accessibilityLabel="清空观看与搜索记录，展开确认选项"
        >
          <Button title="同时移除全部剧集续播点" systemImage="clock.badge.xmark" disabled action={() => {}} />
          <Button title="收藏与本机离线文件会保留" systemImage="info.circle" disabled action={() => {}} />
          <Button title="确认清空观看与搜索记录" systemImage="trash" role="destructive" action={() => { void clearLocalData() }} />
          <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
        </Menu>
      </Section>

      <Section>
        <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <ShelfHeader title="关于" caption={`版本 ${Script.metadata.version}`} />
          <NavigationLink {...glassListRowStyleProps} destination={<ChangelogView />} accessibilityLabel={`更新日志，当前版本 ${Script.metadata.version}`}>
            <SettingActionRow icon="doc.text.magnifyingglass" iconTint="secondaryLabel" title="更新日志" subtitle={`查看版本 ${Script.metadata.version} 的功能更新与体验改进。`} />
          </NavigationLink>
        </VStack>
        <GlassListRow>
          <CapabilityCard
            icon="sparkles"
            title="当前能力"
            subtitle="支持 GiriGiri 内容浏览与搜索、双来源新番时间表、系统及第三方播放器、剧集离线保存、收藏、观看记录与续播；同时提供 Bangumi 授权、条目资料、系统翻译、进度同步和自定义 Glass 背景。"
            tint="label"
          />
        </GlassListRow>
        <GlassListRow>
          <CapabilityCard
            icon="info.circle"
            title="免责声明"
            subtitle="本脚本是独立第三方浏览工具，不托管或分发媒体。内容与服务由相应站点提供，可能随网络或站点调整而变化；请仅访问和保存你有权使用的内容，并遵守所在地法律与站点规则。"
            tint="secondaryLabel"
          />
        </GlassListRow>
      </Section>

      <Section>
        <Button
          {...glassListRowStyleProps}
          action={() => { void Safari.openURL("https://github.com/OkadaMei/Scripting") }}
          buttonStyle="plain"
          accessibilityLabel="作者瀬戸 明日葉，打开 Scripting GitHub 仓库"
        >
          <SettingInfoRowContent icon="person.crop.circle" title="作者" value="瀬戸 明日葉" trailingIcon="arrow.up.right" />
        </Button>
        <SettingInfoRow icon="number" title="版本" value={Script.metadata.version} />
        <SettingInfoRow icon="app.badge" title="脚本" value={Script.metadata.localizedName} />
      </Section>
    </List>
  )
}

function SettingMetric({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <VStack alignment="leading" spacing={2} frame={{ alignment: "leading" }}>
      <HStack alignment="center" spacing={4}>
        <Image systemName={icon} font="caption2" foregroundStyle="secondaryLabel" />
        <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{title}</Text>
      </HStack>
      <Text font="headline" fontWeight="semibold" foregroundStyle="label" lineLimit={1}>{value}</Text>
    </VStack>
  )
}

function SettingInfoRow({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <GlassListRow>
      <SettingInfoRowContent icon={icon} title={title} value={value} />
    </GlassListRow>
  )
}

function SettingInfoRowContent({ icon, title, value, trailingIcon }: { icon: string; title: string; value: string; trailingIcon?: string }) {
  return (
    <HStack spacing={SETTING_ROW_GAP} padding={{ vertical: 6 }}>
      <SettingSymbol icon={icon} tint="secondaryLabel" />
      <Text font="body">{title}</Text>
      <Spacer />
      <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{value}</Text>
      {trailingIcon ? <Image systemName={trailingIcon} font="caption" foregroundStyle="secondaryLabel" /> : null}
    </HStack>
  )
}

function CapabilityCard({ icon, title, subtitle, tint }: { icon: string; title: string; subtitle: string; tint: SettingSymbolTint }) {
  return (
    <HStack alignment="center" spacing={SETTING_ROW_GAP} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ vertical: 8 }}>
      <SettingSymbol icon={icon} tint={tint} />
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold">{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={8} multilineTextAlignment="leading">
          {subtitle}
        </Text>
      </VStack>
    </HStack>
  )
}

export function SettingActionRow({ icon, iconTint, title, subtitle, destructive = false }: { icon: string; iconTint?: SettingSymbolTint; title: string; subtitle?: string; destructive?: boolean }) {
  return (
    <HStack alignment="center" spacing={SETTING_ROW_GAP} padding={{ vertical: 8 }}>
      <SettingSymbol icon={icon} tint={destructive ? "danger" : iconTint || "label"} />
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold" foregroundStyle={destructive ? "systemRed" : "label"}>{title}</Text>
        {subtitle ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={4} multilineTextAlignment="leading">{subtitle}</Text> : null}
      </VStack>
    </HStack>
  )
}

type SettingSymbolTint = "label" | "secondaryLabel" | "danger"

function SettingSymbol({ icon, tint }: { icon: string; tint: SettingSymbolTint }) {
  return (
    <Image
      systemName={icon}
      font="title3"
      frame={{ width: SETTING_ICON_COLUMN_WIDTH, maxHeight: "infinity", alignment: "center" }}
      foregroundStyle={tint === "danger" ? "systemRed" : tint}
    />
  )
}
