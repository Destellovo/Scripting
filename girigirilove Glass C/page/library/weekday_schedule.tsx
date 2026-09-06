import {
  Button,
  HStack,
  Image,
  List,
  NavigationLink,
  ScrollView,
  Section,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import {
  hanimeClient,
  HanimeVideoItem,
  HanimeWeekdayId,
  HanimeWeekdaySchedule,
  HanimeWeekdayScheduleDay,
} from "../../class/hanime"
import {
  bangumiClient,
  BangumiCalendar,
  BangumiCalendarDay,
  BangumiCalendarItem,
} from "../../class/bangumi"
import {
  BackgroundThemeProvider,
  glassEffectFor,
  glassListRowStyleProps,
  GlassListRow,
  GlassSurface,
  PageBackground,
} from "../../design-glass"
import { EmptyState } from "../components/empty_state"
import { ErrorState } from "../components/error_state"
import { LoadingState } from "../components/loading_state"
import { HanimeVideoRow } from "../hanime/video_components"
import { VideoDetailView } from "../hanime/video_detail"
import { BangumiDetailView } from "../hanime/bangumi_detail"

type ScheduleSource = "girigiri" | "bangumi"

export function WeekdayScheduleView() {
  const [source, setSource] = useState<ScheduleSource>("girigiri")
  const [schedule, setSchedule] = useState<HanimeWeekdaySchedule | null>(null)
  const [bangumiSchedule, setBangumiSchedule] = useState<BangumiCalendar | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<HanimeWeekdayId>(localWeekdayId())
  const [loading, setLoading] = useState(true)
  const [bangumiLoading, setBangumiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bangumiError, setBangumiError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    void loadSchedule()
    let active = true
    let timer = 0
    const refreshClock = () => {
      timer = setTimeout(() => {
        if (!active) return
        setNow(new Date())
        refreshClock()
      }, 60_000)
    }
    refreshClock()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [])

  async function loadSchedule(forceRefresh = false) {
    try {
      setLoading(true)
      setError(null)
      setSchedule(await hanimeClient.getWeekdaySchedule(forceRefresh))
    } catch (loadError) {
      console.error("加载 GiriGiri 新番时间表失败:", loadError)
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadBangumiSchedule(forceRefresh = false) {
    try {
      setBangumiLoading(true)
      setBangumiError(null)
      setBangumiSchedule(await bangumiClient.getCalendar(forceRefresh))
    } catch (loadError) {
      console.error("加载 Bangumi 新番时间表失败:", loadError)
      setBangumiError(`${loadError}`)
    } finally {
      setBangumiLoading(false)
    }
  }

  function selectSource(nextSource: ScheduleSource) {
    setSource(nextSource)
    if (nextSource === "bangumi" && !bangumiSchedule && !bangumiLoading) void loadBangumiSchedule()
  }

  const activeSchedule = source === "girigiri" ? schedule : bangumiSchedule
  const selectedDay = activeSchedule?.days.find((day) => day.id === selectedDayId)
  const selectedGiriGiriDay = source === "girigiri" ? selectedDay as HanimeWeekdayScheduleDay | undefined : undefined
  const selectedBangumiDay = source === "bangumi" ? selectedDay as BangumiCalendarDay | undefined : undefined
  const activeLoading = source === "girigiri" ? loading : bangumiLoading
  const activeError = source === "girigiri" ? error : bangumiError
  const todayId = localWeekdayId()
  const todayGroups = selectedGiriGiriDay?.id === todayId ? groupTodaySchedule(selectedGiriGiriDay.items, now) : []
  const upcomingGroup = todayGroups.find((group) => group.id === "upcoming")
  const refreshActiveSource = () => source === "girigiri" ? loadSchedule(true) : loadBangumiSchedule(true)

  return (
    <ZStack>
      <PageBackground />
      <List
        navigationTitle="新番时间表"
        listStyle="inset"
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
      >
        <Section>
          <ScheduleOverviewCard
            source={source}
            selectedDay={selectedDay}
            isToday={selectedDay?.id === todayId}
            upcomingCount={upcomingGroup?.items.length || 0}
          />
        </Section>

        <Section>
          <GlassSurface material="content">
            <HStack spacing={8} padding={{ horizontal: 12, vertical: 12 }} frame={{ maxWidth: "infinity", alignment: "center" }}>
              <ScheduleSourceButton title="GiriGiri" selected={source === "girigiri"} action={() => selectSource("girigiri")} />
              <ScheduleSourceButton title="Bangumi" selected={source === "bangumi"} action={() => selectSource("bangumi")} />
            </HStack>
          </GlassSurface>
        </Section>

        {activeSchedule ? (
          <Section>
            <GlassSurface material="content">
              <ScrollView axes="horizontal">
                <HStack spacing={8} padding={{ horizontal: 12, vertical: 12 }}>
                  {activeSchedule.days.map((day) => (
                    <WeekdayButton
                      key={day.id}
                      day={day}
                      selected={day.id === selectedDayId}
                      isToday={day.id === todayId}
                      action={() => setSelectedDayId(day.id)}
                    />
                  ))}
                </HStack>
              </ScrollView>
            </GlassSurface>
          </Section>
        ) : null}

        {activeLoading && !activeSchedule ? <Section><LoadingState message={`正在加载 ${source === "girigiri" ? "GiriGiri" : "Bangumi"} 新番时间表…`} /></Section> : null}
        {activeError && !activeSchedule ? <Section><ErrorState message={activeError} onRetry={() => { void refreshActiveSource() }} /></Section> : null}

        {selectedGiriGiriDay && selectedGiriGiriDay.items.length > 0 && selectedGiriGiriDay.id === todayId ? (
          <>
            {todayGroups.map((group) => (
              <Section key={group.id}>
                {group.id !== "upcoming" ? <ScheduleGroupHeader group={group} /> : null}
                {group.items.map((entry) => (
                  <NavigationLink {...glassListRowStyleProps} key={entry.item.videoCode} destination={<VideoDetailView video={entry.item} />}>
                    <HanimeVideoRow video={entry.item} accessory={<ScheduleStatusAccessory groupId={group.id} timeLabel={entry.timeLabel} />} />
                  </NavigationLink>
                ))}
              </Section>
            ))}
          </>
        ) : null}

        {selectedGiriGiriDay && selectedGiriGiriDay.items.length > 0 && selectedGiriGiriDay.id !== todayId ? (
          <Section>
            {selectedGiriGiriDay.items.map((item) => (
              <NavigationLink {...glassListRowStyleProps} key={item.videoCode} destination={<VideoDetailView video={item} />}>
                <HanimeVideoRow video={item} />
              </NavigationLink>
            ))}
          </Section>
        ) : null}

        {selectedBangumiDay && selectedBangumiDay.items.length > 0 ? (
          <Section>
            {selectedBangumiDay.items.map((item) => (
              <NavigationLink
                {...glassListRowStyleProps}
                key={item.id}
                destination={<BangumiDetailView title={item.nameCn || item.name} subjectId={item.id} />}
              >
                <BangumiCalendarRow item={item} />
              </NavigationLink>
            ))}
          </Section>
        ) : null}

        {!activeLoading && selectedDay && selectedDay.items.length === 0 ? (
          <Section>
            <EmptyState
              icon="calendar.badge.exclamationmark"
              title={`${selectedDay.title}暂无条目`}
              message={`${source === "girigiri" ? "GiriGiri 官网" : "Bangumi"}当前没有为这一天提供番剧安排，可切换其他星期或刷新时间表。`}
              actionTitle="刷新时间表"
              action={() => { void refreshActiveSource() }}
            />
          </Section>
        ) : null}

        {activeError && activeSchedule ? <Section><ErrorState message={activeError} onRetry={() => { void refreshActiveSource() }} /></Section> : null}
      </List>
    </ZStack>
  )
}

type ScheduleDay = HanimeWeekdayScheduleDay | BangumiCalendarDay

function ScheduleOverviewCard({
  source,
  selectedDay,
  isToday,
  upcomingCount,
}: {
  source: ScheduleSource
  selectedDay?: ScheduleDay
  isToday: boolean
  upcomingCount: number
}) {
  const isBangumi = source === "bangumi"
  const title = isBangumi
    ? selectedDay ? `${selectedDay.title}安排 · ${selectedDay.items.length} 部` : "Bangumi 新番时间表"
    : isToday
      ? `尚未放送 · ${upcomingCount} 部`
      : selectedDay
        ? `${selectedDay.title}安排 · ${selectedDay.items.length} 部`
        : "新番时间表"
  const subtitle = isBangumi
    ? selectedDay
      ? `正在查看 Bangumi 收录的${selectedDay.title}动画条目。左右滑动切换星期，点按番剧查看完整资料。`
      : "正在读取 Bangumi 周一至周日的动画放送条目。"
    : isToday
      ? upcomingCount > 0
        ? "这些番剧尚未到官网标注的今日放送时间。左右滑动切换星期，点按番剧查看详情。"
        : "今日安排均已到达放送时间，或尚未公布具体时间。左右滑动可查看其他星期。"
      : selectedDay
        ? `正在查看${selectedDay.title}的官网放送安排。左右滑动切换星期，点按番剧查看详情。`
        : "正在读取周一至周日的官网放送安排。数据来自 GiriGiri 官网周期表。"

  return (
    <VStack
      alignment="leading"
      spacing={3}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <Text font="headline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
        {title}
      </Text>
      <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
        {subtitle}
      </Text>
    </VStack>
  )
}

function ScheduleSourceButton({ title, selected, action }: { title: string; selected: boolean; action: () => void }) {
  return (
    <Button
      action={action}
      buttonStyle="plain"
      frame={{ maxWidth: "infinity", minHeight: 46 }}
      glassEffect={glassEffectFor(selected ? "elevated" : "navigation", "capsule", true)}
      glassEffectTransition="materialize"
      accessibilityLabel={`${title} 新番时间表`}
      accessibilityValue={selected ? "已选择" : "未选择"}
      accessibilityAddTraits={selected ? "isSelected" : []}
    >
      <HStack spacing={6} padding={{ horizontal: 14, vertical: 10 }} frame={{ maxWidth: "infinity", minHeight: 46, alignment: "center" }}>
        {selected ? <Image systemName="checkmark" font="caption" foregroundStyle="systemPink" /> : null}
        <Text font="subheadline" fontWeight={selected ? "bold" : "semibold"}>{title}</Text>
        {selected ? <Text font="caption2" foregroundStyle="secondaryLabel">已选</Text> : null}
      </HStack>
    </Button>
  )
}

function BangumiCalendarRow({ item }: { item: BangumiCalendarItem }) {
  const title = item.nameCn || item.name
  const subtitle = [item.nameCn ? item.name : "", item.airDate].filter(Boolean).join(" · ")
  return (
    <HStack alignment="center" spacing={12} padding={{ vertical: 8 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <BangumiCalendarCover url={item.imageUrl} />
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading">{title}</Text>
        {subtitle ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading">{subtitle}</Text> : null}
        <Text font="caption2" foregroundStyle="tertiaryLabel" lineLimit={1}>{item.rank ? `排名 #${item.rank}` : "Bangumi 动画资料"}</Text>
      </VStack>
      <VStack alignment="trailing" spacing={3} frame={{ minWidth: 62 }}>
        <Text font="caption" fontWeight="semibold" lineLimit={1}>{item.score ? `${item.score.toFixed(1)} 分` : "暂无评分"}</Text>
        <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{item.doingCount ? `${formatScheduleCount(item.doingCount)} 人在看` : `${formatScheduleCount(item.votes)} 人评分`}</Text>
        <Image systemName="chevron.right" font="caption2" foregroundStyle="tertiaryLabel" />
      </VStack>
    </HStack>
  )
}

function BangumiCalendarCover({ url }: { url?: string }) {
  const frame = { width: 54, height: 72, alignment: "center" as const }
  const shape = { type: "rect" as const, cornerRadius: 10, style: "continuous" as const }
  return url
    ? <Image imageUrl={url} resizable={true} scaleToFill={true} frame={frame} clipShape={shape} />
    : <ZStack frame={frame} background="secondarySystemBackground" clipShape={shape}><Image systemName="film.stack" font="title2" foregroundStyle="secondaryLabel" /></ZStack>
}

function formatScheduleCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}千`
  return `${value}`
}

type TodayScheduleGroupId = "upcoming" | "aired" | "unknown"

type TodayScheduleEntry = {
  item: HanimeVideoItem
  minutes: number | null
  timeLabel: string
}

type TodayScheduleGroup = {
  id: TodayScheduleGroupId
  title: string
  message: string
  icon: string
  items: TodayScheduleEntry[]
}

function ScheduleGroupHeader({ group }: { group: TodayScheduleGroup }) {
  return (
    <GlassListRow>
      <HStack spacing={10} padding={{ horizontal: 14, vertical: 12 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Image systemName={group.icon} font="headline" foregroundStyle={group.id === "upcoming" ? "systemOrange" : "secondaryLabel"} frame={{ width: 24 }} />
        <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="subheadline" fontWeight="semibold">{group.title} · {group.items.length} 部</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{group.message}</Text>
        </VStack>
      </HStack>
    </GlassListRow>
  )
}

function ScheduleStatusAccessory({ groupId, timeLabel }: { groupId: TodayScheduleGroupId; timeLabel: string }) {
  const upcoming = groupId === "upcoming"
  const unknown = groupId === "unknown"
  return (
    <VStack alignment="trailing" spacing={2} frame={{ minWidth: 58 }}>
      <Image
        systemName={upcoming ? "clock.badge.exclamationmark" : unknown ? "questionmark.circle" : "checkmark.circle"}
        font="caption"
        foregroundStyle={upcoming ? "systemOrange" : "secondaryLabel"}
      />
      <Text font="caption2" fontWeight="semibold" lineLimit={1}>{unknown ? "待定" : timeLabel}</Text>
      <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{upcoming ? "待放送" : unknown ? "未公布" : "已过时间"}</Text>
    </VStack>
  )
}

function groupTodaySchedule(items: HanimeVideoItem[], now: Date): TodayScheduleGroup[] {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const entries = items.map((item): TodayScheduleEntry => {
    const minutes = parseBroadcastMinutes(item.duration)
    return { item, minutes, timeLabel: minutes == null ? "" : formatBroadcastTime(minutes) }
  })
  const upcoming = entries
    .filter((entry) => entry.minutes != null && entry.minutes > currentMinutes)
    .sort((left, right) => (left.minutes || 0) - (right.minutes || 0))
  const aired = entries
    .filter((entry) => entry.minutes != null && entry.minutes <= currentMinutes)
    .sort((left, right) => (right.minutes || 0) - (left.minutes || 0))
  const unknown = entries.filter((entry) => entry.minutes == null)

  return [
    {
      id: "upcoming" as const,
      title: "尚未放送",
      message: "以下番剧还没到官网标注的今日放送时间。",
      icon: "clock.badge.exclamationmark",
      items: upcoming,
    },
    {
      id: "aired" as const,
      title: "已过放送时间",
      message: "以下番剧已到或超过官网标注的今日放送时间。",
      icon: "checkmark.circle",
      items: aired,
    },
    {
      id: "unknown" as const,
      title: "时间待定",
      message: "官网尚未提供可解析的今日放送时间。",
      icon: "questionmark.circle",
      items: unknown,
    },
  ].filter((group) => group.items.length > 0)
}

function parseBroadcastMinutes(value?: string): number | null {
  if (!value) return null
  const match = /(\d{1,2})\s*[點点时時:]\s*(\d{1,2})\s*分?/.exec(value)
  if (!match) return null
  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

function formatBroadcastTime(minutes: number): string {
  const hour = Math.floor(minutes / 60).toString().padStart(2, "0")
  const minute = (minutes % 60).toString().padStart(2, "0")
  return `${hour}:${minute}`
}

function WeekdayButton({
  day,
  selected,
  isToday,
  action,
}: {
  day: ScheduleDay
  selected: boolean
  isToday: boolean
  action: () => void
}) {
  const detailText = [
    `${day.items.length} 部`,
    isToday ? "今天" : "",
    selected ? "已选" : "",
  ].filter(Boolean).join(" · ")

  return (
    <Button
      action={action}
      buttonStyle="plain"
      frame={{ minWidth: 86, minHeight: 54 }}
      glassEffect={glassEffectFor(selected ? "elevated" : "navigation", "capsule", true)}
      glassEffectTransition="materialize"
      accessibilityLabel={`${day.title}${isToday ? "，今天" : ""}`}
      accessibilityValue={`${day.items.length} 部番剧${selected ? "，已选择" : isToday ? "，今天" : ""}`}
      accessibilityAddTraits={selected ? "isSelected" : []}
    >
      <VStack spacing={3} padding={{ horizontal: 14, vertical: 8 }} frame={{ minWidth: 86, minHeight: 54 }}> 
        <HStack spacing={4}>
          {selected ? <Image systemName="checkmark" font="caption2" foregroundStyle="systemPink" /> : null}
          <Text font="subheadline" fontWeight={selected ? "bold" : "semibold"}>{day.shortTitle}</Text>
        </HStack>
        <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{detailText}</Text>
      </VStack>
    </Button>
  )
}

function localWeekdayId(): HanimeWeekdayId {
  const weekday = new Date().getDay()
  return (weekday === 0 ? 7 : weekday) as HanimeWeekdayId
}

export default function WeekdaySchedulePreview() {
  return (
    <BackgroundThemeProvider>
      <WeekdayScheduleView />
    </BackgroundThemeProvider>
  )
}
