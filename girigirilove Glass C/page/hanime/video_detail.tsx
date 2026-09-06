import {
  Button,
  HStack,
  Image,
  Label,
  LazyVGrid,
  List,
  Menu,
  NavigationLink,
  ScrollView,
  Section,
  Spacer,
  Text,
  VStack,
  ZStack,
  useEffect,
  useRef,
  useState,
} from "scripting"
import { extractVideoCode, hanimeClient, HanimeVideoDetail, HanimeVideoItem, HanimeVideoSource } from "../../class/hanime"
import { formatFileSize, getDownloadKey, HanimeDownloadTask, hanimeDownloadManager, isDownloadableVideoSource } from "../../class/hanime_download_manager"
import { HanimeDownloadedItem, HanimeEpisodeHistory, hanimeDatabase } from "../../class/hanime_database"
import { buildExternalPlayerURL, getExternalPlayer } from "../../class/external_player"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"
import {
  GIRIGIRI_GLASS_TOKENS,
  glassEffectFor,
  glassListRowStyleProps,
  GlassGridCell,
  GlassListRow,
  GlassSurface,
  PageBackground,
  PosterCardContent,
  posterCardHeight,
  PosterCover,
  PosterGrid,
  PosterShelf,
  ShelfHeader,
} from "../../design-glass"
import { HanimeActionPill, HanimeActionPillContent } from "../components/hanime_ui"
import { AgeRatingBadge, formatVideoMeta, normalizeVideoTitle } from "./video_components"
import { LocalVideoPlayerView } from "./local_video_player"
import { BangumiDetailView } from "./bangumi_detail"
import { bangumiClient, BangumiProgressStatus, BangumiSubject } from "../../class/bangumi"
import { BangumiOAuthView } from "../setting/bangumi_oauth"

const DETAIL_SHELF_HEIGHT = posterCardHeight("regular", true)

const BANGUMI_STATUS_ACTIONS: Array<{ label: BangumiProgressStatus; type: number; icon: string }> = [
  { label: "想看", type: 1, icon: "bookmark" },
  { label: "在看", type: 3, icon: "play.circle" },
  { label: "看过", type: 2, icon: "checkmark.circle" },
  { label: "搁置", type: 4, icon: "pause.circle" },
  { label: "抛弃", type: 5, icon: "xmark.circle" },
]

