import {
  Button,
  HStack,
  Image,
  LazyVGrid,
  List,
  Navigation,
  NavigationLink,
  Section,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
  type Color,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "scripting"
import {
  BangumiCharacter,
  BangumiEpisode,
  BangumiInfoItem,
  BangumiMatch,
  BangumiPerson,
  BangumiRelatedSubject,
  BangumiSubject,
  BangumiSubjectDetails,
  bangumiClient,
} from "../../class/bangumi"
import { extractBangumiTranslatableText } from "../../class/bangumi_translation"
import { BackgroundThemeProvider, GIRIGIRI_GLASS_TOKENS, glassEffectFor, glassListRowStyleProps, GlassListRow, GlassSurface, PageBackground, PosterCover, ShelfHeader, useBackgroundTheme } from "../../design-glass"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"

const TAG_COLUMNS = [
  { size: { type: "flexible" as const, min: 0 }, spacing: 8 },
  { size: { type: "flexible" as const, min: 0 }, spacing: 8 },
  { size: { type: "flexible" as const, min: 0 } },
]

function BangumiTransparentSection({ children }: { children?: any }) {
  return (
    <Section>
      <VStack frame={{ maxWidth: "infinity" }} listRowBackground={<></>} listRowSeparator="hidden">
        {children}
      </VStack>
    </Section>
  )
}

export function BangumiDetailView({ title, subjectId, onSubjectSelected, onSubjectCleared }: { title: string; subjectId?: number; onSubjectSelected?: (subject: BangumiSubject) => void; onSubjectCleared?: () => void }) {
  const [matches, setMatches] = useState<BangumiMatch[]>([])
  const [details, setDetails] = useState<BangumiSubjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const translation = useMemo(() => new Translation(), [])
  const requestIdRef = useRef(0)
  const loadedSubjectIdRef = useRef<number | null>(null)
  const manualMatchingRef = useRef(false)

  useEffect(() => {
    if (!subjectId && manualMatchingRef.current) return
    if (subjectId && loadedSubjectIdRef.current === subjectId) return
    const requestId = ++requestIdRef.current
    if (subjectId) void loadSubject(subjectId, requestId)
    else void loadMatches(requestId)
  }, [title, subjectId])

  async function loadMatches(requestId = ++requestIdRef.current, allowAutomaticExactMatch = true) {
    try {
      setLoading(true)
      setError(null)
      setDetails(null)
      loadedSubjectIdRef.current = null
      const results = await bangumiClient.searchAnime(title)
      if (requestIdRef.current !== requestId) return
      setMatches(results)
      const exactMatches = results.filter((item) => item.matchKind === "精确匹配")
      if (allowAutomaticExactMatch && exactMatches.length === 1) await loadSubject(exactMatches[0].id, requestId)
    } catch (loadError) {
      if (requestIdRef.current === requestId) setError(`${loadError}`)
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }

  async function loadSubject(id: number, requestId = ++requestIdRef.current, manualSelection = false) {
    if (loadedSubjectIdRef.current === id && details?.subject.id === id) return
    try {
      setLoading(true)
      setError(null)
      const nextDetails = await bangumiClient.getSubjectDetails(id)
      if (requestIdRef.current !== requestId) return
      loadedSubjectIdRef.current = id
      if (manualSelection) manualMatchingRef.current = false
      setDetails(nextDetails)
      onSubjectSelected?.(nextDetails.subject)
    } catch (loadError) {
      if (requestIdRef.current === requestId) setError(`${loadError}`)
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }

  function beginManualRematch() {
    manualMatchingRef.current = true
    loadedSubjectIdRef.current = null
    setDetails(null)
    setMatches([])
    onSubjectCleared?.()
    void loadMatches(undefined, false)
  }

  return (
    <ZStack>
      <PageBackground />
      <List
        translationHost={translation}
        navigationTitle="Bangumi 资料"
        navigationBarTitleDisplayMode="inline"
        listStyle="inset"
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
      >
        {loading ? (
          <BangumiTransparentSection><LoadingState message={details ? "正在载入完整 Bangumi 资料…" : "正在匹配番剧标题…"} /></BangumiTransparentSection>
        ) : error ? (
          <BangumiTransparentSection><ErrorState message={error} onRetry={() => { details ? void loadSubject(details.subject.id) : void loadMatches() }} /></BangumiTransparentSection>
        ) : details ? (
          <BangumiSubjectContent details={details} translation={translation} onChooseAgain={beginManualRematch} />
        ) : matches.length ? (
          <BangumiMatchList sourceTitle={title} matches={matches} onSelect={(match) => { void loadSubject(match.id, undefined, true) }} />
        ) : (
          <BangumiTransparentSection>
            <EmptyState icon="magnifyingglass" title="未找到 Bangumi 条目" message={`没有找到与「${title}」对应的动画条目。`} actionTitle="重新搜索" action={loadMatches} />
          </BangumiTransparentSection>
        )}
      </List>
    </ZStack>
  )
}

function BangumiMatchList({ sourceTitle, matches, onSelect }: { sourceTitle: string; matches: BangumiMatch[]; onSelect: (subject: BangumiMatch) => void }) {
  return (
    <BangumiTransparentSection>
      <DetailSectionHeader title="选择对应条目" subtitle={`来自「${sourceTitle}」的标题匹配结果`} sectionKey="matches" open={true} onToggle={() => undefined} />
      {matches.map((match) => (
        <Button key={match.id} {...glassListRowStyleProps} action={() => onSelect(match)}>
          <BangumiSubjectRow subject={match} status={match.matchKind} />
        </Button>
      ))}
    </BangumiTransparentSection>
  )
}

function BangumiSubjectContent({ details, translation, onChooseAgain }: { details: BangumiSubjectDetails; translation: Translation; onChooseAgain: () => void }) {
  const { subject, episodes, characters, relatedSubjects, persons } = details
  const title = subject.nameCn || subject.name
  const originalTitle = subject.nameCn && subject.nameCn !== subject.name ? subject.name : ""
  const metadata = [subject.platform, subject.date, subject.episodes ? `${subject.episodes} 话` : ""].filter(Boolean).join(" · ")
  const officialWebsite = extractWebURL(subject.infobox.find((item) => item.key === "官方网站")?.value || "")
  const fullInfo = subject.infobox.filter((item) => item.key !== "官方网站")
  const relatedAnime = relatedSubjects.filter((item) => item.type === 2)
  const relatedOther = relatedSubjects.filter((item) => item.type !== 2)
  const personGroups = groupPersonsByRelation(persons)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [translatingEpisodeId, setTranslatingEpisodeId] = useState<number | null>(null)
  const toggleSection = (key: string) => setCollapsedSections((current) => ({ ...current, [key]: !current[key] }))
  const isOpen = (key: string) => !collapsedSections[key]
  const presentTranslation = async (title: string, summary: string) => {
    const original = extractBangumiTranslatableText(summary)
    if (!original) {
      await presentTranslationModal(title, summary, "该简介没有可翻译的原文部分。")
      return
    }

    try {
      const translatedText = await translation.translate({
        text: original.text,
        source: original.source,
        target: "zh",
      })
      await presentTranslationModal(title, original.text, translatedText)
    } catch (translationError) {
      await presentTranslationModal(title, original.text, `翻译失败：${translationError}`)
    }
  }
  const presentTranslationModal = async (title: string, sourceText: string, translatedText: string) => {
    await Navigation.present({
      element: (
        <BackgroundThemeProvider>
          <TranslationModal title={title} sourceText={sourceText} translatedText={translatedText} />
        </BackgroundThemeProvider>
      ),
      modalPresentationStyle: "pageSheet",
    })
  }
  const characterCardHeight = characters.length ? Math.max(...characters.map(characterCardHeightFor)) : 0

  return (
    <>
      <BangumiTransparentSection>
        <GlassSurface material="media">
          <HStack alignment="top" spacing={14} padding={16} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <BangumiCover url={subject.imageUrl} width={96} height={132} />
            <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="title3" fontWeight="bold" multilineTextAlignment="leading">{title}</Text>
              {originalTitle ? <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={2}>{originalTitle}</Text> : null}
              <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3}>{metadata || "Bangumi 动画条目"}</Text>
              <HStack spacing={12}>
                <TransparentSymbolText title={subject.score ? `${subject.score.toFixed(1)} 分` : "暂无评分"} systemImage="star.fill" font="caption" />
                {subject.rank ? <TransparentSymbolText title={`排名 ${subject.rank}`} systemImage="chart.bar.fill" font="caption" /> : null}
              </HStack>
              <Text font="caption2" foregroundStyle="tertiaryLabel">{subject.votes ? `${formatCount(subject.votes)} 人评分` : "评分人数待更新"}</Text>
              {subject.metaTags.length ? <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={2}>{subject.metaTags.join(" · ")}</Text> : null}
            </VStack>
          </HStack>
        </GlassSurface>
      </BangumiTransparentSection>

      <BangumiTransparentSection>
        <DetailSectionHeader title="快速操作" sectionKey="quick-actions" open={isOpen("quick-actions")} onToggle={toggleSection} />
        {isOpen("quick-actions") ? <VStack spacing={8}>
          <HStack spacing={8} frame={{ maxWidth: "infinity" }} listRowBackground={<></>} listRowSeparator="hidden">
            <QuickOpenButton title="Bangumi" systemImage="safari" action={() => { void Safari.present(bangumiClient.subjectUrl(subject.id), true) }} />
            {officialWebsite ? <QuickOpenButton title="动画官网" systemImage="globe" action={() => { void Safari.present(officialWebsite, true) }} /> : null}
          </HStack>
          <Button {...glassListRowStyleProps} action={onChooseAgain}>
            <ActionRow title="重新选择匹配条目" subtitle="返回标题候选并修正匹配" systemImage="arrow.triangle.2.circlepath" />
          </Button>
        </VStack> : null}
      </BangumiTransparentSection>

      <BangumiTransparentSection>
        <DetailSectionHeader title="收藏概览" sectionKey="collection" open={isOpen("collection")} onToggle={toggleSection} />
        {isOpen("collection") ? <GlassListRow>
          <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
            {subject.collection.map((item) => <StatisticRow key={item.key} title={item.label} value={formatCount(item.count)} icon={collectionIcon(item.key)} />)}
          </VStack>
        </GlassListRow> : null}
      </BangumiTransparentSection>

      <BangumiTransparentSection>
        <DetailSectionHeader title="评分分布" subtitle="10 分至 1 分的投票人数" sectionKey="rating" open={isOpen("rating")} onToggle={toggleSection} />
        {isOpen("rating") ? <GlassListRow>
          <VStack spacing={8} frame={{ maxWidth: "infinity" }}>
            {subject.ratingDistribution.map((item) => <RatingRow key={item.key} score={item.key} count={item.count} total={subject.votes} />)}
          </VStack>
        </GlassListRow> : null}
      </BangumiTransparentSection>

      <BangumiTransparentSection>
        <DetailSectionHeader title="条目简介" sectionKey="summary" open={isOpen("summary")} onToggle={toggleSection} />
        {isOpen("summary") ? <GlassListRow>
          <ZStack frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="body" foregroundStyle={subject.summary ? undefined : "secondaryLabel"} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
              {subject.summary || "Bangumi 暂未提供该条目的简介。"}
            </Text>
            {subject.summary ? <HStack frame={{ maxWidth: "infinity", alignment: "trailing" }}>
              <Button
                action={() => { void presentTranslation("条目简介翻译", subject.summary) }}
                buttonStyle="plain"
                frame={{ width: 36, height: 36, alignment: "center" }}
                glassEffect={glassEffectFor("content", "capsule", true)}
                glassEffectTransition="materialize"
                accessibilityLabel="翻译条目简介"
              >
                <CenteredSymbol systemName="globe" font="caption" slotWidth={28} iconWidth={17} iconHeight={17} />
              </Button>
            </HStack> : null}
          </ZStack>
        </GlassListRow> : null}
      </BangumiTransparentSection>

      {fullInfo.length ? (
        <BangumiTransparentSection>
          <DetailSectionHeader title="制作与放送" subtitle={`${fullInfo.length} 项 Bangumi 完整条目资料`} sectionKey="production-info" open={isOpen("production-info")} onToggle={toggleSection} />
          {isOpen("production-info") ? fullInfo.map((item, index) => <GlassListRow key={`${item.key}-${index}`}><InfoRow item={item} /></GlassListRow>) : null}
        </BangumiTransparentSection>
      ) : null}

      {personGroups.length ? (
        <BangumiTransparentSection>
          <DetailSectionHeader title="制作人员" subtitle={`${persons.length} 条公开参与记录`} sectionKey="persons" open={isOpen("persons")} onToggle={toggleSection} />
          {isOpen("persons") ? personGroups.map((group) => <GlassListRow key={group.relation}><PersonGroupRow relation={group.relation} persons={group.persons} /></GlassListRow>) : null}
        </BangumiTransparentSection>
      ) : null}

      {episodes.length ? (
        <BangumiTransparentSection>
          <DetailSectionHeader title="剧集资料" subtitle={`已载入 ${episodes.length} 集本篇剧集 · 条目共 ${subject.totalEpisodes || subject.episodes} 条剧集记录`} sectionKey="episodes" open={isOpen("episodes")} onToggle={toggleSection} />
          {isOpen("episodes") ? episodes.map((episode) => <EpisodeRow key={episode.id} episode={episode} persons={persons} translating={translatingEpisodeId === episode.id} onTranslate={async () => {
            if (!episode.description || translatingEpisodeId === episode.id) return
            setTranslatingEpisodeId(episode.id)
            await presentTranslation(`EP ${episode.number} · ${episode.nameCn || episode.name || "本话简介"}`, episode.description)
            setTranslatingEpisodeId(null)
          }} />) : null}
        </BangumiTransparentSection>
      ) : null}

      {characters.length ? (
        <BangumiTransparentSection>
          <DetailSectionHeader title="角色与声优" subtitle="主角与配角 · 横向自由滑动" sectionKey="characters" open={isOpen("characters")} onToggle={toggleSection} />
          {isOpen("characters") ? <ScrollView axes="horizontal" listRowBackground={<></>} listRowSeparator="hidden">
            <HStack
              alignment="top"
              spacing={12}
              padding={{
                leading: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
                trailing: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
                vertical: 4,
              }}
            >
              {characters.map((character) => <CharacterCard key={character.id} character={character} height={characterCardHeight} />)}
            </HStack>
          </ScrollView> : null}
        </BangumiTransparentSection>
      ) : null}

      {relatedAnime.length ? (
        <BangumiTransparentSection>
          <ShelfHeader title="关联动画" caption={`${relatedAnime.length} 部 · 横向滑动查看`} />
          <ScrollView axes="horizontal" listRowBackground={<></>} listRowSeparator="hidden">
            <HStack
              alignment="top"
              spacing={12}
              padding={{
                leading: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
                trailing: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
                vertical: 4,
              }}
            >
              {relatedAnime.map((related) => (
                <NavigationLink key={related.id} buttonStyle="plain" destination={<BangumiDetailView title={related.nameCn || related.name} subjectId={related.id} />}>
                  <BangumiRelatedShelfCard subject={related} />
                </NavigationLink>
              ))}
            </HStack>
          </ScrollView>
        </BangumiTransparentSection>
      ) : null}

      {relatedOther.length ? (
        <BangumiTransparentSection>
          <DetailSectionHeader title="关联作品" sectionKey="related-other" open={isOpen("related-other")} onToggle={toggleSection} />
          {isOpen("related-other") ? relatedOther.map((related) => (
            <Button key={related.id} {...glassListRowStyleProps} action={() => { void Safari.present(bangumiClient.subjectUrl(related.id), true) }}>
              <RelatedSubjectRow subject={related} />
            </Button>
          )) : null}
        </BangumiTransparentSection>
      ) : null}

      {subject.tags.length ? (
        <BangumiTransparentSection>
          <DetailSectionHeader title="Bangumi 标签" subtitle={`${subject.tags.length} 个条目标签`} sectionKey="tags" open={isOpen("tags")} onToggle={toggleSection} />
          {isOpen("tags") ? <TagGlassGrid tags={subject.tags} /> : null}
        </BangumiTransparentSection>
      ) : null}
    </>
  )
}

function DetailSectionHeader({ title, subtitle, sectionKey, open, onToggle }: { title: string; subtitle?: string; sectionKey: string; open: boolean; onToggle: (key: string) => void }) {
  return (
    <Button action={() => onToggle(sectionKey)} buttonStyle="plain" frame={{ maxWidth: "infinity" }}>
      <ShelfHeader
        title={title}
        caption={subtitle}
        accessory={<Image systemName={open ? "chevron.up.circle" : "chevron.down.circle"} font="caption" foregroundStyle="secondaryLabel" />}
      />
    </Button>
  )
}

function CenteredSymbol({ systemName, font, slotWidth = 40, iconWidth = 24, iconHeight = 24 }: { systemName: string; font?: "caption" | "caption2" | "subheadline" | "title3" | "title2"; slotWidth?: number; iconWidth?: number; iconHeight?: number }) {
  return <ZStack frame={{ width: slotWidth, alignment: "center" }}><Image systemName={systemName} font={font} foregroundStyle="secondaryLabel" frame={{ width: iconWidth, alignment: "center" }} /></ZStack>
}

function TransparentSymbolText({ title, systemImage, font = "subheadline" }: { title: string; systemImage: string; font?: "caption" | "subheadline" }) {
  return <HStack spacing={6}><CenteredSymbol systemName={systemImage} font={font} slotWidth={40} iconWidth={22} iconHeight={22} /><Text font={font}>{title}</Text></HStack>
}

function QuickOpenButton({ title, systemImage, action }: { title: string; systemImage: string; action: () => void }) {
  return (
    <Button
      action={action}
      buttonStyle="plain"
      frame={{ maxWidth: "infinity", minHeight: 48 }}
      contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}
      glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: 16, style: "continuous" }, true)}
      glassEffectTransition="materialize"
    >
      <HStack spacing={7} frame={{ maxWidth: "infinity", minHeight: 44, alignment: "center" }}>
        <CenteredSymbol systemName={systemImage} font="subheadline" slotWidth={28} iconWidth={22} iconHeight={22} />
        <Text font="subheadline" fontWeight="semibold">{title}</Text>
      </HStack>
    </Button>
  )
}

