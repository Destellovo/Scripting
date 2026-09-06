import {
  HStack,
  Image,
  List,
  Section,
  Text,
  VStack,
} from "scripting"
import {
  GlassListRow,
  PageBackground,
  ShelfHeader,
} from "../../design-glass"

type ChangelogItem = {
  icon: string
  title: string
  detail: string
}

type ChangelogRelease = {
  version: string
  date: string
  headline: string
  summary: string
  items: ReadonlyArray<ChangelogItem>
}

export const CHANGELOG_RELEASES: ReadonlyArray<ChangelogRelease> = [
  {
    version: "5.1.5",
    date: "2026年9月6日",
    headline: "修复脚本下载与自动更新连接",
    summary: "将发行包下载和自动更新切换到 jsDelivr，避免部分网络无法访问 raw.githubusercontent.com。",
    items: [
      {
        icon: "icloud.and.arrow.down.fill",
        title: "更换可靠下载地址",
        detail: "自动更新现使用 jsDelivr GitHub 镜像，发行包内容保持一致。",
      },
    ],
  },
  {
    version: "5.1.4",
    date: "2026年9月6日",
    headline: "修复按钮首次点击不响应",
    summary: "调整导航、滚动和 Glass 点击层级，解决按钮需要先下拉页面或重复点击才执行的问题。",
    items: [
      {
        icon: "hand.tap.fill",
        title: "恢复单次点击响应",
        detail: "移除与页面滚动竞争的标签栏自动收起手势，并避免重复 NavigationStack 叠加导航事件层。",
      },
      {
        icon: "rectangle.and.hand.point.up.left.fill",
        title: "统一按钮命中区域",
        detail: "整行按钮和导航入口使用至少 44 点高度及明确 contentShape，空白区域也能可靠响应。",
      },
      {
        icon: "circle.hexagongrid.fill",
        title: "分离 Glass 动画与点击识别",
        detail: "关闭附加在 Button 和 Menu 上的第二层交互式 Glass 手势，由原生控件单独处理点击，保留原有视觉样式。",
      },
    ],
  },
  {
    version: "5.1.3",
    date: "2026年9月6日",
    headline: "授权、数据一致性与容错修复",
    summary: "修复 Bangumi OAuth 回调与续期问题，并增强音乐库、播放列表、存储迁移和数据库清理的可靠性。",
    items: [
      {
        icon: "person.badge.key.fill",
        title: "修复 Bangumi OAuth 授权",
        detail: "回调脚本名称现与 GiriGiri Glass C 完全一致；支持仅凭刷新令牌恢复会话，并在刷新响应省略新令牌时保留原刷新令牌。",
      },
      {
        icon: "music.note.list",
        title: "保护音乐库与播放列表数据",
        detail: "更新音乐资料不再清空收藏和播放次数；删除歌曲或重复移除时会准确重算播放列表数量。",
      },
      {
        icon: "externaldrive.badge.checkmark",
        title: "增强数据库与存储容错",
        detail: "启用 Hanime 数据库外键，兼容清理历史孤儿记录，并在存储迁移失败时恢复原位置状态。",
      },
      {
        icon: "arrow.triangle.2.circlepath",
        title: "完善数据解析和自动更新",
        detail: "兼容 Bangumi 数字字符串并扩大收藏分页范围；自动更新切换到包含本次修复的发行包。",
      },
    ],
  },
  {
    version: "5.1.1",
    date: "2026年8月6日",
    headline: "搜索结果导航体验优化",
    summary: "本次更新重点提升搜索结果区域的交互准确性与页面返回体验，使内容浏览过程更加清晰、稳定。",
    items: [
      {
        icon: "rectangle.grid.2x2.fill",
        title: "优化搜索结果卡片呈现",
        detail: "移除搜索结果卡片之间的冗余方向指示，进一步简化网格视觉层级并突出内容封面与标题。",
      },
      {
        icon: "hand.tap.fill",
        title: "提升卡片点击准确性",
        detail: "重新划分每张搜索结果卡片的独立交互区域，避免相邻内容响应同一次点击。",
      },
      {
        icon: "arrow.uturn.backward.circle.fill",
        title: "修复详情页返回异常",
        detail: "优化搜索结果至详情页的导航机制，修复打开中间区域内容后需要连续返回多次的问题；现在返回一次即可回到搜索结果。",
      },
    ],
  },
  {
    version: "5.1.0",
    date: "2026年8月4日",
    headline: "Scripting 首页与原位形变交互",
    summary: "本次更新完善了 Scripting 首页适配，并统一播放选择、主题管理与数据清理等操作的 Glass 交互方式。", 
    items: [
      {
        icon: "house.and.flag.fill",
        title: "适配 Scripting 首页默认界面",
        detail: "新增包含五个页面入口的首页界面，支持顶部标签与折叠菜单即时切换，并保留宿主提供的右侧更多菜单。", 
      },
      {
        icon: "square.3.layers.3d.down.right",
        title: "统一原位形变菜单",
        detail: "播放、剧集、主题保存与管理、默认播放器和数据清理均由原触发控件直接展开，减少界面跳转并保持操作上下文。", 
      },
      {
        icon: "play.rectangle.on.rectangle.fill",
        title: "重整播放选择流程",
        detail: "主播放按钮可直接选择剧集或线路；已下载内容可选择本机播放或在线播放，并保留默认播放器与系统播放器回退。", 
      },
      {
        icon: "paintpalette.fill",
        title: "完善 Glass 外观一致性",
        detail: "自定义纯色、渐变和已保存主题管理统一采用整行 Glass 控件、透明 SF Symbol 与明确的当前状态提示。", 
      },
      {
        icon: "scroll.fill",
        title: "强化首页滚动与标题边界",
        detail: "Scripting 首页隐藏重复标题并优化顶部滚动边缘效果；单独运行脚本时继续保留原有底部标签页与系统行为。", 
      },
      {
        icon: "checkmark.shield.fill",
        title: "保持数据与业务兼容",
        detail: "收藏、观看记录、续播、下载记录与本机文件继续使用 GiriGiri Glass C 独立命名空间，不会读取或混入其他项目的数据。", 
      },
    ],
  },
]