export function VideoDetailView({ video }: { video: HanimeVideoItem }) {
  const [detail, setDetail] = useState<HanimeVideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [downloaded, setDownloaded] = useState<HanimeDownloadedItem[]>([])
  const [episodeHistory, setEpisodeHistory] = useState<HanimeEpisodeHistory[]>([])
  const [downloading, setDownloading] = useState(false)
  const [downloadTask, setDownloadTask] = useState<HanimeDownloadTask | null>(null)
  const [activeDownloadKey, setActiveDownloadKey] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [openingSourceUrl, setOpeningSourceUrl] = useState<string | null>(null)
  const [localPlaybackItem, setLocalPlaybackItem] = useState<HanimeDownloadedItem | null>(null)
  const [bangumiSubject, setBangumiSubject] = useState<BangumiSubject | null>(null)
  const [bangumiStatus, setBangumiStatus] = useState<BangumiProgressStatus | null>(null)
  const [bangumiAuthenticated, setBangumiAuthenticated] = useState(false)
  const [bangumiLoading, setBangumiLoading] = useState(false)
  const [bangumiUpdating, setBangumiUpdating] = useState(false)
  const [bangumiMessage, setBangumiMessage] = useState("")
  const bangumiLinkRequestRef = useRef<{ key: string; request: Promise<void> } | null>(null)

  useEffect(() => {
    void loadDetail()
  }, [video.videoCode, video.title])

  useEffect(() => {
    const refreshTask = () => {
      const item = currentItem()
      const primaryKey = detail?.videoUrls[0] ? getDownloadKey(item.videoCode, detail.videoUrls[0]) : null
      const targetKey = activeDownloadKey || primaryKey
      setDownloadTask(targetKey ? hanimeDownloadManager.getTasks().find((task) => task.downloadKey === targetKey) || null : null)
    }
    refreshTask()
    return hanimeDownloadManager.subscribe(refreshTask)
  }, [video.videoCode, detail?.videoUrls, activeDownloadKey])

  async function loadDetail() {
    try {
      setLoading(true)
      setError(null)
      const resolvedVideo = await resolveVideoForDetail()
      const data = await hanimeClient.getVideo(resolvedVideo.videoCode)
      setDetail(data)
      const item = toVideoItem(data)
      await hanimeDatabase.saveVideo(item)
      setFavorite(await hanimeDatabase.isFavorite(item.videoCode))
      const [downloadItems, historyItems] = await Promise.all([
        hanimeDownloadManager.getDownloadsForVideo(item.videoCode),
        hanimeDatabase.getEpisodeHistory(item.videoCode),
      ])
      setDownloaded(downloadItems)
      setEpisodeHistory(historyItems)
      await loadBangumiLink(item)
    } catch (loadError) {
      console.error("加载 GiriGiri 详情失败:", loadError)
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }

  async function resolveVideoForDetail(): Promise<HanimeVideoItem> {
    if (video.videoCode) return video

    const title = normalizeVideoTitle(video.title)
    if (!title) throw new Error("推荐视频缺少详情入口，请刷新首页后重试。")

    const results = await hanimeClient.searchVideos({ query: title, page: 1, sort: "time" })
    const matched = results.find((result) => normalizeVideoTitle(result.title) === title) || results[0]
    if (!matched?.videoCode) throw new Error("未能解析推荐视频详情入口，请先打开官网确认该推荐仍可访问。")

    return {
      ...matched,
      title: matched.title || video.title,
      coverUrl: matched.coverUrl || video.coverUrl,
    }
  }

  function currentItem(): HanimeVideoItem {
    return detail ? toVideoItem(detail) : video
  }

  async function toggleFavorite() {
    try {
      const next = await hanimeDatabase.toggleFavorite(currentItem())
      setFavorite(next)
    } catch (favoriteError) {
      console.error("更新 GiriGiri 收藏状态失败:", favoriteError)
      await Dialog.alert({ title: "无法更新收藏状态", message: "收藏状态未能保存。请稍后重试。" })
    }
  }

  async function openOfficialDetail() {
    await Safari.present(hanimeClient.watchUrl(currentItem().videoCode), true)
  }

  async function downloadSource(selectedSource: HanimeVideoSource) {
    if (!detail || downloading) return
    setActiveDownloadKey(getDownloadKey(currentItem().videoCode, selectedSource))

    try {
      setDownloading(true)
      const downloadableSource = await hanimeClient.resolvePlayableSource(selectedSource)
      if (!isDownloadableVideoSource(downloadableSource)) {
        throw new Error(`「${selectedSource.label}」未解析到可保存的 MP4 或无 DRM HLS 视频地址。`)
      }

      const savedItem = await hanimeDownloadManager.download(currentItem(), downloadableSource)
      setDownloaded(await hanimeDownloadManager.getDownloadsForVideo(savedItem.videoCode))
      const savedAsHLS = savedItem.sourceType?.includes("mpegurl") === true
      await Dialog.alert({
        title: savedAsHLS ? "HLS 离线播放包已保存" : "视频已保存为 MP4",
        message: savedAsHLS
          ? `${selectedSource.label} 已保存为 HLS 离线播放包（${formatFileSize(savedItem.fileSize)}）。可在“片库”的离线文件中播放；导出时将保存完整文件夹。`
          : `${selectedSource.label} 已保存为 MP4（${formatFileSize(savedItem.fileSize)}）。可在“片库”的离线文件中播放或导出。`,
      })
    } catch (downloadError) {
      console.error("下载 GiriGiri 剧集失败:", downloadError)
      await Dialog.alert({ title: "无法保存剧集", message: "当前剧集未能保存。请确认来源与网络可用，或尝试其他剧集线路。" })
    } finally {
      setDownloading(false)
    }
  }

  function getAvailableDownload(source: HanimeVideoSource): HanimeDownloadedItem | null {
    const downloadKey = getDownloadKey(currentItem().videoCode, source)
    return downloaded.find((entry) => entry.downloadKey === downloadKey && entry.isFileAvailable !== false) || null
  }

  async function playSourceOnline(source: HanimeVideoSource) {
    await openSystemPlayer(source)
  }

  function playSourceLocally(source: HanimeVideoSource) {
    const localItem = getAvailableDownload(source)
    if (localItem) setLocalPlaybackItem(localItem)
  }

  async function choosePlayback(source: HanimeVideoSource) {
    const localItem = getAvailableDownload(source)
    if (localItem) {
      setLocalPlaybackItem(localItem)
      return
    }
    await playSourceOnline(source)
  }

  async function openSystemPlayer(source?: HanimeVideoSource) {
    const item = currentItem()
    const targetSource = source || detail?.videoUrls[0] || {
      label: "系统播放",
      url: detail?.watchUrl || hanimeClient.watchUrl(item.videoCode),
      type: "text/html",
    }

    try {
      setOpeningSourceUrl(targetSource.url)
      const resolved = await hanimeClient.resolvePlayableSource(targetSource)
      await hanimeDatabase.addHistory(item, {
        sourceKey: getDownloadKey(item.videoCode, targetSource),
        sourceLabel: targetSource.label,
        sourceUrl: targetSource.url,
      })
      const defaultPlayer = getExternalPlayer()
      const externalURL = buildExternalPlayerURL(resolved.url, defaultPlayer.id)
      if (!externalURL) {
        await Safari.present(resolved.url, true)
      } else {
        const opened = await Safari.openURL(externalURL)
        if (!opened) {
          await Dialog.alert({
            title: `无法打开 ${defaultPlayer.title}`,
            message: "未检测到对应播放器，将自动改用系统播放器打开当前话数。",
          })
          await Safari.present(resolved.url, true)
        }
      }
    } catch (playError) {
      await Dialog.alert({
        title: "无法打开当前剧集",
        message: "请尝试其他剧集线路、切换默认播放器，或前往官方详情页播放。",
      })
    } finally {
      setOpeningSourceUrl(null)
    }
  }

  function loadBangumiLink(item: HanimeVideoItem): Promise<void> {
    const authStatus = bangumiClient.getOAuthStatus()
    const requestKey = `${item.videoCode.trim()}|${item.title.trim()}|${authStatus.isAuthenticated ? "auth" : "guest"}`
    const existing = bangumiLinkRequestRef.current
    if (existing?.key === requestKey) return existing.request

    const request = performBangumiLink(item, authStatus.isAuthenticated)
    bangumiLinkRequestRef.current = { key: requestKey, request }
    const clearRequest = () => {
      if (bangumiLinkRequestRef.current?.request === request) bangumiLinkRequestRef.current = null
    }
    void request.then(clearRequest, clearRequest)
    return request
  }

  async function performBangumiLink(item: HanimeVideoItem, isAuthenticated: boolean) {
    try {
      setBangumiLoading(true)
      setBangumiAuthenticated(isAuthenticated)
      let subjectId = bangumiClient.getLinkedSubjectId(item.videoCode)
      if (!subjectId) {
        const matches = await bangumiClient.searchAnime(item.title)
        const exactMatches = matches.filter((match) => match.matchKind === "精确匹配")
        if (exactMatches.length === 1) {
          subjectId = exactMatches[0].id
          bangumiClient.linkGirigiriSubject(item.videoCode, subjectId)
        }
      }
      if (!subjectId) {
        setBangumiSubject(null)
        setBangumiStatus(null)
        setBangumiMessage("请选择与当前 GiriGiri 视频对应的 Bangumi 条目。")
        return
      }
      const subject = await bangumiClient.getSubject(subjectId)
      setBangumiSubject(subject)
      if (isAuthenticated) {
        const progress = await bangumiClient.getProgressForSubject(subjectId)
        setBangumiStatus(progress?.status || null)
        setBangumiMessage(progress ? `Bangumi 当前状态：${progress.status}` : "尚未加入 Bangumi 进度管理。")
      } else {
        setBangumiStatus(null)
        setBangumiMessage("已匹配条目；完成 Bangumi 授权后可同步进度。")
      }
    } catch (linkError) {
      console.error("加载 Giri 与 Bangumi 联动失败:", linkError)
      setBangumiMessage(`Bangumi 联动加载失败：${linkError}`)
    } finally {
      setBangumiLoading(false)
    }
  }

  function clearBangumiSubject() {
    const item = currentItem()
    bangumiClient.unlinkGirigiriSubject(item.videoCode)
    bangumiLinkRequestRef.current = null
    setBangumiSubject(null)
    setBangumiStatus(null)
    setBangumiUpdating(false)
    setBangumiMessage("旧关联已解除，请从候选中选择新的 Bangumi 条目。")
  }

  async function selectBangumiSubject(subject: BangumiSubject) {
    const item = currentItem()
    bangumiClient.linkGirigiriSubject(item.videoCode, subject.id)
    setBangumiSubject(subject)
    setBangumiMessage(`已将当前 GiriGiri 视频关联到「${subject.nameCn || subject.name}」。`)
    if (bangumiClient.getOAuthStatus().isAuthenticated) {
      try {
        const progress = await bangumiClient.getProgressForSubject(subject.id)
        setBangumiAuthenticated(true)
        setBangumiStatus(progress?.status || null)
        setBangumiMessage(progress ? `已关联，Bangumi 当前状态：${progress.status}` : "已关联，尚未加入 Bangumi 进度管理。")
      } catch (statusError) {
        setBangumiMessage(`条目已关联，账号状态读取失败：${statusError}`)
      }
    }
  }

  async function updateBangumiProgress(status: BangumiProgressStatus, type: number) {
    if (!bangumiSubject || bangumiUpdating) return
    if (!bangumiClient.getOAuthStatus().isAuthenticated) {
      setBangumiAuthenticated(false)
      await Dialog.alert({ title: "需要 Bangumi 授权", message: "请先完成 Bangumi OAuth 授权，再同步当前 GiriGiri 视频的收藏状态。" })
      return
    }
    try {
      setBangumiUpdating(true)
      setBangumiMessage(`正在同步到“${status}”…`)
      await bangumiClient.updateProgress(bangumiSubject.id, type)
      setBangumiStatus(status)
      setBangumiMessage(`已同步到 Bangumi“${status}”，进度管理分类会随之更新。`)
    } catch (updateError) {
      setBangumiMessage(`Bangumi 进度更新失败：${updateError}`)
    } finally {
      setBangumiUpdating(false)
    }
  }

  async function copyCurrentTitle(title: string) {
    const normalizedTitle = normalizeVideoTitle(title)
    if (!normalizedTitle) return

    try {
      await Pasteboard.setString(normalizedTitle)
      await Dialog.alert({ title: "已复制标题", message: normalizedTitle })
    } catch (copyError) {
      await Dialog.alert({ title: "复制标题失败", message: `${copyError}` })
    }
  }

  if (loading && !detail) {
    return (
      <ZStack>
        <PageBackground />
        <List listStyle="inset" scrollContentBackground="hidden" listRowBackground={<></>} listRowSeparator="hidden">
          <Section>
            <LoadingState message="正在加载详情…" />
          </Section>
        </List>
      </ZStack>
    )
  }

  if (error && !detail) {
    return (
      <ZStack>
        <PageBackground />
        <List listStyle="inset" scrollContentBackground="hidden" listRowBackground={<></>} listRowSeparator="hidden">
          <Section>
            <ErrorState message={error} onRetry={() => { void loadDetail() }} />
          </Section>
        </List>
      </ZStack>
    )
  }

  const item = currentItem()
  const displayTitle = formatDetailDisplayTitle(item, detail)
  const detailPageUrl = hanimeClient.watchUrl(item.videoCode)
  const resumeHistory = episodeHistory[0]
  const resumeSource = resumeHistory ? detail?.videoUrls.find((source) => getDownloadKey(item.videoCode, source) === resumeHistory.sourceKey) : undefined
  const activeDownload = downloadTask?.status === "downloading" || downloadTask?.status === "finalizing"
  

  return (
    <ZStack>
      <PageBackground />
      <List
        listStyle="inset"
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
      onAppear={() => {
        void hanimeDatabase.saveVideo(item)
        void Promise.all([
          hanimeDownloadManager.getDownloadsForVideo(item.videoCode),
          hanimeDatabase.getEpisodeHistory(item.videoCode),
        ]).then(([downloadItems, historyItems]) => {
          setDownloaded(downloadItems)
          setEpisodeHistory(historyItems)
        })
      }}
      navigationDestination={activeTag ? {
        content: <TagSearchView tag={activeTag} />,
        isPresented: true,
        onChanged: (isPresented) => { if (!isPresented) setActiveTag(null) },
      } : localPlaybackItem ? {
        content: <LocalVideoPlayerView item={localPlaybackItem} />,
        isPresented: true,
        onChanged: (isPresented) => { if (!isPresented) setLocalPlaybackItem(null) },
      } : undefined}
    >
      <Section>
        <GlassSurface material="media">
          <VStack
            alignment="leading"
            spacing={GIRIGIRI_GLASS_TOKENS.spacing.regular}
            padding={18}
            frame={{ maxWidth: "infinity", alignment: "leading" }}
          >
          <HStack alignment="top" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <PosterCover url={item.coverUrl || detail?.coverUrl} size="regular" />
            <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity", alignment: "topLeading" }}>
              <Text
                font="headline"
                fontWeight="semibold"
                multilineTextAlignment="leading"
                allowsTightening={true}
                lineSpacing={1}
                lineLimit={4}
                layoutPriority={1}
                frame={{ maxWidth: "infinity", alignment: "leading" }}
              >
                {displayTitle}
              </Text>
              {detail?.chineseTitle ? (
                <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  {detail.chineseTitle}
                </Text>
              ) : null}
              <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
                {formatDetailMeta(item, detail)}
              </Text>
              <AgeRatingBadge rating={detail?.ageRating || item.ageRating} />
            </VStack>
          </HStack>

          <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
            <Menu
              label={(
                <SystemPlayPrimaryButton
                  title={openingSourceUrl ? "正在准备播放…" : resumeSource ? `继续播放 · ${resumeSource.label}` : "播放"}
                  subtitle={resumeSource ? "选择剧集后开始播放；已下载剧集可选择本机或在线版本。" : "选择要播放的剧集或线路。"}
                />
              )}
              disabled={openingSourceUrl !== null || !detail || detail.videoUrls.length === 0}
              menuIndicator="hidden"
              menuStyle="button"
              buttonStyle="plain"
              frame={{ maxWidth: "infinity", minHeight: 68 }}
              contentShape={{ type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.media, style: "continuous" }}
              glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.media, style: "continuous" }, true)}
              glassEffectTransition="materialize"
              accessibilityLabel="播放，展开话数选择"
            >
              {(detail?.videoUrls || []).map((source) => {
                const localItem = getAvailableDownload(source)
                return localItem ? (
                  <Menu key={getDownloadKey(item.videoCode, source)} title={`${source.label} · 已下载`} systemImage="arrow.down.circle.fill">
                    <Button title="播放本机版本" systemImage="play.rectangle.fill" action={() => playSourceLocally(source)} />
                    <Button title="在线播放" systemImage="network" action={() => { void playSourceOnline(source) }} />
                  </Menu>
                ) : (
                  <Button key={getDownloadKey(item.videoCode, source)} title={source.label} systemImage="play.circle" action={() => { void playSourceOnline(source) }} />
                )
              })}
              <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
            </Menu>
            <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
              <Menu
                  label={<HanimeActionPillContent title={activeDownload || downloading ? "正在下载" : "保存剧集"} systemImage="arrow.down.circle" tone="secondary" />}
                  disabled={downloading || !detail}
                  {...downloadEpisodeMenuStyleProps}
                >
                  {(detail?.videoUrls || []).map((source) => {
                    const isDownloaded = getAvailableDownload(source) !== null
                    return (
                      <Button
                        key={getDownloadKey(item.videoCode, source)}
                        title={source.label}
                        systemImage={isDownloaded ? "checkmark" : undefined}
                        action={() => { void downloadSource(source) }}
                      />
                    )
                  })}
              </Menu>
              <Button
                action={toggleFavorite}
                buttonStyle="plain"
                frame={{ maxWidth: "infinity", minHeight: 44 }}
                contentShape="capsule"
                glassEffect={glassEffectFor("navigation", "capsule", true)}
                glassEffectTransition="materialize"
              >
                <HanimeActionPillContent title={favorite ? "已收藏" : "收藏"} systemImage={favorite ? "heart.fill" : "heart"} />
              </Button>
            </HStack>
          </VStack>
          </VStack>
        </GlassSurface>
      </Section>

      {resumeSource ? (
        <Section>
          <ShelfHeader title="最近续播" />
          {getAvailableDownload(resumeSource) ? (
            <Menu
              label={<Label title={`继续：${resumeSource.label} · 本机可用`} systemImage="arrow.down.circle.fill" />}
              menuIndicator="hidden"
              menuStyle="button"
              buttonStyle="plain"
              glassEffectTransition="materialize"
              {...glassListRowStyleProps}
            >
              <Button title="播放本机版本" systemImage="play.rectangle.fill" action={() => playSourceLocally(resumeSource)} />
              <Button title="在线播放" systemImage="network" action={() => { void playSourceOnline(resumeSource) }} />
              <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
            </Menu>
          ) : (
            <Button {...glassListRowStyleProps} action={() => { void playSourceOnline(resumeSource) }}>
              <Label title={`继续：${resumeSource.label}`} systemImage="clock.arrow.circlepath" />
            </Button>
          )}
        </Section>
      ) : null}

      <Section>
        <ShelfHeader title="更多操作" />
        <NavigationLink {...glassListRowStyleProps} destination={<BangumiDetailView title={item.title || displayTitle} subjectId={bangumiSubject?.id} onSubjectSelected={selectBangumiSubject} onSubjectCleared={clearBangumiSubject} />}>
          <Label title={bangumiSubject ? "查看或重新匹配 Bangumi 条目" : "匹配 Bangumi 条目"} systemImage="film.stack" />
        </NavigationLink>
        <BangumiVideoProgressPanel
          subject={bangumiSubject}
          status={bangumiStatus}
          authenticated={bangumiAuthenticated}
          loading={bangumiLoading}
          updating={bangumiUpdating}
          message={bangumiMessage}
          onUpdate={updateBangumiProgress}
        />
        {!bangumiAuthenticated ? (
          <NavigationLink {...glassListRowStyleProps} destination={<BangumiOAuthView />}>
            <Label title="授权 Bangumi 账号" systemImage="key.fill" />
          </NavigationLink>
        ) : null}
        <Button {...glassListRowStyleProps} action={() => { void copyCurrentTitle(item.title || displayTitle) }}>
          <CopyTitleActionRow />
        </Button>
        <Button {...glassListRowStyleProps} action={() => { void openOfficialDetail() }}>
          <Label title="打开官网" systemImage="safari" />
        </Button>
      </Section>

      {detail && detail.videoUrls.length > 0 ? (
        <Section>
          <ShelfHeader title="剧集" caption={`${detail.videoUrls.length} 个可用剧集或线路`} />
          <EpisodeGrid episodes={detail.videoUrls} openingSourceUrl={openingSourceUrl} onOpenOnline={playSourceOnline} onOpenLocal={playSourceLocally} downloadedKeys={new Set(downloaded.filter((entry) => entry.isFileAvailable !== false).map((entry) => entry.downloadKey))} lastWatchedKey={episodeHistory[0]?.sourceKey} videoCode={item.videoCode} />
        </Section>
      ) : (
        <Section>
          <EmptyState
            icon="play.rectangle"
            title="暂未找到可播放剧集"
            message="可打开官网确认可用线路，或稍后返回刷新。"
            actionTitle="打开官网"
            action={openOfficialDetail}
          />
        </Section>
      )}

      {detail ? (
        <Section>
          <ShelfHeader title="简介" />
          <Text
            font="body"
            foregroundStyle={detail.introduction ? undefined : "secondaryLabel"}
            multilineTextAlignment="leading"
            frame={{ maxWidth: "infinity", alignment: "leading" }}
            padding={{ horizontal: 12, vertical: 12 }}
            glassEffect={{ glass: UIGlass.clear().interactive(false), shape: { type: "rect", cornerRadius: 16, style: "continuous" } }}
            listRowBackground={<></>}
            listRowSeparator="hidden"
          >
            {detail.introduction || "该视频暂未提供简介。"}
          </Text>
        </Section>
      ) : null}

      {detail?.tags && detail.tags.length > 0 ? (
        <Section>
          <ShelfHeader title="标签" caption={`${detail.tags.length} 个`} />
          <TagGrid tags={detail.tags} onSelect={setActiveTag} />
        </Section>
      ) : null}

      {detail?.originalComic ? (
        <Section>
          <ShelfHeader title="关联内容" />
          <Button {...glassListRowStyleProps} action={() => { void Safari.present(detail.originalComic!, true) }}>
            <Label title="打开原作链接" systemImage="book.fill" />
          </Button>
        </Section>
      ) : null}

      {detail?.playlist && detail.playlist.video.length > 0 ? (
        <Section>
          <ShelfHeader title={detail.playlist.playlistName || "同系列"} caption={`${detail.playlist.video.length} 部`} />
          <PosterShelf height={DETAIL_SHELF_HEIGHT}>
            {detail.playlist.video.map((playlistItem) => (
              <NavigationLink key={playlistItem.videoCode} buttonStyle="plain" destination={<VideoDetailView video={playlistItem} />}>
                <PosterCardContent
                  coverUrl={playlistItem.coverUrl}
                  title={normalizeVideoTitle(playlistItem.title) || "未命名"}
                  caption={formatVideoMeta(playlistItem)}
                  ageRating={playlistItem.ageRating}
                />
              </NavigationLink>
            ))}
          </PosterShelf>
        </Section>
      ) : null}

      {detail?.relatedHanimes && detail.relatedHanimes.length > 0 ? (
        <Section>
          <ShelfHeader title="相关推荐" caption={`${detail.relatedHanimes.length} 部`} />
          <PosterShelf height={DETAIL_SHELF_HEIGHT}>
            {detail.relatedHanimes.map((related) => (
              <NavigationLink key={related.videoCode} buttonStyle="plain" destination={<VideoDetailView video={related} />}>
                <PosterCardContent
                  coverUrl={related.coverUrl}
                  title={normalizeVideoTitle(related.title) || "未命名"}
                  caption={formatVideoMeta(related)}
                  ageRating={related.ageRating}
                />
              </NavigationLink>
            ))}
          </PosterShelf>
        </Section>
      ) : null}
      </List>
    </ZStack>
  )
}