function ActionRow({ title, subtitle, systemImage }: { title: string; subtitle?: string; systemImage: string }) {
  return (
    <ZStack frame={{ maxWidth: "infinity", minHeight: 48, alignment: "center" }}>
      <VStack alignment="center" spacing={3} frame={{ maxWidth: "infinity", alignment: "center" }}>
        <Text font="subheadline" fontWeight="semibold" multilineTextAlignment="center">{title}</Text>
        {subtitle ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="center">{subtitle}</Text> : null}
      </VStack>
      <HStack frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <CenteredSymbol systemName={systemImage} font="title3" slotWidth={40} iconWidth={26} iconHeight={26} />
      </HStack>
      <HStack frame={{ maxWidth: "infinity", alignment: "trailing" }}>
        <CenteredSymbol systemName="chevron.right" font="caption" slotWidth={28} iconWidth={18} iconHeight={18} />
      </HStack>
    </ZStack>
  )
}

function StatisticRow({ title, value, icon }: { title: string; value: string; icon: string }) {
  return <HStack spacing={10} frame={{ maxWidth: "infinity" }}><CenteredSymbol systemName={icon} slotWidth={40} iconWidth={24} iconHeight={24} /><Text font="subheadline">{title}</Text><Spacer /><Text font="subheadline" fontWeight="semibold">{value}</Text></HStack>
}

