import {
  HStack,
  Image,
  List,
  NavigationLink,
  Section,
  Text,
  VStack,
  useEffect,
  useState,
} from "scripting"
import { hanimeClient, HanimeHomePage, HanimeVideoItem, HANIME_BASE_URL } from "../../class/hanime"
import { hanimeDatabase, HanimeStats } from "../../class/hanime_database"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"
import { VideoDetailView } from "../hanime/video_detail"
import { formatVideoMeta, normalizeVideoTitle } from "../hanime/video_components"
import {
  BackgroundThemeProvider,
  GlassIconButton,
  glassListRowStyleProps,
  PosterCardContent,
  posterCardHeight,
  POSTER_METRICS,
  PosterShelf,
  ShelfHeader,
} from "../../design-glass"
import { WeekdayScheduleView } from "./weekday_schedule"

const SHELF_HEIGHT = posterCardHeight("regular", true)

export function LibraryView({ homeScreen = false }: { homeScreen?: boolean } = {}) {
  const [home, setHome] = useState<HanimeHomePage | null>(null)
  const [stats, setStats] = useState<HanimeStats>({ favorites: 0, history: 0, downloads: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadHome()
  }, [])

  async function loadHome(forceRefresh = false) {
    try {
      setLoading(true)
      setError(null)
      const [homePage, currentStats] = await Promise.all([
        hanimeClient.getHomePage(forceRefresh),
        hanimeDatabase.getStats(),
      ])
      setHome(homePage)
      setStats(currentStats)
    } catch (loadError) {
      console.error("加载 GiriGiri 首页失败:", loadError)
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !home) {
    return (
      <List
        listStyle="inset"
        scrollContentBackground="hidden"
        scrollEdgeEffectHidden={{ edges: "top", hidden: homeScreen }}
        listRowBackground={<></>}
        listRowSeparator="hidden"
        navigationTitle={homeScreen ? "" : "浏览"}
        navigationBarTitleDisplayMode={homeScreen ? "inline" : "large"}
      >
        <Section>
          <LoadingState message="正在加载首页…" />
        </Section>
      </List>
    )
  }

  if (error && !home) {
    return (
      <List
        listStyle="inset"
        scrollContentBackground="hidden"
        scrollEdgeEffectHidden={{ edges: "top", hidden: homeScreen }}
        listRowBackground={<></>}
        listRowSeparator="hidden"
        navigationTitle={homeScreen ? "" : "浏览"}
        navigationBarTitleDisplayMode={homeScreen ? "inline" : "large"}
      >
        <Section>
          <ErrorState message={error} onRetry={() => { void loadHome() }} />
        </Section>
      </List>
    )
  }

  return (
    <List
      listStyle="inset"
      scrollContentBackground="hidden"
      scrollEdgeEffectHidden={{ edges: "top", hidden: homeScreen }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle={homeScreen ? "" : "浏览"}
      navigationBarTitleDisplayMode={homeScreen ? "inline" : "large"}
      onAppear={() => { void hanimeDatabase.getStats().then(setStats) }}
    >
      <Section>
        <HomeSummaryRow
          stats={stats}
          onRefresh={() => { void loadHome(true) }}
          onOpenSite={() => { void Safari.present(HANIME_BASE_URL, true) }}
        />
      </Section>

      <Section>
        <NavigationLink {...glassListRowStyleProps} destination={<WeekdayScheduleView />}>
          <HStack alignment="center" spacing={12} padding={{ vertical: 4 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Image systemName="calendar.badge.clock" font="title3" foregroundStyle="label" frame={{ width: 28, maxHeight: "infinity" }} />
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="subheadline" fontWeight="semibold">新番时间表</Text>
              <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2}>
                GiriGiri 与 Bangumi 的周一至周日安排
              </Text>
            </VStack>
            <Image systemName="chevron.right" font="caption" foregroundStyle="tertiaryLabel" />
          </HStack>
        </NavigationLink>
      </Section>

      {home && home.banners.length > 0 ? (
        <Section>
          <ShelfHeader title="焦点推荐" caption={`${home.banners.length} 部`} />
          <PosterShelf height={SHELF_HEIGHT}>
            {home.banners.map((banner) => (
              <NavigationLink
                key={banner.videoCode || `${banner.title}-${banner.picUrl}`}
                buttonStyle="plain"
                destination={<VideoDetailView video={bannerToVideo(banner)} />}
              >
                <PosterCardContent
                  coverUrl={banner.picUrl}
                  title={normalizeVideoTitle(banner.title) || "未命名"}
                  caption={banner.description || "焦点推荐"}
                  ageRating={banner.ageRating}
                />
              </NavigationLink>
            ))}
          </PosterShelf>
        </Section>
      ) : null}

      {home && home.sections.length > 0 ? home.sections.map((section) => (
        <Section key={section.id}>
          <ShelfHeader title={section.title} caption={`${section.items.length} 部`} />
          <PosterShelf height={SHELF_HEIGHT}>
            {section.items.map((item) => (
              <NavigationLink
                key={item.videoCode}
                buttonStyle="plain"
                destination={<VideoDetailView video={item} />}
              >
                <PosterCardContent
                  coverUrl={item.coverUrl}
                  title={normalizeVideoTitle(item.title) || "未命名"}
                  caption={formatVideoMeta(item)}
                  ageRating={item.ageRating}
                />
              </NavigationLink>
            ))}
          </PosterShelf>
        </Section>
      )) : null}

      {!loading && home && home.sections.length === 0 ? (
        <Section>
          <EmptyState
            icon="film.stack"
            title="暂未获取到公开内容"
            message="可先在 Safari 确认官网可访问，完成验证后返回这里刷新。"
            actionTitle="打开官网"
            action={() => { void Safari.present(HANIME_BASE_URL, true) }}
          />
        </Section>
      ) : null}
    </List>
  )
}

/** 首屏摘要：一行承载三项统计与两个动作，不再占用整块 Hero。 */
function HomeSummaryRow({
  stats,
  onRefresh,
  onOpenSite,
}: {
  stats: HanimeStats
  onRefresh: () => void
  onOpenSite: () => void
}) {
  return (
    <HStack
      alignment="center"
      spacing={12}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <SummaryMetric icon="heart.fill" title="收藏" value={`${stats.favorites}`} />
        <SummaryMetric icon="clock.fill" title="历史" value={`${stats.history}`} />
        <SummaryMetric icon="tray.fill" title="本机" value={`${stats.downloads}`} />
      </HStack>
      <GlassIconButton title="刷新" systemName="arrow.clockwise" action={onRefresh} />
      <GlassIconButton title="打开官网" systemName="safari" action={onOpenSite} />
    </HStack>
  )
}

function SummaryMetric({ icon, title, value }: { icon: string; title: string; value: string }) {
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

function bannerToVideo(banner: NonNullable<HanimeHomePage["banner"]>): HanimeVideoItem {
  return {
    title: banner.title,
    coverUrl: banner.picUrl,
    videoCode: banner.videoCode || "",
    ageRating: banner.ageRating,
    itemType: "simplified",
  }
}

export default function LibraryPreview() {
  return (
    <BackgroundThemeProvider>
      <LibraryView />
    </BackgroundThemeProvider>
  )
}