function BangumiVideoProgressPanel(props: {
  subject: BangumiSubject | null
  status: BangumiProgressStatus | null
  authenticated: boolean
  loading: boolean
  updating: boolean
  message: string
  onUpdate: (status: BangumiProgressStatus, type: number) => void
}) {
  const title = props.subject?.nameCn || props.subject?.name
  return (
    <GlassSurface material="content">
      <VStack alignment="leading" spacing={10} padding={{ horizontal: 14, vertical: 12 }} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
        <HStack alignment="center" spacing={12} frame={{ maxWidth: "infinity", alignment: "center" }}>
          <Image systemName={props.status ? "checkmark.circle.fill" : "arrow.triangle.2.circlepath"} font={20} foregroundStyle="secondaryLabel" frame={{ width: 30, height: 28, alignment: "center" }} />
          <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="subheadline" fontWeight="semibold">Bangumi 进度联动</Text>
            <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">
              {props.loading ? "正在读取账号与条目状态…" : title ? `${title} · ${props.status ? `当前为“${props.status}”` : props.authenticated ? "尚未加入进度管理" : "等待账号授权"}` : "先匹配当前 GiriGiri 视频对应的 Bangumi 条目"}
            </Text>
          </VStack>
        </HStack>
        {props.subject && props.authenticated ? (
          <HStack spacing={7} padding={{ vertical: 3 }} frame={{ maxWidth: "infinity", alignment: "center" }}>
            {BANGUMI_STATUS_ACTIONS.map((action) => (
              <Button
                key={action.label}
                action={() => props.onUpdate(action.label, action.type)}
                disabled={props.updating}
                buttonStyle="plain"
                padding={{ vertical: 8 }}
                frame={{ maxWidth: "infinity", alignment: "center" }}
                glassEffect={glassEffectFor(props.status === action.label ? "navigation" : "content", "capsule", true)}
                glassEffectTransition="materialize"
                accessibilityLabel={`${props.status === action.label ? "当前状态，" : ""}整部番剧标记为${action.label}`}
              >
                <HStack alignment="center" spacing={4} frame={{ maxWidth: "infinity", alignment: "center" }}>
                  <Image systemName={props.status === action.label ? "checkmark" : action.icon} font={15} foregroundStyle="secondaryLabel" frame={{ width: 18, height: 22, alignment: "center" }} />
                  <Text font="caption" fontWeight="semibold">{action.label}</Text>
                </HStack>
              </Button>
            ))}
          </HStack>
        ) : null}
        {props.message ? (
          <Text
            font="caption2"
            foregroundStyle="secondaryLabel"
            multilineTextAlignment="leading"
            padding={{ leading: 42 }}
            frame={{ maxWidth: "infinity", alignment: "leading" }}
          >
            {props.message}
          </Text>
        ) : null}
      </VStack>
    </GlassSurface>
  )
}