function RatingRow({ score, count, total }: { score: string; count: number; total: number }) {
  const percent = total ? Math.round(count / total * 100) : 0
  return <HStack spacing={8} frame={{ maxWidth: "infinity" }}><Text font="caption" frame={{ width: 34, alignment: "trailing" }}>{score} 分</Text><Text font="caption" foregroundStyle="secondaryLabel" frame={{ maxWidth: "infinity", alignment: "leading" }}>{ratingBar(percent)}</Text><Text font="caption2" foregroundStyle="secondaryLabel" frame={{ width: 76, alignment: "trailing" }}>{formatCount(count)} · {percent}%</Text></HStack>
}

function InfoRow({ item }: { item: BangumiInfoItem }) {
  return <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}><Text font="caption" foregroundStyle="secondaryLabel">{item.key}</Text><Text font="subheadline" multilineTextAlignment="leading">{item.value}</Text></VStack>
}

function EpisodeRow({ episode, persons, translating, onTranslate }: { episode: BangumiEpisode; persons: BangumiPerson[]; translating: boolean; onTranslate: () => void }) {
  const title = episode.nameCn || episode.name || `第 ${episode.number} 话`
  const subtitle = [episode.airdate, episode.duration, episode.comments ? `${episode.comments} 条讨论` : ""].filter(Boolean).join(" · ")
  const staff = episodeStaffFor(episode, persons)
  return (
    <GlassSurface material="content" shape={{ type: "rect", cornerRadius: 18, style: "continuous" }}>
      <ZStack frame={{ maxWidth: "infinity", alignment: "topLeading" }} padding={{ horizontal: 16, vertical: 14 }}>
        <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ trailing: episode.description ? 44 : 0 }}>
          <HStack alignment="top" spacing={10}>
            <Text font="subheadline" fontWeight="semibold" frame={{ width: 46, alignment: "leading" }}>EP {episode.number}</Text>
            <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="subheadline" fontWeight="semibold" multilineTextAlignment="leading">{title}</Text>
              {episode.nameCn && episode.name ? <Text font="caption2" foregroundStyle="tertiaryLabel" multilineTextAlignment="leading">{episode.name}</Text> : null}
              {subtitle ? <Text font="caption" foregroundStyle="secondaryLabel">{subtitle}</Text> : null}
            </VStack>
          </HStack>
          <VStack alignment="leading" spacing={7} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ leading: 56 }}>
            {staff.length ? <Text font="caption2" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{staff.map((item) => `${item.relation}：${item.names}`).join("\n")}</Text> : null}
            {episode.description ? <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{episode.description}</Text> : null}
          </VStack>
        </VStack>
        {episode.description ? (
          <HStack frame={{ maxWidth: "infinity", alignment: "trailing" }}>
            <Button
              action={onTranslate}
              buttonStyle="plain"
              frame={{ width: 36, height: 36, alignment: "center" }}
              glassEffect={glassEffectFor("content", "capsule", true)}
              glassEffectTransition="materialize"
              accessibilityLabel="翻译本话简介"
              accessibilityValue={translating ? "正在翻译" : "打开翻译弹窗"}
            >
              <CenteredSymbol systemName={translating ? "hourglass" : "globe"} font="caption" slotWidth={28} iconWidth={17} iconHeight={17} />
            </Button>
          </HStack>
        ) : null}
      </ZStack>
    </GlassSurface>
  )
}

