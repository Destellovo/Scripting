import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  ScrollView,
  Section,
  Text,
  VStack,
  ZStack,
  useEffect,
  useMemo,
  useState,
} from "scripting"
import { bangumiClient, BangumiEpisode, BangumiProgressItem, BangumiProgressStatus } from "../../class/bangumi"
import { BangumiDetailView, TranslationModal } from "../hanime/bangumi_detail"
import { extractBangumiTranslatableText } from "../../class/bangumi_translation"
import { BackgroundThemeProvider } from "../../design-glass"
import { ErrorState } from "../components/error_state"

import { LoadingState } from "../components/loading_state"
import { EmptyState } from "../components/empty_state"
import { glassEffectFor, glassListRowStyleProps, GlassSurface, PageBackground, ShelfHeader } from "../../design-glass"

const STATUS_FILTERS: Array<{ label: "全部" | BangumiProgressStatus; icon: string }> = [
  { label: "全部", icon: "tray.full" },
  { label: "想看", icon: "bookmark" },
  { label: "在看", icon: "play.circle" },
  { label: "看过", icon: "checkmark.circle" },
  { label: "搁置", icon: "pause.circle" },
  { label: "抛弃", icon: "xmark.circle" },
]

const STATUS_TYPES: Record<BangumiProgressStatus, number> = { 想看: 1, 看过: 2, 在看: 3, 搁置: 4, 抛弃: 5 }
const STATUS_ACTIONS = STATUS_FILTERS.slice(1) as Array<{ label: BangumiProgressStatus; icon: string }>