function formatDetailDisplayTitle(item: HanimeVideoItem, detail: HanimeVideoDetail | null): string {
  const title = normalizeVideoTitle(item.title)
  const studio = cleanDetailMeta(detail?.artist?.name || item.currentArtist)
  if (!studio) return title

  const escapedStudio = studio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const displayTitle = title.replace(new RegExp(`^\\[\\s*${escapedStudio}\\s*\\]\\s*`, "i"), "").trim()
  return displayTitle || title
}

function CopyTitleActionRow() {
  return (
    <HStack spacing={12} padding={{ vertical: 5 }} frame={{ maxWidth: "infinity", minHeight: 48, alignment: "center" }}>
      <Image systemName="doc.on.doc" font="body" foregroundStyle="secondaryLabel" frame={{ width: 24 }} />
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="body" fontWeight="semibold">复制完整标题</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">复制站点原始标题到剪贴板</Text>
      </VStack>
      <Image systemName="chevron.right" font="caption" foregroundStyle="tertiaryLabel" />
    </HStack>
  )
}

function SystemPlayPrimaryButton({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <HStack
      spacing={12}
      frame={{ maxWidth: "infinity", minHeight: 68, alignment: "center" }}
      padding={{ horizontal: 18, vertical: 14 }}
    >
      <Image systemName="play.tv.fill" font="title3" foregroundStyle="systemPink" />
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="headline" fontWeight="bold" foregroundStyle="systemPink" lineLimit={1}>{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading">{subtitle}</Text>
      </VStack>
      <Image systemName="chevron.right" font="subheadline" foregroundStyle="systemPink" />
    </HStack>
  )
}

function formatDetailMeta(item: HanimeVideoItem, detail: HanimeVideoDetail | null): string {
  const studio = detail?.artist?.name || item.currentArtist
  const parts = [
    studio ? `制作：${cleanDetailMeta(studio)}` : "",
    item.duration ? `时长：${cleanDetailMeta(item.duration)}` : "",
    detail?.views || item.views ? `观看：${cleanDetailMeta(detail?.views || item.views)}` : "",
    detail?.uploadTime || item.uploadTime ? `发布：${cleanDetailMeta(detail?.uploadTime || item.uploadTime)}` : "",
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "GiriGiri"
}

function cleanDetailMeta(value?: string): string {
  return (value || "")
    .replace(/^(觀看次數|观看次数)[:：]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
}

const TAG_GRID_COLUMNS = [
  { size: { type: "flexible" as const, min: 0 }, spacing: 8 },
  { size: { type: "flexible" as const, min: 0 }, spacing: 8 },
  { size: { type: "flexible" as const, min: 0 } },
]

function TagGrid({ tags, onSelect }: { tags: string[]; onSelect: (tag: string) => void }) {
  return (
    <LazyVGrid columns={TAG_GRID_COLUMNS} alignment="leading" spacing={8}>
      {tags.map((tag) => (
        <Button
          key={tag}
          action={() => { onSelect(tag) }}
          buttonStyle="plain"
          frame={{ maxWidth: "infinity", height: 44 }}
          glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: 14, style: "continuous" }, true)}
          glassEffectTransition="materialize"
        >
          <GlassGridCell height={44} fillWidth={true}>
            <TagGridCell tag={tag} />
          </GlassGridCell>
        </Button>
      ))}
    </LazyVGrid>
  )
}