export function TranslationModal({ title, sourceText, translatedText }: { title: string; sourceText: string; translatedText: string }) {
  const dismiss = Navigation.useDismiss()
  return (
    <ZStack>
      <PageBackground />
      <VStack spacing={12} frame={{ maxWidth: "infinity", maxHeight: "infinity" }} padding={{ horizontal: 16, vertical: 14 }}>
        <HStack frame={{ maxWidth: "infinity", minHeight: 44, alignment: "center" }}>
          <Text font="headline" fontWeight="semibold" frame={{ maxWidth: "infinity", alignment: "leading" }}>{title}</Text>
          <Button
            action={() => dismiss()}
            buttonStyle="plain"
            frame={{ width: 36, height: 36, alignment: "center" }}
            glassEffect={glassEffectFor("navigation", "capsule", true)}
            glassEffectTransition="materialize"
            accessibilityLabel="关闭翻译弹窗"
          >
            <CenteredSymbol systemName="xmark" font="caption" slotWidth={28} iconWidth={17} iconHeight={17} />
          </Button>
        </HStack>
        <ScrollView frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
          <VStack spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <GlassSurface material="content" showsShadow={false}>
              <VStack alignment="leading" spacing={8} padding={16} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="caption" foregroundStyle="secondaryLabel">原文</Text>
                <Text font="body" multilineTextAlignment="leading">{sourceText}</Text>
              </VStack>
            </GlassSurface>
            <GlassSurface material="content" showsShadow={false}>
              <VStack alignment="leading" spacing={8} padding={16} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="caption" foregroundStyle="secondaryLabel">系统翻译</Text>
                <Text font="body" multilineTextAlignment="leading">{translatedText}</Text>
              </VStack>
            </GlassSurface>
          </VStack>
        </ScrollView>
      </VStack>
    </ZStack>
  )
}

