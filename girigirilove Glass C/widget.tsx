import { HStack, Image, Spacer, Text, VStack, Widget } from "scripting"
import { hanimeDatabase, HanimeLibraryItem, HanimeStats } from "./class/hanime_database"

const EMPTY_STATS: HanimeStats = { favorites: 0, history: 0, downloads: 0 }
const TRANSPARENT_SURFACE = {
  light: "rgba(255,255,255,0.34)",
  dark: "rgba(0,0,0,0.28)",
} as const
const TRANSPARENT_SUBTLE_SURFACE = {
  light: "rgba(255,255,255,0.20)",
  dark: "rgba(0,0,0,0.18)",
} as const
const WIDGET_BACKGROUND = {
  light: "rgba(255,245,249,0.96)",
  dark: "rgba(28,22,27,0.96)",
} as const

async function main() {
  const data = await loadWidgetData()
  Widget.present(
    <WidgetView
      stats={data.stats}
      recent={data.recent}
      transparent={Widget.isTransparentBackground}
    />,
  )
}

async function loadWidgetData(): Promise<{ stats: HanimeStats; recent: HanimeLibraryItem | null }> {
  try {
    await hanimeDatabase.init()
    const [stats, history] = await Promise.all([
      hanimeDatabase.getStats(),
      hanimeDatabase.getHistory(1),
    ])
    return { stats, recent: history[0] || null }
  } catch (error) {
    console.error("GiriGiri widget data failed:", error)
    return { stats: EMPTY_STATS, recent: null }
  }
}

function WidgetView({
  stats,
  recent,
  transparent,
}: {
  stats: HanimeStats
  recent: HanimeLibraryItem | null
  transparent: boolean
}) {
  const content = Widget.family === "systemSmall"
    ? <SmallHanimeWidget stats={stats} transparent={transparent} />
    : Widget.family === "systemLarge" || Widget.family === "systemExtraLarge"
      ? <LargeHanimeWidget stats={stats} recent={recent} transparent={transparent} />
      : <MediumHanimeWidget stats={stats} transparent={transparent} />

  return <WidgetRoot transparent={transparent}>{content}</WidgetRoot>
}

function WidgetRoot({ transparent, children }: { transparent: boolean; children?: any }) {
  if (transparent) {
    return (
      <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        {children}
      </VStack>
    )
  }

  return (
    <VStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={WIDGET_BACKGROUND}
    >
      {children}
    </VStack>
  )
}

function SmallHanimeWidget({ stats, transparent }: { stats: HanimeStats; transparent: boolean }) {
  return (
    <VStack alignment="leading" spacing={9} padding={14} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}>
      <BrandHeader compact transparent={transparent} />
      <Spacer />
      <Text font="headline" fontWeight="bold" lineLimit={2} shadow={textShadow(transparent)}>GiriGiri 片库</Text>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <CompactMetric icon="heart.fill" label="收藏" value={stats.favorites} transparent={transparent} />
        <CompactMetric icon="clock.fill" label="历史" value={stats.history} transparent={transparent} />
        <CompactMetric icon="tray.fill" label="本机" value={stats.downloads} transparent={transparent} />
      </HStack>
    </VStack>
  )
}

function MediumHanimeWidget({ stats, transparent }: { stats: HanimeStats; transparent: boolean }) {
  return (
    <HStack spacing={14} padding={16} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}>
      <PosterMark transparent={transparent} />
      <VStack alignment="leading" spacing={9} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}>
        <BrandHeader transparent={transparent} />
        <Text font="headline" fontWeight="bold" lineLimit={2} shadow={textShadow(transparent)}>动漫片库</Text>
        <HStack spacing={7} frame={{ maxWidth: "infinity" }}>
          <WidgetStat title="收藏" value={stats.favorites} icon="heart.fill" transparent={transparent} />
          <WidgetStat title="历史" value={stats.history} icon="clock.fill" transparent={transparent} />
          <WidgetStat title="本机" value={stats.downloads} icon="tray.fill" transparent={transparent} />
        </HStack>
      </VStack>
    </HStack>
  )
}

function LargeHanimeWidget({ stats, recent, transparent }: { stats: HanimeStats; recent: HanimeLibraryItem | null; transparent: boolean }) {
  return (
    <VStack alignment="leading" spacing={14} padding={18} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}>
      <BrandHeader transparent={transparent} />
      <Text font="headline" fontWeight="bold" lineLimit={1} shadow={textShadow(transparent)}>继续观看</Text>
      <RecentShelfItem item={recent} transparent={transparent} />
      <VStack alignment="leading" spacing={8} frame={{ maxWidth: "infinity" }}>
        <Text font="subheadline" fontWeight="semibold" shadow={textShadow(transparent)}>片库概览</Text>
        <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
          <WidgetStat title="收藏" value={stats.favorites} icon="heart.fill" transparent={transparent} />
          <WidgetStat title="历史" value={stats.history} icon="clock.fill" transparent={transparent} />
          <WidgetStat title="本机" value={stats.downloads} icon="tray.fill" transparent={transparent} />
        </HStack>
      </VStack>
    </VStack>
  )
}