function TagGridCell({ tag }: { tag: string }) {
  return (
    <Text font="caption" fontWeight="medium" lineLimit={1} foregroundStyle="label" frame={{ maxWidth: "infinity", minHeight: 34, alignment: "center" }} padding={{ horizontal: 6 }}>
      #{tag}
    </Text>
  )
}

const EPISODE_GRID_COLUMNS = [
  { size: { type: "flexible" as const, min: 0 }, spacing: 8 },
  { size: { type: "flexible" as const, min: 0 }, spacing: 8 },
  { size: { type: "flexible" as const, min: 0 } },
]

function EpisodeGrid({
  episodes,
  openingSourceUrl,
  onOpenOnline,
  onOpenLocal,
  downloadedKeys,
  lastWatchedKey,
  videoCode,
}: {
  episodes: HanimeVideoSource[]
  openingSourceUrl: string | null
  onOpenOnline: (episode: HanimeVideoSource) => Promise<void>
  onOpenLocal: (episode: HanimeVideoSource) => void
  downloadedKeys: Set<string>
  lastWatchedKey?: string
  videoCode: string
}) {
  return (
    <VStack
      alignment="leading"
      spacing={12}
      padding={{ vertical: 4 }}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <GlassSurface material="content">
        <VStack alignment="leading" spacing={12} padding={{ horizontal: 16, vertical: 16 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="headline" fontWeight="semibold">选择剧集</Text>
            <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading">
              点按剧集即可播放；支持全屏与画中画。
            </Text>
          </VStack>
          <SubtitleAvailability episodes={episodes} />
        </VStack>
      </GlassSurface>
      <LazyVGrid
        columns={EPISODE_GRID_COLUMNS}
        alignment="leading"
        spacing={8}
        listRowBackground={<></>}
        listRowSeparator="hidden"
      >
        {episodes.map((episode) => {
          const opening = openingSourceUrl === episode.url
          const episodeKey = getDownloadKey(videoCode, episode)
          const downloaded = downloadedKeys.has(episodeKey)
          const label = (
            <GlassGridCell height={52} fillWidth={true}>
              <EpisodeCell label={episode.label} opening={opening} downloaded={downloaded} lastWatched={lastWatchedKey === episodeKey} />
            </GlassGridCell>
          )
          return downloaded ? (
            <Menu
              key={episode.url}
              label={label}
              disabled={openingSourceUrl !== null}
              menuIndicator="hidden"
              menuStyle="button"
              buttonStyle="plain"
              frame={{ maxWidth: "infinity", height: 52 }}
              glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: 14, style: "continuous" }, true)}
              glassEffectTransition="materialize"
              accessibilityLabel={`${episode.label}，已下载，展开播放方式`}
            >
              <Button title="播放本机版本" systemImage="play.rectangle.fill" action={() => onOpenLocal(episode)} />
              <Button title="在线播放" systemImage="network" action={() => { void onOpenOnline(episode) }} />
              <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
            </Menu>
          ) : (
            <Button
              key={episode.url}
              action={() => { void onOpenOnline(episode) }}
              disabled={openingSourceUrl !== null}
              buttonStyle="plain"
              frame={{ maxWidth: "infinity", height: 52 }}
              glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: 14, style: "continuous" }, true)}
              glassEffectTransition="materialize"
            >
              {label}
            </Button>
          )
        })}
      </LazyVGrid>
    </VStack>
  )
}