function episodeStaffFor(episode: BangumiEpisode, persons: BangumiPerson[]): Array<{ relation: string; names: string }> {
  const episodeNumber = String(episode.number)
  const groups = new Map<string, string[]>()
  persons.forEach((person) => {
    const episodeTokens = person.episodes.split(/[,、\/\s]+/).map((token) => token.replace(/^EP/i, "")).filter(Boolean)
    if (!episodeTokens.includes(episodeNumber)) return
    const names = groups.get(person.relation) || []
    if (!names.includes(person.name)) names.push(person.name)
    groups.set(person.relation, names)
  })
  return Array.from(groups, ([relation, names]) => ({ relation, names: names.join("、") })).slice(0, 5)
}

function PersonGroupRow({ relation, persons }: { relation: string; persons: BangumiPerson[] }) {
  const names = uniquePersonNames(persons).join("、")
  const episodeNotes = Array.from(new Set(persons.map((person) => person.episodes).filter(Boolean)))
  return (
    <HStack alignment="center" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <ZStack frame={{ width: 40, maxHeight: "infinity", alignment: "center" }}>
        <CenteredSymbol systemName="person.2" font="subheadline" slotWidth={40} iconWidth={24} iconHeight={24} />
      </ZStack>
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <HStack spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="caption" foregroundStyle="secondaryLabel">{relation}</Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel">{persons.length} 人</Text>
        </HStack>
        <Text font="subheadline" multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{names}</Text>
        {episodeNotes.length ? <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading">参与剧集：{episodeNotes.join(" / ")}</Text> : null}
      </VStack>
    </HStack>
  )
}

function uniquePersonNames(persons: BangumiPerson[]): string[] {
  return Array.from(new Set(persons.map((person) => person.name).filter(Boolean)))
}

function groupPersonsByRelation(persons: BangumiPerson[]): Array<{ relation: string; persons: BangumiPerson[] }> {
  const groups = new Map<string, BangumiPerson[]>()
  persons.forEach((person) => {
    const group = groups.get(person.relation)
    if (group) group.push(person)
    else groups.set(person.relation, [person])
  })
  return Array.from(groups, ([relation, items]) => ({ relation, persons: items }))
}

function characterCardHeightFor(character: BangumiCharacter): number {
  const actorLines = character.actors.length ? Math.min(2, Math.ceil(character.actors.join(" / ").length / 14)) : 0
  const nameLines = Math.min(2, Math.ceil(character.name.length / 8))
  const contentHeight = 118 + 7 + Math.max(1, nameLines) * 20 + 7 + 18 + (actorLines ? 7 + actorLines * 18 : 0)
  return contentHeight + 24
}

function CharacterCard({ character, height }: { character: BangumiCharacter; height: number }) {
  const isLead = character.relation.replace(/\\s+/g, "") === "主角"
  return (
    <VStack alignment="center" spacing={7} frame={{ width: 156, height, alignment: "top" }} padding={{ horizontal: 12, vertical: 12 }} glassEffect={glassEffectFor("content", { type: "rect", cornerRadius: 18, style: "continuous" }, false)}>
      <CharacterPortrait url={character.imageUrl} />
      <Text font="subheadline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="center" frame={{ width: 132, minHeight: 38, alignment: "center" }}>{character.name}</Text>
      <HStack alignment="center" spacing={6} frame={{ width: 132, minHeight: 24, alignment: "center" }}>
        <Image systemName={isLead ? "star.fill" : "person.2.fill"} font="caption" foregroundStyle="secondaryLabel" frame={{ width: 18, alignment: "center" }} />
        <Text font="caption" fontWeight="semibold" foregroundStyle="secondaryLabel" frame={{ alignment: "center" }}>{isLead ? "主角" : "配角"}</Text>
      </HStack>
      {character.actors.length ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="center" frame={{ width: 132, minHeight: 34, alignment: "top" }}>声优：{character.actors.join(" / ")}</Text> : null}
    </VStack>
  )
}

function BangumiRelatedShelfCard({ subject }: { subject: BangumiRelatedSubject }) {
  return (
    <VStack alignment="leading" spacing={6} frame={{ width: 96, alignment: "topLeading" }}>
      <PosterCover url={subject.imageUrl} size="compact" />
      <Text font="caption" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading" frame={{ width: 96, height: 32, alignment: "topLeading" }}>{subject.nameCn || subject.name}</Text>
      <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1} frame={{ width: 96, alignment: "leading" }}>{subject.relation}</Text>
    </VStack>
  )
}