export function ChangelogView() {
  return (
    <List
      listStyle="inset"
      listRowSpacing={10}
      listSectionSpacing={22}
      scrollContentBackground="hidden"
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle="更新日志"
      navigationBarTitleDisplayMode="inline"
      background={<PageBackground />}
    >
      {CHANGELOG_RELEASES.map(release => (
        <Section key={release.version}>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title={`版本 ${release.version}`} caption={release.date} />
            <GlassListRow>
              <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ vertical: 8 }}>
                <ChangelogSymbol systemName="sparkles" tint="systemPink" />
                <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="headline" fontWeight="bold" multilineTextAlignment="leading">{release.headline}</Text>
                  <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={5} multilineTextAlignment="leading">
                    {release.summary}
                  </Text>
                </VStack>
              </HStack>
            </GlassListRow>
            {release.items.map(item => <ChangelogRow key={item.title} item={item} />)}
          </VStack>
        </Section>
      ))}
    </List>
  )
}

function ChangelogSymbol({ systemName, tint = "secondaryLabel" }: { systemName: string; tint?: "systemPink" | "secondaryLabel" }) {
  return (
    <VStack frame={{ width: 36, maxHeight: "infinity", alignment: "center" }}>
      <Image systemName={systemName} font="title3" foregroundStyle={tint} frame={{ width: 36, alignment: "center" }} />
    </VStack>
  )
}

function ChangelogRow({ item }: { item: ChangelogItem }) {
  return (
    <GlassListRow>
      <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ vertical: 8 }}>
        <ChangelogSymbol systemName={item.icon} />
        <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="subheadline" fontWeight="semibold" multilineTextAlignment="leading">{item.title}</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={5} multilineTextAlignment="leading">{item.detail}</Text>
        </VStack>
      </HStack>
    </GlassListRow>
  )
}