function SubtitleAvailability({ episodes }: { episodes: HanimeVideoSource[] }) {
  const simplifiedCount = episodes.filter((episode) => shortSubtitleVersion(splitEpisodeLabel(episode.label).version) === "简中").length
  const traditionalCount = episodes.filter((episode) => shortSubtitleVersion(splitEpisodeLabel(episode.label).version) === "繁中").length
  const message = simplifiedCount === 0 && traditionalCount === 0
    ? "当前未标注简中或繁中字幕，请按剧集来源选择播放。"
    : simplifiedCount === 0
      ? "当前仅提供繁中字幕，暂无简中版本。"
      : traditionalCount === 0
        ? "当前仅提供简中字幕，暂无繁中版本。"
        : "简中与繁中字幕均有提供，请按版本选择剧集。"

  return (
    <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <HStack spacing={8}>
        <Image systemName="captions.bubble" font="caption" foregroundStyle="secondaryLabel" frame={{ width: 20 }} />
        <Text font="subheadline" fontWeight="semibold">字幕可用性</Text>
        <SubtitleStatusBadge title="简中" count={simplifiedCount} tone="systemPink" />
        <SubtitleStatusBadge title="繁中" count={traditionalCount} tone="systemIndigo" />
      </HStack>
      <Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{message}</Text>
    </VStack>
  )
}

