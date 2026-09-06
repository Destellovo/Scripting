import {
  Button,
  Group,
  HStack,
  Image,
  NavigationLink,
  List,
  Menu,
  ProgressView,
  Section,
  Text,
  VStack,
  useEffect,
  useState,
} from "scripting"
import { formatFileSize, HanimeDownloadTask, hanimeDownloadManager } from "../../class/hanime_download_manager"
import { HanimeDownloadedItem } from "../../class/hanime_database"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"
import { LocalVideoPlayerView } from "../hanime/local_video_player"
import { HanimeVideoRow } from "../hanime/video_components"
import { GIRIGIRI_GLASS_TOKENS, glassEffectFor, GlassIconButton, glassListRowStyleProps, GlassListRow, GlassSurface, ShelfHeader } from "../../design-glass"

export function DownloadView({ homeScreen = false }: { homeScreen?: boolean } = {}) {
  const [tasks, setTasks] = useState<HanimeDownloadTask[]>(hanimeDownloadManager.getTasks())
  const [downloads, setDownloads] = useState<HanimeDownloadedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = hanimeDownloadManager.subscribe(() => setTasks(hanimeDownloadManager.getTasks()))
    void loadDownloads()
    return unsubscribe
  }, [])

  async function loadDownloads() {
    try {
      setLoading(true)
      setError(null)
      setDownloads(await hanimeDownloadManager.getDownloads())
    } catch (loadError) {
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }

  async function retry(task: HanimeDownloadTask) {
    try {
      await hanimeDownloadManager.retry(task.downloadKey)
      await loadDownloads()
    } catch (retryError) {
      console.error("继续 GiriGiri 下载任务失败:", retryError)
      await Dialog.alert({ title: "无法继续下载", message: "下载任务未能恢复。请确认网络与来源仍可访问后重试。" })
    }
  }

  async function clearPendingTask(task: HanimeDownloadTask) {
    try {
      await hanimeDownloadManager.clearPendingTask(task.downloadKey)
    } catch (clearError) {
      console.error("清理 GiriGiri 下载临时数据失败:", clearError)
      await Dialog.alert({ title: "无法清理临时数据", message: "临时下载数据仍已保留。请稍后重试。" })
    }
  }

  async function removeUnavailableRecord(item: HanimeDownloadedItem) {
    try {
      await hanimeDownloadManager.removeUnavailableDownloadRecord(item)
      await loadDownloads()
    } catch (removeError) {
      console.error("删除 GiriGiri 失效下载记录失败:", removeError)
      await Dialog.alert({ title: "无法删除下载记录", message: "失效记录仍已保留。请重新检查文件状态后重试。" })
    }
  }

  async function deleteDownload(item: HanimeDownloadedItem) {
    try {
      await hanimeDownloadManager.deleteDownload(item)
      await loadDownloads()
    } catch (deleteError) {
      console.error("删除 GiriGiri 本机文件失败:", deleteError)
      await Dialog.alert({ title: "无法删除本机文件", message: "本机文件与下载记录未能完整删除。请确认文件可访问后重试。" })
    }
  }

  return (
    <List
      listStyle="inset"
      scrollContentBackground="hidden"
      scrollEdgeEffectHidden={{ edges: "top", hidden: homeScreen }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle={homeScreen ? "" : "下载"}
      navigationBarTitleDisplayMode={homeScreen ? "inline" : "large"}
      onAppear={() => { void loadDownloads() }}
    >
      <Section>
        <HStack alignment="center" spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
          <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <DownloadMetric icon="arrow.down.circle" title="进行中" value={`${tasks.filter((task) => task.status === "downloading" || task.status === "finalizing").length}`} />
            <DownloadMetric icon="pause.circle" title="待处理" value={`${tasks.filter((task) => task.status === "paused" || task.status === "failed").length}`} />
            <DownloadMetric icon="tray" title="已下载" value={loading ? "—" : `${downloads.length}`} />
          </HStack>
          <GlassIconButton title="刷新状态" systemName="arrow.clockwise" action={() => { void loadDownloads() }} />
        </HStack>
      </Section>

      {loading && tasks.length === 0 && downloads.length === 0 ? (
        <Section>
          <LoadingState message="正在检查下载记录与本机文件…" />
        </Section>
      ) : null}

      {tasks.length > 0 ? (
        <Section>
          <ShelfHeader title="下载任务" caption={`${tasks.length} 项`} />
          {tasks.map((task) => <DownloadTaskRow key={task.downloadKey} task={task} onRetry={retry} onClear={clearPendingTask} />)}
        </Section>
      ) : null}

      {!loading && error ? <Section><ErrorState title="无法载入下载内容" hint="下载记录或本机文件状态未能读取。请确认存储可用后重试。" message={error} onRetry={() => { void loadDownloads() }} /></Section> : null}

      {downloads.length > 0 ? (
        <Section>
          <ShelfHeader title="已下载" caption={`${downloads.length} 项`} />
          {downloads.some((item) => item.isFileAvailable === false) ? (
            <GlassListRow>
              <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Image systemName="exclamationmark.triangle" font="caption" foregroundStyle="secondaryLabel" />
                <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3}>
                  部分文件当前不可访问，记录已保留。确认本机存储或 iCloud 文件可用后再操作。
                </Text>
              </HStack>
            </GlassListRow>
          ) : null}
          {downloads.map((item) => {
            const unavailable = item.isFileAvailable === false
            const row = (
              <HanimeVideoRow
                video={item}
                accessory={
                  <VStack alignment="trailing" spacing={3} frame={{ minWidth: 60, alignment: "trailing" }}>
                    <Image systemName={unavailable ? "exclamationmark.circle" : "checkmark.circle"} font="caption" foregroundStyle="secondaryLabel" />
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1} multilineTextAlignment="trailing">{unavailable ? "不可用" : formatFileSize(item.fileSize)}</Text>
                  </VStack>
                }
              />
            )
            return unavailable ? (
              <Group
                {...glassListRowStyleProps}
                key={item.downloadKey}
                contextMenu={{ menuItems: <Group><Menu title="仅删除失效记录" systemImage="trash"><Button title="确认删除失效记录" systemImage="trash" role="destructive" action={() => { void removeUnavailableRecord(item) }} /><Button title="取消" systemImage="xmark" role="cancel" action={() => {}} /></Menu></Group> }}
              >
                {row}
              </Group>
            ) : (
              <NavigationLink
                {...glassListRowStyleProps}
                key={item.downloadKey}
                destination={<LocalVideoPlayerView item={item} />}
                contextMenu={{ menuItems: <Group><Menu title="删除本机文件" systemImage="trash"><Button title="确认删除本机文件" systemImage="trash" role="destructive" action={() => { void deleteDownload(item) }} /><Button title="取消" systemImage="xmark" role="cancel" action={() => {}} /></Menu></Group> }}
              >
                {row}
              </NavigationLink>
            )
          })}
        </Section>
      ) : null}

      {!loading && !error && tasks.length === 0 && downloads.length === 0 ? (
        <Section>
          <EmptyState
            icon="arrow.down.circle"
            title="暂无下载内容"
            message="在作品详情页保存剧集后，下载进度与可用的本机文件会显示在这里。"
          />
        </Section>
      ) : null}
    </List>
  )
}