function RelatedSubjectRow({ subject }: { subject: BangumiRelatedSubject }) {
  return (
    <HStack alignment="center" spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <BangumiCover url={subject.imageUrl} width={62} height={82} />
      <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading">{subject.nameCn || subject.name}</Text>
        {subject.nameCn ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{subject.name}</Text> : null}
        <Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{subject.relation}</Text>
      </VStack>
      <CenteredSymbol systemName="link" font="subheadline" slotWidth={28} iconWidth={20} iconHeight={20} />
    </HStack>
  )
}

function BangumiSubjectRow({ subject, status }: { subject: BangumiSubject; status: string }) {
  const title = subject.nameCn || subject.name
  const subtitle = [subject.nameCn ? subject.name : "", subject.date?.slice(0, 4), subject.score ? `${subject.score.toFixed(1)} 分` : ""].filter(Boolean).join(" · ")
  return (
    <HStack alignment="center" spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <BangumiCover url={subject.imageUrl} width={54} height={72} />
      <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold" lineLimit={2}>{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2}>{subtitle}</Text>
        <TransparentSymbolText title={status} systemImage={status === "精确匹配" ? "checkmark.circle.fill" : "questionmark.circle"} font="caption" />
      </VStack>
      <CenteredSymbol systemName="chevron.right" font="caption" slotWidth={28} iconWidth={18} iconHeight={18} />
    </HStack>
  )
}