export function BangumiProgressView() {
  const [items, setItems] = useState<BangumiProgressItem[]>([])
  const [allItems, setAllItems] = useState<BangumiProgressItem[]>([])
  const [filter, setFilter] = useState<"全部" | BangumiProgressStatus>("全部")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null)
  const [episodesBySubject, setEpisodesBySubject] = useState<Record<number, BangumiEpisode[]>>({})
  const [episodesLoadingSubjectId, setEpisodesLoadingSubjectId] = useState<number | null>(null)
  const [detailSubject, setDetailSubject] = useState<BangumiProgressItem["subject"] | null>(null)
  const [translatingEpisodeId, setTranslatingEpisodeId] = useState<number | null>(null)
  const translation = useMemo(() => new Translation(), [])

  async function loadProgress(nextFilter = filter) {
    if (!bangumiClient.getOAuthStatus().isAuthenticated) {
      setError("请先完成 Bangumi 授权，再访问进度管理。")
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const nextItems = await bangumiClient.getProgressCollections()
      setAllItems(nextItems)
      setItems(nextFilter === "全部" ? nextItems : nextItems.filter((item) => item.status === nextFilter))
    } catch (loadError) {
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProgress()
  }, [])

  async function toggleEpisodes(subjectId: number) {
    if (expandedSubjectId === subjectId) {
      setExpandedSubjectId(null)
      return
    }
    setExpandedSubjectId(subjectId)
    if (episodesBySubject[subjectId]) return
    try {
      setEpisodesLoadingSubjectId(subjectId)
      const episodes = await bangumiClient.getProgressEpisodes(subjectId)
      setEpisodesBySubject((current) => ({ ...current, [subjectId]: episodes }))
    } catch (loadError) {
      setMessage(`单话加载失败：${loadError}`)
    } finally {
      setEpisodesLoadingSubjectId(null)
    }
  }

  async function translateEpisode(episode: BangumiEpisode) {
    if (!episode.description || translatingEpisodeId === episode.id) return
    setTranslatingEpisodeId(episode.id)
    const title = `EP ${episode.number} · ${episode.nameCn || episode.name || "本话简介"}`
    const original = extractBangumiTranslatableText(episode.description)
    try {
      if (!original) {
        await presentProgressTranslation(title, episode.description, "该简介没有可翻译的原文部分。")
        return
      }
      const translatedText = await translation.translate({ text: original.text, source: original.source, target: "zh" })
      await presentProgressTranslation(title, original.text, translatedText)
    } catch (translationError) {
      await presentProgressTranslation(title, original?.text || episode.description, `翻译失败：${translationError}`)
    } finally {
      setTranslatingEpisodeId(null)
    }
  }

  async function presentProgressTranslation(title: string, sourceText: string, translatedText: string) {
    await Navigation.present({
      element: <BackgroundThemeProvider><TranslationModal title={title} sourceText={sourceText} translatedText={translatedText} /></BackgroundThemeProvider>,
      modalPresentationStyle: "pageSheet",
    })
  }

  async function updateItem(item: BangumiProgressItem, status: BangumiProgressStatus) {
    try {
      setMessage("正在更新 Bangumi 进度…")
      await bangumiClient.updateProgress(item.subject.id, STATUS_TYPES[status])
      const movedItem = { ...item, status, statusType: STATUS_TYPES[status] }
      const nextAllItems = allItems.map((entry) => entry.subject.id === item.subject.id ? movedItem : entry)
      setAllItems(nextAllItems)
      setFilter(status)
      setItems(nextAllItems.filter((entry) => entry.status === status))
      setExpandedSubjectId(null)
      setMessage(`已移动到“${status}”分类`)
    } catch (updateError) {
      setMessage(`进度更新失败：${updateError}`)
    }
  }

  const counts = STATUS_ACTIONS.map((status) => ({ ...status, count: allItems.filter((item) => item.status === status.label).length }))

  return (
    <ZStack>
      <PageBackground />
      <List
        translationHost={translation}
        navigationTitle="Bangumi 进度"
        navigationBarTitleDisplayMode="inline"
        listStyle="inset"
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
        onAppear={() => { void loadProgress() }}
        navigationDestination={detailSubject ? {
          content: <BangumiDetailView title={detailSubject.nameCn || detailSubject.name} subjectId={detailSubject.id} />,
          isPresented: true,
          onChanged: (isPresented) => { if (!isPresented) setDetailSubject(null) },
        } : undefined}
      >
        <ProgressSection>
          <ScrollView axes="horizontal" listRowBackground={<></>} listRowSeparator="hidden">
            <HStack alignment="center" spacing={16} frame={{ alignment: "leading" }} padding={{ vertical: 2 }}>
              {counts.map((status) => (
                <VStack key={status.label} alignment="leading" spacing={2} frame={{ alignment: "leading" }}>
                  <HStack alignment="center" spacing={4}>
                    <Image systemName={status.icon} font="caption2" foregroundStyle="secondaryLabel" />
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{status.label}</Text>
                  </HStack>
                  <Text font="headline" fontWeight="semibold" foregroundStyle="label" lineLimit={1}>{String(status.count)}</Text>
                </VStack>
              ))}
            </HStack>
          </ScrollView>
        </ProgressSection>

        <ProgressSection>
          <ShelfHeader title="收藏状态" caption={`当前：${filter}`} />
          <GlassSurface material="content">
            <ScrollView axes="horizontal">
              <HStack spacing={8} padding={{ horizontal: 12, vertical: 12 }}>
                {STATUS_FILTERS.map((status) => (
                  <Button
                    key={status.label}
                    action={() => { setFilter(status.label); void loadProgress(status.label) }}
                    buttonStyle="plain"
                    padding={{ horizontal: 10, vertical: 8 }}
                    glassEffect={glassEffectFor(filter === status.label ? "navigation" : "content", "capsule", true)}
                    glassEffectTransition="materialize"
                    accessibilityLabel={`${status.label}${filter === status.label ? "，已选择" : ""}`}
                  >
                    <HStack spacing={5}>
                      <Image systemName={status.icon} font={16} foregroundStyle="secondaryLabel" frame={{ width: 18, height: 22, alignment: "center" }} />
                      <Text font="caption" fontWeight="semibold">{status.label}</Text>
                    </HStack>
                  </Button>
                ))}
              </HStack>
            </ScrollView>
          </GlassSurface>
        </ProgressSection>

        {loading ? <ProgressSection><LoadingState message="正在加载 Bangumi 进度…" /></ProgressSection> : null}
        {!loading && error ? <ProgressSection><ErrorState message={error} onRetry={() => { void loadProgress() }} /></ProgressSection> : null}
        {!loading && !error && items.length === 0 ? <ProgressSection><EmptyState icon="tray" title="暂无进度记录" message="在 Bangumi 中收藏条目后，会显示在这里。" /></ProgressSection> : null}
        {!loading && !error && items.map((item) => (
          <ProgressSection key={item.subject.id}>
            <ProgressItem item={item} expanded={expandedSubjectId === item.subject.id} episodes={episodesBySubject[item.subject.id] || []} episodesLoading={episodesLoadingSubjectId === item.subject.id} translatingEpisodeId={translatingEpisodeId} onToggle={() => { void toggleEpisodes(item.subject.id) }} onUpdateSubject={(status) => { void updateItem(item, status) }} onOpenDetail={() => setDetailSubject(item.subject)} onTranslateEpisode={(episode) => { void translateEpisode(episode) }} />
          </ProgressSection>
        ))}
        {message ? <ProgressSection><GlassSurface material="navigation" shape="capsule" showsShadow={false}><Text font="caption" foregroundStyle="secondaryLabel" padding={{ horizontal: 12, vertical: 7 }}>{message}</Text></GlassSurface></ProgressSection> : null}
      </List>
    </ZStack>
  )
}

