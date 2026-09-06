import {
  Button,
  HStack,
  Image,
  Label,
  List,
  Menu,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  ZStack,
  useEffect,
  useRef,
  useState,
} from "scripting"
import {
  hanimeClient,
  HANIME_GENRE_OPTIONS,
  HANIME_SORT_OPTIONS,
  HanimeVideoItem,
} from "../../class/hanime"
import { bangumiClient, BangumiMatch } from "../../class/bangumi"
import { hanimeDatabase } from "../../class/hanime_database"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"
import { VideoDetailView } from "../hanime/video_detail"
import { BangumiDetailView } from "../hanime/bangumi_detail"
import { formatVideoMeta, normalizeVideoTitle } from "../hanime/video_components"
import {
  GIRIGIRI_GLASS_TOKENS,
  glassEffectFor,
  glassListRowStyleProps,
  GlassListRow,
  GlassSurface,
  PosterCardContent,
  PosterCover,
  PosterGrid,
  ShelfHeader,
} from "../../design-glass"

type SearchSource = "girigiri" | "bangumi"
type SearchRoute =
  | { kind: "video"; video: HanimeVideoItem }
  | { kind: "bangumi"; match: BangumiMatch }

export function SearchView({ homeScreen = false }: { homeScreen?: boolean } = {}) {
  const [source, setSource] = useState<SearchSource>("girigiri")
  const [keyword, setKeyword] = useState("")
  const [sort, setSort] = useState("time")
  const [genre, setGenre] = useState("2")
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<HanimeVideoItem[]>([])
  const [bangumiResults, setBangumiResults] = useState<BangumiMatch[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [bangumiLoading, setBangumiLoading] = useState(false)
  const [bangumiError, setBangumiError] = useState<string | null>(null)
  const [route, setRoute] = useState<SearchRoute | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const bangumiRequestId = useRef(0)
  const resultsRef = useRef<HanimeVideoItem[]>([])
  const submittedQueryRef = useRef({ keyword: "", sort: "time", genre: "2" })

  useEffect(() => {
    void loadHistory()
  }, [])

  async function loadHistory() {
    try {
      setHistory(await hanimeDatabase.getSearchHistory())
    } catch (historyError) {
      console.error("加载 GiriGiri 搜索历史失败:", historyError)
    }
  }

  async function runSearch(nextPage: number = 1, nextKeyword: string = keyword, nextSort: string = sort, nextGenre: string = genre) {
    const currentRequestId = requestId.current + 1
    requestId.current = currentRequestId
    const normalizedKeyword = nextKeyword.trim()
    const isNewQuery = nextPage === 1

    // 每次新查询先清除旧列表；即使本次失败，也不会把旧条件的结果误认为新结果。
    if (isNewQuery) {
      submittedQueryRef.current = { keyword: normalizedKeyword, sort: nextSort, genre: nextGenre }
      resultsRef.current = []
      setResults([])
      setPage(1)
      setHasMore(true)
    }

    try {
      setLoading(true)
      setError(null)
      setSort(nextSort)
      setGenre(nextGenre)
      setKeyword(normalizedKeyword)
      if (normalizedKeyword) {
        await hanimeDatabase.addSearchHistory(normalizedKeyword)
      }
      const data = await hanimeClient.searchVideos({
        query: normalizedKeyword || undefined,
        page: nextPage,
        sort: nextSort || undefined,
        genre: nextGenre || undefined,
      })
      if (currentRequestId !== requestId.current) return

      const previous = isNewQuery ? [] : resultsRef.current
      const merged = mergeResults(previous, data)
      const hasNewItems = merged.length > previous.length
      resultsRef.current = merged
      setResults(merged)
      setPage(nextPage)
      // 站点偶尔会重复返回上一页；没有新增条目时直接终止分页，避免无限加载。
      setHasMore(data.length > 0 && (isNewQuery || hasNewItems))
      await loadHistory()
    } catch (searchError) {
      if (currentRequestId !== requestId.current) return
      console.error("GiriGiri 搜索失败:", searchError)
      setError(`${searchError}`)
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }

  async function runBangumiSearch() {
    const normalizedKeyword = keyword.trim()
    if (!normalizedKeyword) return
    const currentRequestId = bangumiRequestId.current + 1
    bangumiRequestId.current = currentRequestId
    try {
      setBangumiLoading(true)
      setBangumiError(null)
      setBangumiResults([])
      const nextResults = await bangumiClient.searchAnime(normalizedKeyword)
      if (currentRequestId !== bangumiRequestId.current) return
      setBangumiResults(nextResults)
    } catch (searchError) {
      if (currentRequestId !== bangumiRequestId.current) return
      console.error("Bangumi 搜索失败:", searchError)
      setBangumiError(`${searchError}`)
    } finally {
      if (currentRequestId === bangumiRequestId.current) setBangumiLoading(false)
    }
  }

  function selectSource(nextSource: SearchSource) {
    setSource(nextSource)
    setError(null)
    setBangumiError(null)
  }

  function runActiveSearch() {
    if (source === "bangumi") void runBangumiSearch()
    else void runSearch(1)
  }

  async function clearSearchHistory() {
    try {
      await hanimeDatabase.clearSearchHistory()
      await loadHistory()
    } catch (clearError) {
      console.error("清空 GiriGiri 搜索记录失败:", clearError)
      await Dialog.alert({ title: "无法清空搜索记录", message: "搜索记录未能清除。请稍后重试。" })
      await loadHistory()
    }
  }

  const selectedSort = HANIME_SORT_OPTIONS.find((option) => option.value === sort)?.label || "相关"
  const selectedGenre = HANIME_GENRE_OPTIONS.find((option) => option.value === genre)?.label || "日番"

  return (
    <List
      listStyle="inset"
      scrollContentBackground="hidden"
      scrollEdgeEffectHidden={{ edges: "top", hidden: homeScreen }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle={homeScreen ? "" : "搜索"}
      navigationBarTitleDisplayMode={homeScreen ? "inline" : "large"}
      navigationDestination={route ? {
        content: route.kind === "video"
          ? <VideoDetailView video={route.video} />
          : <BangumiDetailView title={route.match.nameCn || route.match.name} subjectId={route.match.id} />,
        isPresented: true,
        onChanged: (isPresented) => { if (!isPresented) setRoute(null) },
      } : undefined}
    >
      <Section>
        <GlassSurface material="content">
          <VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
            <SearchSourceButton title="GiriGiri" selected={source === "girigiri"} action={() => selectSource("girigiri")} />
            <SearchSourceButton title="Bangumi" selected={source === "bangumi"} action={() => selectSource("bangumi")} />
          </HStack>
          <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
            <HStack
              spacing={8}
              padding={{ horizontal: 12, vertical: 2 }}
              frame={{ maxWidth: "infinity", minHeight: 46 }}
              glassEffect={glassEffectFor("content", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.control, style: "continuous" }, false)}
            >
              <Image systemName="magnifyingglass" font="caption" foregroundStyle="secondaryLabel" />
              <TextField
                title="关键词"
                value={keyword}
                onChanged={setKeyword}
                prompt={source === "bangumi" ? "输入动画标题" : "输入标题、作者或标签"}
                onSubmit={runActiveSearch}
                frame={{ maxWidth: "infinity" }}
              />
            </HStack>
            <Button
              action={runActiveSearch}
              disabled={(source === "bangumi" ? bangumiLoading : loading) || !keyword.trim()}
              buttonStyle="plain"
              frame={{ minHeight: 46 }}
              glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.control, style: "continuous" }, true)}
              glassEffectTransition="materialize"
            >
              <HStack
                spacing={6}
                padding={{ horizontal: 14, vertical: 10 }}
                frame={{ minHeight: 46 }}
              >
                <Image systemName="arrow.right" font="caption" foregroundStyle="label" />
                <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">搜索</Text>
              </HStack>
            </Button>
          </HStack>
            <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={2}>
              {source === "bangumi"
                ? `Bangumi 资料检索 · 中文名 / 原名 / 别名 · 已找到 ${bangumiResults.length} 部`
                : `${selectedGenre} · ${selectedSort} · 已找到 ${results.length} 部；空关键词可直接浏览当前分类`}
            </Text>
          </VStack>
        </GlassSurface>
      </Section>

      {source === "girigiri" ? <Section>
        <ShelfHeader title="浏览偏好" caption="分类与排序" />
        <Menu
          label={<GlassMenuLabel icon="arrow.up.arrow.down.circle" title="排序" value={selectedSort} />}
          disabled={loading}
          {...glassFilterMenuStyleProps}
        >
          {HANIME_SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              title={option.label}
              systemImage={sort === option.value ? "checkmark" : undefined}
              action={() => { void runSearch(1, keyword, option.value, genre) }}
            />
          ))}
        </Menu>
        <Menu
          label={<GlassMenuLabel icon="square.grid.2x2" title="分类" value={selectedGenre} />}
          disabled={loading}
          {...glassFilterMenuStyleProps}
        >
          {HANIME_GENRE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              title={option.label}
              systemImage={genre === option.value ? "checkmark" : undefined}
              action={() => { void runSearch(1, keyword, sort, option.value) }}
            />
          ))}
        </Menu>
      </Section> : null}

      {source === "girigiri" && history.length > 0 && results.length === 0 ? (
        <Section>
        <ShelfHeader title="最近搜索" caption={`${Math.min(history.length, 5)} 条`} />
          {history.slice(0, 5).map((item) => (
            <Button {...glassListRowStyleProps} key={item} action={() => { setKeyword(item); void runSearch(1, item) }}>
              <HStack spacing={12}>
                <Image systemName="clock.arrow.circlepath" frame={{ width: 22 }} foregroundStyle="secondaryLabel" />
                <Text>{item}</Text>
                <Spacer />
                <Image systemName="arrow.up.left" foregroundStyle="tertiaryLabel" />
              </HStack>
            </Button>
          ))}
          <Menu
            label={<Label title="清空搜索记录" systemImage="trash" />}
            {...glassListRowStyleProps}
            menuIndicator="hidden"
            menuStyle="button"
            buttonStyle="plain"
            glassEffectTransition="materialize"
            accessibilityLabel="清空搜索记录，展开确认选项"
          >
            <Button title="确认清空搜索记录" systemImage="trash" role="destructive" action={() => { void clearSearchHistory() }} />
            <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
          </Menu>
        </Section>
      ) : null}

      {source === "girigiri" && error ? (
        <Section>
          <ErrorState message={error} onRetry={() => { void runSearch(page) }} />
        </Section>
      ) : null}

      {source === "girigiri" && loading && results.length === 0 ? (
        <Section>
          <LoadingState message="正在搜索 GiriGiri…" />
        </Section>
      ) : null}
      {source === "bangumi" && bangumiLoading && bangumiResults.length === 0 ? (
        <Section>
          <LoadingState message="正在搜索 Bangumi…" />
        </Section>
      ) : null}
      {source === "bangumi" && bangumiError ? (
        <Section>
          <ErrorState message={bangumiError} onRetry={runBangumiSearch} />
        </Section>
      ) : null}

      {source === "girigiri" && results.length > 0 ? (
        <Section>
        <ShelfHeader title="搜索结果" caption={`${results.length} 部`} />
          <PosterGrid>
            {results.map((video) => (
              <Button
                key={video.videoCode}
                buttonStyle="plain"
                contentShape={{ type: "rect", cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.content, style: "continuous" }}
                action={() => setRoute({ kind: "video", video })}
              >
                <PosterCardContent
                  coverUrl={video.coverUrl}
                  title={normalizeVideoTitle(video.title) || "未命名"}
                  caption={formatVideoMeta(video)}
                  ageRating={video.ageRating}
                />
              </Button>
            ))}
          </PosterGrid>
          {hasMore ? (
            <Button
              {...glassListRowStyleProps}
              action={() => {
                const submitted = submittedQueryRef.current
                void runSearch(page + 1, submitted.keyword, submitted.sort, submitted.genre)
              }}
              disabled={loading}
            >
              <Label title={loading ? "正在加载下一页…" : "加载下一页"} systemImage="arrow.down.circle" />
            </Button>
          ) : (
            <GlassListRow><Text font="caption" foregroundStyle="secondaryLabel">已没有更多结果</Text></GlassListRow>
          )}
        </Section>
      ) : null}

      {source === "bangumi" && bangumiResults.length > 0 ? (
        <Section>
          <ShelfHeader title="Bangumi 结果" caption={`${bangumiResults.length} 部`} />
          {bangumiResults.map((match) => (
            <Button
              {...glassListRowStyleProps}
              key={match.id}
              action={() => setRoute({ kind: "bangumi", match })}
            >
              <BangumiSearchRow match={match} />
            </Button>
          ))}
        </Section>
      ) : null}

      {source === "girigiri" && !loading && !error && results.length === 0 ? (
        <Section>
          <EmptyState icon="magnifyingglass" title="搜索 GiriGiri 内容" message="输入标题、作者或标签；也可以直接浏览当前分类的最新内容。" actionTitle="浏览日番最新内容" action={() => { void runSearch(1, "", "time", "2") }} />
        </Section>
      ) : null}
      {source === "bangumi" && !bangumiLoading && !bangumiError && bangumiResults.length === 0 ? (
        <Section>
          <EmptyState icon="magnifyingglass" title="搜索 Bangumi 动画资料" message="输入中文名称、原名或别名以查找对应条目。" />
        </Section>
      ) : null}
    </List>
  )
}