function SubtitleStatusBadge({ title, count, tone }: { title: string; count: number; tone: "systemPink" | "systemIndigo" }) {
  const available = count > 0
  return (
    <Text
      font="caption2"
      fontWeight="bold"
      foregroundStyle={available ? tone : "secondaryLabel"}
      padding={{ horizontal: 6, vertical: 3 }}
      glassEffect={{ glass: UIGlass.clear().interactive(false), shape: "capsule" }}
    >
      {available ? `${title} ${count} 集` : `${title} 暂无`}
    </Text>
  )
}

const downloadEpisodeMenuStyleProps = {
  frame: { maxWidth: "infinity" as const, minHeight: 44 },
  contentShape: "capsule" as const,
  menuIndicator: "hidden" as const,
  menuStyle: "button" as const,
  buttonStyle: "plain" as const,
  glassEffect: {
    glass: UIGlass.clear().interactive(false),
    shape: "capsule" as const,
  },
  glassEffectTransition: "materialize" as const,
}

function EpisodeCell({ label, opening, downloaded, lastWatched }: { label: string; opening: boolean; downloaded: boolean; lastWatched: boolean }) {
  const { version, episode } = splitEpisodeLabel(label)
  const versionTone = subtitleVersionTone(version)

  return (
    <HStack spacing={3} frame={{ maxWidth: "infinity", minHeight: 44, alignment: "center" }}> 
      <Image systemName={opening ? "hourglass" : downloaded ? "arrow.down.circle.fill" : lastWatched ? "clock.fill" : "play.circle.fill"} font="caption2" foregroundStyle={downloaded ? "systemGreen" : lastWatched ? "systemBlue" : "systemPink"} />
      {opening ? (
        <Text font="caption" fontWeight="semibold" foregroundStyle="systemPink" lineLimit={1}>打开中</Text>
      ) : (
        <HStack spacing={3} frame={{ alignment: "center" }}>
          {version ? (
            <Text font="caption2" fontWeight="bold" foregroundStyle={versionTone} lineLimit={1} padding={{ horizontal: 4, vertical: 3 }} glassEffect={{ glass: UIGlass.clear().interactive(false), shape: "capsule" }}> 
              {shortSubtitleVersion(version)}
            </Text>
          ) : null}
          <Text font="caption" fontWeight="semibold" foregroundStyle="label" lineLimit={1}>{episode}</Text>
          {downloaded ? <Text font="caption2" fontWeight="bold" foregroundStyle="systemGreen" lineLimit={1}>离线</Text> : lastWatched ? <Text font="caption2" fontWeight="bold" foregroundStyle="systemPink" lineLimit={1}>最近</Text> : null}
        </HStack>
      )}
    </HStack>
  )
}