function DownloadMetric({ icon, title, value }: { icon: string; title: string; value: string }) {
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

function DownloadTaskRow({ task, onRetry, onClear }: { task: HanimeDownloadTask; onRetry: (task: HanimeDownloadTask) => void; onClear: (task: HanimeDownloadTask) => void }) {
  const isDownloading = task.status === "downloading"
  const isFinalizing = task.status === "finalizing"
  const percent = task.progress == null ? null : Math.min(100, Math.round(task.progress * 100))
  const statusText = isFinalizing
    ? "正在封装 MP4"
    : isDownloading
      ? (percent == null ? "正在准备下载" : `正在下载 · ${percent}%`)
      : task.status === "paused"
        ? "已暂停，可继续"
        : "下载失败"

  return (
    <GlassSurface material="content">
      <VStack alignment="leading" spacing={10} padding={GIRIGIRI_GLASS_TOKENS.spacing.regular} frame={{ maxWidth: "infinity", alignment: "leading" }}> 
      <HStack spacing={10} frame={{ maxWidth: "infinity" }}>
        <Image
          systemName={isFinalizing ? "arrow.triangle.2.circlepath" : isDownloading ? "arrow.down.circle" : task.status === "paused" ? "pause.circle" : "exclamationmark.circle"}
          font="headline"
          foregroundStyle="secondaryLabel"
          frame={{ width: 26, maxHeight: "infinity" }}
        />
        <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="subheadline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{task.video.title}</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>{task.sourceLabel || "默认剧集"} · {statusText}</Text>
        </VStack>
        {isFinalizing ? (
          <TaskAction title="封装中" systemImage="hourglass" interactive={false} />
        ) : isDownloading ? (
          <Button action={() => hanimeDownloadManager.pause(task.downloadKey)} buttonStyle="plain" glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.control, style: "continuous" }, true)} glassEffectTransition="materialize">
            <TaskAction title="暂停" systemImage="pause.fill" />
          </Button>
        ) : (
          <Button action={() => { void onRetry(task) }} buttonStyle="plain" glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.control, style: "continuous" }, true)} glassEffectTransition="materialize">
            <TaskAction title={task.status === "paused" ? "继续" : "重试"} systemImage="arrow.clockwise" />
          </Button>
        )}
      </HStack>
      {isDownloading || isFinalizing ? (
        <ProgressView
          value={task.progress ?? 0}
          total={1}
          currentValueLabel={
            <Text font="caption" foregroundStyle="secondaryLabel">
              {isFinalizing
                ? (percent == null ? "正在封装 MP4，请勿关闭脚本" : `正在封装 MP4 · ${percent}%`)
                : task.totalUnits > 0
                  ? `${task.completedUnits} / ${task.totalUnits} 个文件`
                  : "正在准备下载…"}
            </Text>
          }
        />
      ) : null}
      {task.status === "failed" && task.error ? (
        <HStack alignment="center" spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Image systemName="exclamationmark.circle" font="caption2" foregroundStyle="secondaryLabel" />
          <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={2}>{task.error}</Text>
        </HStack>
      ) : null}
        {!isDownloading && !isFinalizing ? (
          <Menu
            label={<TaskAction title="删除临时数据" systemImage="trash" />}
            menuIndicator="hidden"
            menuStyle="button"
            buttonStyle="plain"
            glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.control, style: "continuous" }, true)}
            glassEffectTransition="materialize"
            accessibilityLabel={`删除「${task.sourceLabel || "默认剧集"}」临时数据，展开确认选项`}
          >
            <Button title="确认删除临时数据" systemImage="trash" role="destructive" action={() => { void onClear(task) }} />
            <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
          </Menu>
        ) : null}
      </VStack>
    </GlassSurface>
  )
}

function TaskAction({ title, systemImage, interactive = true }: { title: string; systemImage: string; interactive?: boolean }) {
  return (
    <HStack
      spacing={5}
      padding={{ horizontal: 12, vertical: 8 }}
      frame={{ minHeight: 44 }}
      glassEffect={interactive ? undefined : glassEffectFor("content", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.control, style: "continuous" }, false)}
    >
      <Image systemName={systemImage} font="caption" foregroundStyle="label" />
      <Text font="caption" fontWeight="semibold" foregroundStyle="label" lineLimit={1}>{title}</Text>
    </HStack>
  )
}