function BangumiCover({ url, width, height }: { url?: string; width: number; height: number }) {
  const frame = { width, height, alignment: "center" as const }
  const shape = { type: "rect" as const, cornerRadius: 10, style: "continuous" as const }
  return url ? <Image imageUrl={url} resizable={true} scaleToFill={true} frame={frame} clipShape={shape} /> : <ZStack frame={frame} background="secondarySystemBackground" clipShape={shape}><CenteredSymbol systemName="film.stack" slotWidth={width} iconWidth={Math.min(width, 32)} iconHeight={Math.min(height, 32)} /></ZStack>
}

function CharacterPortrait({ url }: { url?: string }) {
  const { backgroundFill } = useBackgroundTheme()
  const width = 88
  const height = 118
  const inset = 3
  const frame = { width, height, alignment: "center" as const }
  const imageFrame = { width: width - inset * 2, height: height - inset * 2, alignment: "top" as const }
  const frameShape = { type: "rect" as const, cornerRadius: 17, style: "continuous" as const }
  const imageShape = { type: "rect" as const, cornerRadius: 14, style: "continuous" as const }
  const highlightColors: Color[] = ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.03)"]
  return (
    <ZStack frame={frame} background={{ style: backgroundFill, shape: frameShape }} clipShape={frameShape}>
      {url ? (
        <Image
          imageUrl={url}
          resizable={true}
          aspectRatio={{ value: null, contentMode: "fill" }}
          clipped={true}
          frame={imageFrame}
          clipShape={imageShape}
        />
      ) : (
        <ZStack frame={imageFrame} background="secondarySystemBackground" clipShape={imageShape}><CenteredSymbol systemName="person" font="title2" slotWidth={width - inset * 2} iconWidth={30} iconHeight={30} /></ZStack>
      )}
      <ZStack
        frame={imageFrame}
        background={{ style: backgroundFill, shape: imageShape }}
        opacity={0.04}
        allowsHitTesting={false}
        clipShape={imageShape}
      />
      <VStack frame={imageFrame} allowsHitTesting={false} clipShape={imageShape}>
        <HStack frame={{ maxWidth: "infinity" }} padding={{ horizontal: 9, top: 9 }}>
          <ZStack
            frame={{ width: 44, height: 13 }}
            background={{ style: { colors: highlightColors, startPoint: "topLeading", endPoint: "bottomTrailing" }, shape: "capsule" }}
            allowsHitTesting={false}
          />
          <Spacer />
        </HStack>
        <Spacer />
      </VStack>
    </ZStack>
  )
}

