import {
  Button,
  Group,
  HStack,
  Image,
  Label,
  List,
  Menu,
  NavigationLink,
  Section,
  Text,
  VStack,
  useEffect,
  useState,
} from "scripting"
import { bangumiClient } from "../../class/bangumi"
import { formatFileSize, hanimeDownloadManager } from "../../class/hanime_download_manager"
import { hanimeDatabase, HanimeDownloadedItem, HanimeEpisodeHistory, HanimeLibraryItem, HanimeStats } from "../../class/hanime_database"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"
import { SettingActionRow } from "../setting"
import { LocalVideoPlayerView } from "../hanime/local_video_player"
import { VideoDetailView } from "../hanime/video_detail"
import { BangumiProgressView } from "../library/bangumi_progress"
import { HanimeVideoRow, normalizeVideoTitle } from "../hanime/video_components"
import {
  glassListRowStyleProps,
  GlassIconButton,
  GlassListRow,
  PosterCardContent,
  PosterCover,
  PosterGrid,
  ShelfHeader,
} from "../../design-glass"

export function SavedView({ homeScreen = false }: { homeScreen?: boolean } = {}) {
  const [downloads, setDownloads] = useState<HanimeDownloadedItem[]>([])
  const [favorites, setFavorites] = useState<HanimeLibraryItem[]>([])
  const [history, setHistory] = useState<HanimeLibraryItem[]>([])
  const [episodeHistoryByVideo, setEpisodeHistoryByVideo] = useState<Record<string, HanimeEpisodeHistory | undefined>>({})
  const [stats, setStats] = useState<HanimeStats>({ favorites: 0, history: 0, downloads: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumeLocalItem, setResumeLocalItem] = useState<HanimeDownloadedItem | null>(null)
  const [resumeDetailItem, setResumeDetailItem] = useState<HanimeLibraryItem | null>(null)
  const [isBangumiAuthenticated, setIsBangumiAuthenticated] = useState(false)
  const [showBangumiProgress, setShowBangumiProgress] = useState(false)

  useEffect(() => {
    void loadData()
    refreshBangumiAuthentication()
  }, [])

  function refreshBangumiAuthentication() {
    const authenticated = bangumiClient.getOAuthStatus().isAuthenticated
    setIsBangumiAuthenticated(authenticated)
    return authenticated
  }

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [downloadItems, favoriteItems, historyItems] = await Promise.all([
        hanimeDownloadManager.getDownloads(),
        hanimeDatabase.getFavorites(),
        hanimeDatabase.getHistory(),
      ])
      const episodeEntries = await Promise.all(historyItems.map(async (video) => [video.videoCode, (await hanimeDatabase.getEpisodeHistory(video.videoCode))[0]] as const))
      setDownloads(downloadItems)
      setFavorites(favoriteItems)
      setHistory(historyItems)
      setEpisodeHistoryByVideo(Object.fromEntries(episodeEntries))
      setStats(await hanimeDatabase.getStats())
    } catch (loadError) {
      console.error("加载 GiriGiri 收藏历史失败:", loadError)
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }


  async function openBangumiProgress() {
    if (refreshBangumiAuthentication()) {
      setShowBangumiProgress(true)
      return
    }
    await Dialog.alert({ title: "需要 Bangumi 授权", message: "请先在设置页完成 Bangumi OAuth 授权，再访问进度管理。" })
  }

  async function clearFavorites() {
    try {
      await hanimeDatabase.clearFavorites()
      await loadData()
    } catch (clearError) {
      await Dialog.alert({ title: "无法清空收藏", message: `${clearError}` })
      await loadData()
    }
  }

  async function clearHistory() {
    try {
      await hanimeDatabase.clearHistory()
      await loadData()
    } catch (clearError) {
      await Dialog.alert({ title: "无法清空观看记录", message: "观看记录与续播点未能清除。请稍后重试。" })
      console.error("清空 GiriGiri 观看记录失败:", clearError)
      await loadData()
    }
  }

  async function exportDownload(video: HanimeDownloadedItem) {
    try {
      const result = await hanimeDownloadManager.exportToFilesApp(video)
      await Dialog.alert({
        title: "已导出到“文件”",
        message: result.isDirectory
          ? `已导出为 HLS 文件夹，可在 ${result.location} 查看。`
          : `已导出视频文件，可在 ${result.location} 查看。`,
      })
    } catch (exportError) {
      console.error("导出 GiriGiri 本机文件失败:", exportError)
      await Dialog.alert({ title: "无法导出文件", message: "文件未能导出到“文件”App。请确认本机存储或 iCloud Drive 可用后重试。" })
      await loadData()
    }
  }

  async function removeUnavailableRecord(video: HanimeDownloadedItem) {
    try {
      await hanimeDownloadManager.removeUnavailableDownloadRecord(video)
      await loadData()
    } catch (removeError) {
      console.error("删除 GiriGiri 失效下载记录失败:", removeError)
      await Dialog.alert({ title: "无法删除下载记录", message: "失效记录仍已保留。请重新检查文件状态后重试。" })
      await loadData()
    }
  }

  async function deleteDownload(video: HanimeDownloadedItem) {
    try {
      await hanimeDownloadManager.deleteDownload(video)
      await loadData()
    } catch (deleteError) {
      console.error("删除 GiriGiri 本机文件失败:", deleteError)
      await Dialog.alert({ title: "无法删除本机文件", message: "本机文件与下载记录未能完整删除。请确认文件可访问后重试。" })
    }
  }

  const latestVideo = history[0]
  const latestEpisode = latestVideo ? episodeHistoryByVideo[latestVideo.videoCode] : undefined
  const latestLocalItem = latestEpisode ? downloads.find((entry) => entry.downloadKey === latestEpisode.sourceKey && entry.isFileAvailable !== false) || null : null

  function openLatestResume() {
    if (!latestVideo) return
    if (latestLocalItem) setResumeLocalItem(latestLocalItem)
    else setResumeDetailItem(latestVideo)
  }

  return (
    <List
      listStyle="inset"
      scrollContentBackground="hidden"
      scrollEdgeEffectHidden={{ edges: "top", hidden: homeScreen }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle={homeScreen ? "" : "片库"}
      navigationBarTitleDisplayMode={homeScreen ? "inline" : "large"}
      onAppear={() => {
        refreshBangumiAuthentication()
        void loadData()
      }}
      navigationDestination={showBangumiProgress ? {
        content: <BangumiProgressView />,
        isPresented: true,
        onChanged: (isPresented) => { if (!isPresented) setShowBangumiProgress(false) },
      } : resumeLocalItem ? {
        content: <LocalVideoPlayerView item={resumeLocalItem} />,
        isPresented: true,
        onChanged: (isPresented) => { if (!isPresented) setResumeLocalItem(null) },
      } : resumeDetailItem ? {
        content: <VideoDetailView video={resumeDetailItem} />,
        isPresented: true,
        onChanged: (isPresented) => { if (!isPresented) setResumeDetailItem(null) },
      } : undefined}
    >
      <Section>
        <HStack
          alignment="center"
          spacing={12}
          frame={{ maxWidth: "infinity", alignment: "leading" }}
          listRowBackground={<></>}
          listRowSeparator="hidden"
        >
          <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <LibraryMetric icon="heart.fill" title="收藏" value={loading ? "—" : `${stats.favorites}`} />
            <LibraryMetric icon="clock.fill" title="历史" value={loading ? "—" : `${stats.history}`} />
            <LibraryMetric icon="tray.fill" title="本机" value={loading ? "—" : `${stats.downloads}`} />
          </HStack>
          <GlassIconButton title="重新检查文件" systemName="arrow.clockwise" action={() => { void loadData() }} />
        </HStack>
      </Section>

      <Section>
        <Button {...glassListRowStyleProps} action={() => { void openBangumiProgress() }}>
          <SettingActionRow
            icon={isBangumiAuthenticated ? "chart.bar.xaxis" : "lock"}
            title="Bangumi 进度"
            subtitle={isBangumiAuthenticated ? "管理 Bangumi 收藏状态与追番进度。" : "完成 Bangumi 授权后管理收藏与追番进度。"}
          />
        </Button>
      </Section>

      {loading && downloads.length === 0 && favorites.length === 0 && history.length === 0 ? (
        <Section>
          <LoadingState message="正在载入片库…" />
        </Section>
      ) : null}

      {latestVideo ? (
        <Section>
          <RecentResumeCard video={latestVideo} episode={latestEpisode} localItem={latestLocalItem} onResume={openLatestResume} />
        </Section>
      ) : null}

      {error ? (
        <Section>
          <ErrorState message={error} onRetry={() => { void loadData() }} />
        </Section>
      ) : null}

      {downloads.length > 0 ? (
        <Section>
          <ShelfHeader title="离线文件" caption={`${downloads.length} 项`} />
          {downloads.some((video) => video.isFileAvailable === false) ? (
            <GlassListRow>
              <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Image systemName="exclamationmark.triangle" font="caption" foregroundStyle="secondaryLabel" />
                <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3}>
                  部分文件当前不可访问，记录已保留。确认本机存储或 iCloud 文件可用后再操作。
                </Text>
              </HStack>
            </GlassListRow>
          ) : null}
          {downloads.map((video) => {
            const unavailable = video.isFileAvailable === false
            const row = <HanimeVideoRow video={video} accessory={
              <VStack alignment="trailing" spacing={3} frame={{ minWidth: 60, alignment: "trailing" }}>
                <Image systemName={unavailable ? "exclamationmark.circle" : "checkmark.circle"} font="caption" foregroundStyle="secondaryLabel" />
                <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1} multilineTextAlignment="trailing">{unavailable ? "不可用" : formatFileSize(video.fileSize)}</Text>
              </VStack>
            } />
            return unavailable ? (
              <Group
                {...glassListRowStyleProps}
                key={video.downloadKey}
                contextMenu={{
                  menuItems: (
                    <Group>
                      <Button title="重新检查文件" systemImage="arrow.clockwise" action={() => { void loadData() }} />
                      <Menu title="仅删除失效记录" systemImage="trash"><Button title="确认删除失效记录" systemImage="trash" role="destructive" action={() => { void removeUnavailableRecord(video) }} /><Button title="取消" systemImage="xmark" role="cancel" action={() => {}} /></Menu>
                    </Group>
                  ),
                }}
              >
                {row}
              </Group>
            ) : (
              <NavigationLink
                {...glassListRowStyleProps}
                key={video.downloadKey}
                destination={<LocalVideoPlayerView item={video} />}
                contextMenu={{
                  menuItems: (
                    <Group>
                      <Button title="导出到“文件”" systemImage="folder.badge.plus" action={() => { void exportDownload(video) }} />
                      <Menu title="删除本机文件" systemImage="trash"><Button title="确认删除本机文件" systemImage="trash" role="destructive" action={() => { void deleteDownload(video) }} /><Button title="取消" systemImage="xmark" role="cancel" action={() => {}} /></Menu>
                    </Group>
                  ),
                }}
              >
                {row}
              </NavigationLink>
            )
          })}
          <GlassListRow>
            <Text font="caption" foregroundStyle="secondaryLabel">
              这里展示从详情页保存到本机的直链视频或无 DRM HLS 文件。点按可播放；长按可导出或删除；最近续播会优先使用可用本机文件。
            </Text>
          </GlassListRow>
        </Section>
      ) : null}

      {favorites.length > 0 ? (
        <Section>
          <ShelfHeader title="收藏" caption={`${favorites.length} 部`} />
          <PosterGrid>
            {favorites.map((video) => (
              <NavigationLink key={video.videoCode} buttonStyle="plain" destination={<VideoDetailView video={video} />}>
                <PosterCardContent
                  coverUrl={video.coverUrl}
                  title={normalizeVideoTitle(video.title) || "未命名"}
                  caption={video.ageRating || "已收藏"}
                />
              </NavigationLink>
            ))}
          </PosterGrid>

          <Menu label={<Label title="清空全部收藏" systemImage="heart.slash" />} {...glassListRowStyleProps} menuIndicator="hidden" menuStyle="button" buttonStyle="plain" glassEffectTransition="materialize" accessibilityLabel={`清空全部 ${favorites.length} 部收藏，展开确认选项`}>
            <Button title="清空收藏" systemImage="heart.slash" disabled action={() => {}} />
            <Button title="观看历史、续播记录与本机离线文件会保留" systemImage="info.circle" disabled action={() => {}} />
            <Button title={`确认清空 ${favorites.length} 部收藏`} systemImage="heart.slash" role="destructive" action={() => { void clearFavorites() }} />
            <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
          </Menu>
        </Section>
      ) : null}

      {history.length > 0 ? (
        <Section>
          <ShelfHeader title="最近观看" caption={`${history.length} 部`} />
          {history.map((video) => {
            const episode = episodeHistoryByVideo[video.videoCode]
            const localItem = episode ? downloads.find((entry) => entry.downloadKey === episode.sourceKey && entry.isFileAvailable !== false) : null
            return (
              <NavigationLink {...glassListRowStyleProps} key={video.videoCode} destination={localItem ? <LocalVideoPlayerView item={localItem} /> : <VideoDetailView video={video} />}> 
                <HanimeVideoRow
                  video={video}
                  accessory={
                    <VStack alignment="trailing" spacing={3} frame={{ minWidth: 62, alignment: "trailing" }}>
                      <Image systemName={localItem ? "arrow.down.circle" : "play.circle"} font="caption" foregroundStyle="secondaryLabel" />
                      <Text font="caption2" fontWeight="semibold" foregroundStyle="secondaryLabel" lineLimit={1} multilineTextAlignment="trailing">
                        {localItem ? "本机" : episode?.sourceLabel || "继续"}
                      </Text>
                      <Text font="caption2" foregroundStyle="tertiaryLabel" lineLimit={1} multilineTextAlignment="trailing">{formatTime(episode?.lastWatchedAt || video.lastWatchedAt)}</Text>
                    </VStack>
                  }
                />
              </NavigationLink>
            )
          })}

          <Menu label={<Label title="清空观看记录" systemImage="trash" />} {...glassListRowStyleProps} menuIndicator="hidden" menuStyle="button" buttonStyle="plain" glassEffectTransition="materialize" accessibilityLabel="清空观看记录与续播点，展开确认选项">
            <Button title="同时移除全部剧集续播点" systemImage="clock.badge.xmark" disabled action={() => {}} />
            <Button title="收藏与本机离线文件会保留" systemImage="info.circle" disabled action={() => {}} />
            <Button title="确认清空观看记录" systemImage="trash" role="destructive" action={() => { void clearHistory() }} />
            <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
          </Menu>
        </Section>
      ) : null}

      {!loading && !error && downloads.length === 0 && favorites.length === 0 && history.length === 0 ? (
        <Section>
          <EmptyState
            icon="heart.text.square"
            title="片库暂无内容"
            message="收藏作品、观看剧集或保存离线文件后，相关内容会集中显示在这里。"
          />
        </Section>
      ) : null}
    </List>
  )
}