function SearchSourceButton({ title, selected, action }: { title: string; selected: boolean; action: () => void }) {
  return (
    <Button
      action={action}
      buttonStyle="plain"
      frame={{ maxWidth: "infinity", minHeight: 42 }}
      glassEffect={glassEffectFor(selected ? "elevated" : "navigation", "capsule", true)}
      glassEffectTransition="materialize"
      accessibilityLabel={`${title} 搜索`}
      accessibilityValue={selected ? "已选择" : "未选择"}
      accessibilityAddTraits={selected ? "isSelected" : []}
    >
      <HStack spacing={6} padding={{ horizontal: 12, vertical: 8 }} frame={{ maxWidth: "infinity", minHeight: 42, alignment: "center" }}>
        {selected ? <Image systemName="checkmark" font="caption" foregroundStyle="label" /> : null}
        <Text font="subheadline" fontWeight={selected ? "bold" : "regular"} foregroundStyle={selected ? "label" : "secondaryLabel"}>{title}</Text>
      </HStack>
    </Button>
  )
}

function BangumiSearchRow({ match }: { match: BangumiMatch }) {
  const title = match.nameCn || match.name
  const subtitle = [match.nameCn ? match.name : "", match.date?.slice(0, 4), match.score ? `${match.score.toFixed(1)} 分` : ""].filter(Boolean).join(" · ")
  return (
    <HStack alignment="center" spacing={12} padding={{ vertical: 8 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <PosterCover url={match.imageUrl} size="compact" />
      <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading">{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading">{subtitle || "Bangumi 动画资料"}</Text>
        <HStack spacing={5}>
          <Image systemName={match.matchKind === "精确匹配" ? "checkmark.circle.fill" : "questionmark.circle"} font="caption2" foregroundStyle="secondaryLabel" />
          <Text font="caption2" foregroundStyle="tertiaryLabel">{match.matchKind}</Text>
        </HStack>
      </VStack>
    </HStack>
  )
}

const glassFilterMenuStyleProps = {
  frame: { maxWidth: "infinity" as const, minHeight: 52, alignment: "leading" as const },
  padding: { horizontal: 16 },
  contentShape: { type: "rect" as const, cornerRadius: 16, style: "continuous" as const },
  menuIndicator: "hidden" as const,
  menuStyle: "button" as const,
  buttonStyle: "plain" as const,
  glassEffect: {
    glass: UIGlass.clear().interactive(false),
    shape: { type: "rect" as const, cornerRadius: 16, style: "continuous" as const },
  },
  glassEffectTransition: "materialize" as const,
  listRowBackground: <></>,
  listRowSeparator: "hidden" as const,
}

function GlassMenuLabel({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <HStack spacing={12} frame={{ maxWidth: "infinity", minHeight: 52 }} contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}>
      <Image systemName={icon} frame={{ width: 22 }} foregroundStyle="secondaryLabel" />
      <Text font="body" fontWeight="medium">{title}</Text>
      <Spacer />
      <Text font="subheadline" foregroundStyle="secondaryLabel">{value}</Text>
    </HStack>
  )
}

function mergeResults(current: HanimeVideoItem[], next: HanimeVideoItem[]): HanimeVideoItem[] {
  const byCode = new Map<string, HanimeVideoItem>()
  for (const item of current) byCode.set(item.videoCode, item)
  for (const item of next) byCode.set(item.videoCode, item)
  return Array.from(byCode.values())
}