function TagGlassGrid({ tags }: { tags: string[] }) {
  return (
    <LazyVGrid columns={TAG_COLUMNS} alignment="leading" spacing={8} listRowBackground={<></>} listRowSeparator="hidden">
      {tags.map((tag) => (
        <Text
          key={tag}
          font="caption2"
          fontWeight="semibold"
          foregroundStyle="label"
          lineLimit={2}
          multilineTextAlignment="center"
          frame={{ maxWidth: "infinity", minHeight: 34, alignment: "center" }}
          padding={{ horizontal: 6, vertical: 4 }}
          glassEffect={glassEffectFor("content", "capsule", false)}
          listRowBackground={<></>}
          listRowSeparator="hidden"
        >
          {tag}
        </Text>
      ))}
    </LazyVGrid>
  )
}

function extractWebURL(value: string): string {
  return value.match(/https?:\/\/[^\s/]+(?:\/[^\s]*)?/i)?.[0]?.replace(/[）)】\],，。]+$/, "") || ""
}

function displayHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
}

function collectionIcon(key: string): string {
  return ({ wish: "bookmark", doing: "play.circle", collect: "checkmark.circle", on_hold: "pause.circle", dropped: "xmark.circle" } as Record<string, string>)[key] || "circle"
}

function ratingBar(percent: number): string {
  const filled = Math.min(10, Math.max(0, Math.round(percent / 4)))
  return `${"●".repeat(filled)}${"○".repeat(10 - filled)}`
}

function formatCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return `${value}`
}