function LibraryMetric({ icon, title, value }: { icon: string; title: string; value: string }) {
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

function RecentResumeCard({
  video,
  episode,
  localItem,
  onResume,
}: {
  video: HanimeLibraryItem
  episode?: HanimeEpisodeHistory
  localItem: HanimeDownloadedItem | null
  onResume: () => void
}) {
  const episodeLabel = episode?.sourceLabel || "上次打开的内容"
  const sourceText = localItem ? "本机文件可用 · 离线优先" : "将进入详情页选择在线或离线播放"

  return (
    <Button
      {...glassListRowStyleProps}
      action={onResume}
      buttonStyle="plain"
      accessibilityLabel={`${normalizeVideoTitle(video.title) || "未命名"}，${localItem ? "继续本机播放" : "继续播放"}`}
    >
      <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <PosterCover url={video.coverUrl} size="compact" />
        <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <HStack alignment="center" spacing={6}>
            <Image systemName={localItem ? "arrow.down.circle" : "clock.arrow.circlepath"} font="caption2" foregroundStyle="secondaryLabel" />
            <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>最近续播</Text>
            <Text font="caption2" foregroundStyle="tertiaryLabel" lineLimit={1}>{formatTime(episode?.lastWatchedAt || video.lastWatchedAt)}</Text>
          </HStack>
          <Text font="headline" fontWeight="semibold" lineLimit={3} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{normalizeVideoTitle(video.title) || "未命名"}</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>{episodeLabel}</Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel" lineLimit={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>{sourceText}</Text>
          <HStack alignment="center" spacing={5}>
            <Image systemName={localItem ? "play.rectangle.fill" : "play.circle.fill"} font="caption" foregroundStyle="label" />
            <Text font="caption" fontWeight="semibold" foregroundStyle="label">{localItem ? "继续本机播放" : "继续播放"}</Text>
          </HStack>
        </VStack>
        <Image systemName="chevron.right" font="caption" foregroundStyle="tertiaryLabel" frame={{ width: 18, maxHeight: "infinity", alignment: "center" }} />
      </HStack>
    </Button>
  )
}

function formatTime(value?: number): string {
  if (!value) return ""
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
}