function splitEpisodeLabel(label: string): { version: string; episode: string } {
  const parts = label.split(" · ")
  if (parts.length < 2) return { version: "", episode: label }
  return { version: parts.slice(0, -1).join(" · "), episode: parts[parts.length - 1] }
}

function shortSubtitleVersion(value: string): string {
  const normalized = value.replace(/\s+/g, "")
  if (/(繁|繁体|繁中|big5|traditional)/i.test(normalized)) return "繁中"
  if (/(简|簡|简体|簡體|简中|簡中|gb|simplified)/i.test(normalized)) return "简中"
  return value.length > 5 ? value.slice(0, 5) : value
}

function subtitleVersionTone(value: string): "systemPink" | "systemIndigo" | "secondaryLabel" {
  const short = shortSubtitleVersion(value)
  if (short === "繁中") return "systemIndigo"
  if (short === "简中") return "systemPink"
  return "secondaryLabel"
}

function TagSearchView({ tag }: { tag: string }) {
  const [results, setResults] = useState<HanimeVideoItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadTagResults(1)
  }, [tag])

  async function loadTagResults(nextPage: number) {
    try {
      setLoading(true)
      setError(null)
      if (nextPage === 1) setHasMore(true)
      setPage(nextPage)
      const data = await hanimeClient.searchVideos({
        page: nextPage,
        sort: "time",
        tags: [tag],
      })
      setResults((current) => {
        const previous = nextPage === 1 ? [] : current
        const merged = mergeVideoItems(previous, data)
        setHasMore(data.length > 0 && (nextPage === 1 || merged.length > previous.length))
        return merged
      })
    } catch (searchError) {
      console.error("GiriGiri 标签搜索失败:", searchError)
      setError(`${searchError}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ZStack>
      <PageBackground />
      <List listStyle="inset" navigationTitle={`#${tag}`} scrollContentBackground="hidden" listRowBackground={<></>} listRowSeparator="hidden">
      <Section>
        <HStack alignment="center" spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>标签发现</Text>
            <Text font="headline" fontWeight="semibold" lineLimit={1}>{`#${tag}`}</Text>
          </VStack>
          <HanimeActionPill title={loading ? "刷新中" : "刷新"} systemImage="arrow.clockwise" action={() => { void loadTagResults(1) }} disabled={loading} />
        </HStack>
      </Section>

      {error ? (
        <Section>
          <ErrorState message={error} onRetry={() => { void loadTagResults(page) }} />
        </Section>
      ) : null}

      {loading && results.length === 0 ? (
        <Section>
          <LoadingState message={`正在搜索 #${tag}…`} />
        </Section>
      ) : null}

      {results.length > 0 ? (
        <Section>
          <ShelfHeader title="结果" caption={`已加载 ${page} 页 · ${results.length} 部`} />
          <PosterGrid>
            {results.map((result) => (
              <NavigationLink key={result.videoCode} buttonStyle="plain" destination={<VideoDetailView video={result} />}>
                <PosterCardContent
                  coverUrl={result.coverUrl}
                  title={normalizeVideoTitle(result.title) || "未命名"}
                  caption={formatVideoMeta(result)}
                  ageRating={result.ageRating}
                />
              </NavigationLink>
            ))}
          </PosterGrid>
          {hasMore ? (
            <Button {...glassListRowStyleProps} action={() => { void loadTagResults(page + 1) }} disabled={loading}>
              <Label title={loading ? "加载中" : "加载下一页"} systemImage="arrow.down.circle" />
            </Button>
          ) : (
            <GlassListRow><Text font="caption" foregroundStyle="secondaryLabel">已没有更多结果</Text></GlassListRow>
          )}
        </Section>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <Section>
          <EmptyState
            icon="tag"
            title="没有找到标签结果"
            message="可能暂无该标签内容，或需要先完成官网验证。"
          />
        </Section>
      ) : null}
      </List>
    </ZStack>
  )
}

function mergeVideoItems(current: HanimeVideoItem[], next: HanimeVideoItem[]): HanimeVideoItem[] {
  const byCode = new Map<string, HanimeVideoItem>()
  for (const item of current) byCode.set(item.videoCode, item)
  for (const item of next) byCode.set(item.videoCode, item)
  return Array.from(byCode.values())
}

function toVideoItem(detail: HanimeVideoDetail): HanimeVideoItem {
  const code = extractVideoCode(detail.watchUrl) || extractVideoCode(detail.videoUrls[0]?.url) || ""
  return {
    title: detail.title,
    coverUrl: detail.coverUrl,
    videoCode: code,
    views: detail.views,
    uploadTime: detail.uploadTime,
    currentArtist: detail.artist?.name,
    ageRating: detail.ageRating,
  }
}