function BrandHeader({ compact = false, transparent }: { compact?: boolean; transparent: boolean }) {
  return (
    <HStack spacing={7}>
      <Image systemName="play.rectangle.fill" font={compact ? 18 : 22} foregroundStyle="systemPink" widgetAccentable />
      <Text font={compact ? "caption" : "headline"} fontWeight="bold" foregroundStyle="systemPink" lineLimit={1} shadow={textShadow(transparent)}>GiriGiri</Text>
      <Spacer />
    </HStack>
  )
}

function PosterMark({ transparent }: { transparent: boolean }) {
  return (
    <VStack
      spacing={8}
      frame={{ width: 82, height: 96 }}
      background={surfaceStyle(transparent, false)}
      clipShape={{ type: "rect", cornerRadius: 18, style: "continuous" }}
    >
      <Image systemName="film.stack.fill" font={26} foregroundStyle="systemPink" widgetAccentable />
      <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>ANIME</Text>
    </VStack>
  )
}

function RecentShelfItem({ item, transparent }: { item: HanimeLibraryItem | null; transparent: boolean }) {
  return (
    <HStack
      alignment="center"
      spacing={12}
      padding={12}
      frame={{ maxWidth: "infinity", height: 126, alignment: "leading" }}
      background={surfaceStyle(transparent, false)}
      clipShape={{ type: "rect", cornerRadius: 20, style: "continuous" }}
    >
      {item?.coverUrl ? (
        <Image
          imageUrl={item.coverUrl}
          resizable
          scaleToFill
          widgetAccentedRenderingMode="fullColor"
          frame={{ width: 68, height: 102 }}
          clipShape={{ type: "rect", cornerRadius: 14, style: "continuous" }}
        />
      ) : (
        <VStack frame={{ width: 68, height: 102 }} background={surfaceStyle(transparent, true)} clipShape={{ type: "rect", cornerRadius: 14, style: "continuous" }}>
          <Image systemName="film.stack.fill" font={26} foregroundStyle="systemPink" widgetAccentable />
        </VStack>
      )}
      <VStack alignment="leading" spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{item ? "最近观看" : "暂无观看记录"}</Text>
        <Text font="headline" fontWeight="semibold" lineLimit={2} shadow={textShadow(transparent)}>{item?.title || "打开 GiriGiri 开始浏览"}</Text>
        <HStack spacing={5}>
          <Image systemName={item ? "play.circle.fill" : "sparkles"} font="caption" foregroundStyle="secondaryLabel" />
          <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{item ? `已播放 ${item.playCount} 次` : "公开番剧与系统播放"}</Text>
        </HStack>
      </VStack>
    </HStack>
  )
}

function CompactMetric({ icon, label, value, transparent }: { icon: string; label: string; value: number; transparent: boolean }) {
  return (
    <VStack spacing={2} frame={{ maxWidth: "infinity" }} padding={{ horizontal: 4, vertical: 6 }} background={surfaceStyle(transparent, true)} clipShape={{ type: "rect", cornerRadius: 12, style: "continuous" }}>
      <Image systemName={icon} font="caption2" foregroundStyle="secondaryLabel" />
      <Text font="caption" fontWeight="bold" lineLimit={1}>{value}</Text>
      <Text font={9} foregroundStyle="secondaryLabel" lineLimit={1}>{label}</Text>
    </VStack>
  )
}

function WidgetStat({ title, value, icon, transparent }: { title: string; value: number; icon: string; transparent: boolean }) {
  return (
    <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity" }} padding={{ horizontal: 9, vertical: 8 }} background={surfaceStyle(transparent, true)} clipShape={{ type: "rect", cornerRadius: 14, style: "continuous" }}>
      <HStack spacing={4}>
        <Image systemName={icon} font="caption2" foregroundStyle="secondaryLabel" />
        <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{title}</Text>
      </HStack>
      <Text font="headline" fontWeight="bold" lineLimit={1} shadow={textShadow(transparent)}>{value}</Text>
    </VStack>
  )
}

function surfaceStyle(transparent: boolean, subtle: boolean) {
  if (!transparent) return "secondarySystemBackground" as const
  return subtle ? TRANSPARENT_SUBTLE_SURFACE : TRANSPARENT_SURFACE
}

function textShadow(transparent: boolean) {
  return transparent ? { color: "rgba(0,0,0,0.24)" as const, radius: 2, y: 1 } : undefined
}

main()