function EpisodeProgressRow(props: { episode: BangumiEpisode; translating: boolean; onTranslate: () => void }) {
  const title = props.episode.nameCn || props.episode.name || `第 ${props.episode.number} 话`
  return (
    <GlassSurface material="content">
      <ZStack frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <HStack alignment="center" spacing={10} padding={{ horizontal: 12, vertical: 10 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Image systemName="play.rectangle" font={18} foregroundStyle="secondaryLabel" frame={{ width: 28, height: 24, alignment: "center" }} />
          <VStack alignment="leading" spacing={2} padding={{ trailing: props.episode.description ? 42 : 0 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="subheadline" fontWeight="semibold">{`EP${props.episode.number || ""} · ${title}`}</Text>
            {props.episode.nameCn && props.episode.name && props.episode.nameCn !== props.episode.name ? <Text font="caption" foregroundStyle="secondaryLabel">原名：{props.episode.name}</Text> : null}
            <Text font="caption" foregroundStyle="secondaryLabel">{props.episode.description || "暂无简介"}</Text>
            <Text font="caption2" foregroundStyle="secondaryLabel">{[props.episode.airdate, props.episode.duration, props.episode.comments ? `${props.episode.comments} 条评论` : ""].filter(Boolean).join(" · ") || "暂无其他信息"}</Text>
          </VStack>
        </HStack>
        {props.episode.description ? (
          <HStack padding={{ trailing: 12 }} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "trailing" }}>
            <Button
              action={props.onTranslate}
              disabled={props.translating}
              buttonStyle="plain"
              frame={{ width: 36, height: 36, alignment: "center" }}
              glassEffect={glassEffectFor("content", "capsule", true)}
              glassEffectTransition="materialize"
              accessibilityLabel="翻译本话简介"
              accessibilityValue={props.translating ? "正在翻译" : "打开翻译弹窗"}
            >
              <Image systemName={props.translating ? "hourglass" : "globe"} font="caption" foregroundStyle="secondaryLabel" frame={{ width: 28, height: 28, alignment: "center" }} />
            </Button>
          </HStack>
        ) : null}
      </ZStack>
    </GlassSurface>
  )
}

function ProgressSection(props: { children?: any }) {
  return <Section><VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">{props.children}</VStack></Section>
}


function ProgressItem(props: { item: BangumiProgressItem; expanded: boolean; episodes: BangumiEpisode[]; episodesLoading: boolean; translatingEpisodeId: number | null; onToggle: () => void; onUpdateSubject: (status: BangumiProgressStatus) => void; onOpenDetail: () => void; onTranslateEpisode: (episode: BangumiEpisode) => void }) {
  const title = props.item.subject.nameCn || props.item.subject.name
  const episodeCount = props.item.totalEpisodes > 0 ? `共 ${props.item.totalEpisodes} 话` : "总话数待更新"
  return (
    <GlassSurface material="content">
      <VStack alignment="leading" spacing={10} padding={{ top: 8, bottom: props.expanded ? 16 : 10 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <HStack padding={{ horizontal: 24 }}>
          <Button
            action={props.onToggle}
          buttonStyle="plain"
          frame={{ maxWidth: "infinity" }}
          glassEffect={glassEffectFor("content", { type: "rect", cornerRadius: 22, style: "continuous" }, true)}
          glassEffectTransition="materialize"
          accessibilityLabel={`${title}，当前为${props.item.status}，${props.expanded ? "收起剧集明细" : "展开剧集明细"}`}
        >
          <HStack alignment="center" spacing={12} padding={{ horizontal: 14, vertical: 9 }}>
            <Image systemName="film" font={22} foregroundStyle="secondaryLabel" frame={{ width: 32, height: 28, alignment: "center" }} />
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="headline">{title}</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">{props.item.status} · {episodeCount}{props.expanded ? " · 剧集资料" : ""}</Text>
            </VStack>
            <Image systemName={props.expanded ? "chevron.up" : "chevron.down"} font="caption" foregroundStyle="secondaryLabel" />
          </HStack>
          </Button>
        </HStack>
        <HStack spacing={6} padding={{ horizontal: 24 }} frame={{ maxWidth: "infinity", alignment: "center" }}>
          {STATUS_ACTIONS.map((status) => (
            <Button
              key={status.label}
              action={() => props.onUpdateSubject(status.label)}
              buttonStyle="plain"
              padding={{ vertical: 6 }}
              frame={{ maxWidth: "infinity", alignment: "center" }}
              glassEffect={glassEffectFor(props.item.status === status.label ? "navigation" : "content", "capsule", true)}
              glassEffectTransition="materialize"
              accessibilityLabel={`整部番剧标记为${status.label}`}
            >
              <HStack spacing={4} frame={{ maxWidth: "infinity", alignment: "center" }}>
                <Image systemName={status.icon} font={14} foregroundStyle="secondaryLabel" frame={{ width: 16, height: 18, alignment: "center" }} />
                <Text font="caption2" fontWeight="semibold">{status.label}</Text>
              </HStack>
            </Button>
          ))}
        </HStack>
        <Button action={props.onOpenDetail} buttonStyle="plain" accessibilityLabel="打开 Bangumi 条目详情">
          <HStack alignment="center" spacing={8} padding={{ horizontal: 24, vertical: 3 }}>
            <Text font="caption" foregroundStyle="secondaryLabel" frame={{ maxWidth: "infinity", alignment: "leading" }}>打开 Bangumi 条目详情</Text>
            <Image systemName="chevron.right" font="caption" foregroundStyle="secondaryLabel" frame={{ width: 18, height: 22, alignment: "center" }} />
          </HStack>
        </Button>
        {props.expanded ? (
          <VStack alignment="leading" spacing={12} padding={{ horizontal: 24, top: 4 }}>
            {props.episodesLoading ? <LoadingState message="正在加载剧集状态…" /> : null}
            {!props.episodesLoading && !props.episodes.length ? <Text font="caption" foregroundStyle="secondaryLabel">暂无可用剧集状态。</Text> : null}
            {props.episodes.map((episode) => <EpisodeProgressRow key={episode.id} episode={episode} translating={props.translatingEpisodeId === episode.id} onTranslate={() => props.onTranslateEpisode(episode)} />)}
          </VStack>
        ) : null}
      </VStack>
    </GlassSurface>
  )
}
