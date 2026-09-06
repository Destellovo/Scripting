import {
  Button,
  HStack,
  Image,
  Label,
  List,
  Menu,
  Navigation,
  Section,
  Spacer,
  Text,
  useEffect,
  useState,
  VideoPlayer,
  VStack,
  ZStack,
} from "scripting"
import { HanimeDownloadedItem, hanimeDatabase } from "../../class/hanime_database"
import { formatFileSize, getDownloadKey, hanimeDownloadManager } from "../../class/hanime_download_manager"
import { EmptyState } from "../components/empty_state"
import { HanimeActionPill } from "../components/hanime_ui"
import { AgeRatingBadge, normalizeVideoTitle } from "./video_components"
import { glassListRowStyleProps, GlassIconButton, GlassListRow, GlassSurface, PageBackground, PosterCover, ShelfHeader } from "../../design-glass"

export function LocalVideoPlayerView({ item }: { item: HanimeDownloadedItem }) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function openSystemPlayer() {
    if (opening || deleted) return
    try {
      setOpening(true)
      setError(null)
      if (!await hanimeDownloadManager.isDownloadAvailable(item)) {
        throw new Error("本地下载文件当前不可访问。请返回片库重新检查 iCloud 或本机存储后再试。")
      }
      if (!item.sourceType?.includes("mpegurl")) {
        await hanimeDatabase.addHistory(item, {
          sourceKey: item.downloadKey || getDownloadKey(item.videoCode, { label: item.sourceLabel || "本地剧集", url: item.sourceUrl, type: item.sourceType || "" }),
          sourceLabel: item.sourceLabel || "本地剧集",
          sourceUrl: item.sourceUrl,
        })
        await QuickLook.previewURLs([item.filePath], true)
        return
      }
      const player = new AVPlayer()
      try {
        player.onReadyToPlay = () => player.play()
        player.onError = (playerError) => setError(`${playerError}`)
        if (!player.setSource(item.filePath)) {
          throw new Error("离线 HLS 文件无法打开，可能已被删除或当前系统不支持该格式。")
        }
        await hanimeDatabase.addHistory(item, {
          sourceKey: item.downloadKey || getDownloadKey(item.videoCode, { label: item.sourceLabel || "本地剧集", url: item.sourceUrl, type: item.sourceType || "" }),
          sourceLabel: item.sourceLabel || "本地剧集",
          sourceUrl: item.sourceUrl,
        })
        SharedAudioSession.setCategory("playback", [])
        SharedAudioSession.setActive(true)
        await Navigation.present({
          element: <LocalSystemPlayerModal player={player} />,
          modalPresentationStyle: "fullScreen",
        })
      } finally {
        player.dispose()
        SharedAudioSession.setActive(false)
      }
    } catch (playError) {
      setError(`${playError}`)
    } finally {
      setOpening(false)
    }
  }

  async function exportLocalFile() {
    try {
      if (!await hanimeDownloadManager.isDownloadAvailable(item)) {
        throw new Error("本地下载文件当前不可访问。请返回片库重新检查后再试。")
      }
      const result = await hanimeDownloadManager.exportToFilesApp(item)
      await Dialog.alert({
        title: "已导出到“文件”",
        message: result.isDirectory
          ? `已导出为 HLS 文件夹，可在 ${result.location} 查看。`
          : `已导出视频文件，可在 ${result.location} 查看。`,
      })
    } catch (exportError) {
      console.error("导出 GiriGiri 本机文件失败:", exportError)
      await Dialog.alert({ title: "无法导出文件", message: "文件未能导出到“文件”App。请确认本机存储或 iCloud Drive 可用后重试。" })
    }
  }

  async function deleteLocalFile() {
    if (deleting) return
    try {
      setDeleting(true)
      await hanimeDownloadManager.deleteDownload(item)
      setDeleted(true)
    } catch (deleteError) {
      console.error("删除 GiriGiri 本机文件失败:", deleteError)
      await Dialog.alert({ title: "无法删除本机文件", message: "本机文件与下载记录未能完整删除。请确认文件可访问后重试。" })
    } finally {
      setDeleting(false)
    }
  }

  if (deleted) {
    return (
      <ZStack>
        <PageBackground />
        <List listStyle="inset" navigationTitle="本地播放" scrollContentBackground="hidden" listRowBackground={<></>} listRowSeparator="hidden">
          <Section>
            <EmptyState
              icon="trash"
              title="本地文件已删除"
              message="本地文件和下载记录已删除；收藏与观看历史仍会保留。"
            />
          </Section>
        </List>
      </ZStack>
    )
  }

  return (
    <ZStack>
      <PageBackground />
      <List
        listStyle="inset"
        navigationTitle="本地播放"
        listRowSpacing={10}
        listSectionSpacing={24}
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
      >
      <Section>
        <VStack alignment="leading" spacing={14} padding={{ vertical: 6 }} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <GlassSurface material="content">
          <VStack alignment="leading" spacing={12} padding={18} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <HStack alignment="top" spacing={14}>
              <PosterCover url={item.coverUrl} size="compact" />
              <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="caption2" foregroundStyle="secondaryLabel">离线播放</Text>
                <Text font="headline" fontWeight="semibold" lineLimit={3} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{normalizeVideoTitle(item.title)}</Text>
                <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{[item.sourceLabel || "本地剧集", item.sourceType?.includes("mpegurl") ? "HLS 离线播放包" : formatFileSize(item.fileSize)].join(" · ")}</Text>
                <AgeRatingBadge rating={item.ageRating} />
              </VStack>
            </HStack>
            <HanimeActionPill title={opening ? "正在打开…" : "播放"} systemImage={opening ? "hourglass" : "play.rectangle.fill"} action={() => { void openSystemPlayer() }} disabled={opening} />
            {item.sourceType?.includes("mpegurl") ? <Text font="caption" foregroundStyle="secondaryLabel">此项目将以离线 HLS 方式播放。</Text> : null}
          </VStack>
          </GlassSurface>

          {error ? (
            <VStack alignment="leading" spacing={4} padding={{ horizontal: 12, vertical: 10 }} frame={{ maxWidth: "infinity", alignment: "leading" }} glassEffect={{ glass: UIGlass.clear().interactive(false), shape: { type: "rect", cornerRadius: 14, style: "continuous" } }} listRowBackground={<></>} listRowSeparator="hidden">
              <Text font="caption" fontWeight="semibold" foregroundStyle="systemRed">播放异常</Text>
              <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3} multilineTextAlignment="leading">{error}</Text>
            </VStack>
          ) : null}

        </VStack>
      </Section>

      <Section>
          <ShelfHeader title="文件信息" />
        <InfoRow title="文件大小" value={formatFileSize(item.fileSize)} />
        <InfoRow title="下载时间" value={formatTime(item.downloadedAt)} />
        <InfoRow title="格式" value={item.sourceType?.includes("mpegurl") ? "HLS 离线包" : "MP4 视频"} />
        <InfoRow title="来源" value={item.sourceLabel || item.sourceType || "直连视频"} />
      </Section>

      <Section>
          <ShelfHeader title="管理" />
        <Button {...glassListRowStyleProps} action={() => { void exportLocalFile() }}> 
          <Label title="导出到“文件”" systemImage="folder.badge.plus" />
        </Button>
        <Menu label={<Label title={deleting ? "正在删除本机文件…" : "删除本机文件"} systemImage={deleting ? "hourglass" : "trash"} />} {...glassListRowStyleProps} disabled={deleting} menuIndicator="hidden" menuStyle="button" buttonStyle="plain" glassEffectTransition="materialize" accessibilityLabel="删除本机文件与下载记录，展开确认选项">
          <Button title="收藏与观看记录会保留" systemImage="info.circle" disabled action={() => {}} />
          <Button title="确认删除本机文件" systemImage="trash" role="destructive" action={() => { void deleteLocalFile() }} />
          <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
        </Menu>
      </Section>
      </List>
    </ZStack>
  )
}

function LocalSystemPlayerModal({ player }: { player: AVPlayer }) {
  const dismiss = Navigation.useDismiss()

  return (
    <ZStack alignment="topTrailing" frame={{ maxWidth: "infinity", maxHeight: "infinity" }} background="black">
      <VideoPlayer player={player} frame={{ maxWidth: "infinity", maxHeight: "infinity" }} />
      <HStack padding={{ horizontal: 18, vertical: 12 }}>
        <GlassIconButton title="关闭播放器" systemName="xmark" material="media" action={() => dismiss("close")} />
      </HStack>
    </ZStack>
  )
}

function InfoRow({ title, value }: { title: string; value: string }) {
  return (
    <GlassListRow>
      <HStack alignment="top" spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text>{title}</Text>
        <Spacer />
        <Text foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="trailing">{value}</Text>
      </HStack>
    </GlassListRow>
  )
}

function formatTime(value?: number): string {
  if (!value) return "未知"
  const date = new Date(value)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
}
