import { Script } from "scripting"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

async function main() {
  const clientSource = await FileManager.readAsString(`${projectDirectory}/class/hanime.ts`)
  const bangumiSource = await FileManager.readAsString(`${projectDirectory}/class/bangumi.ts`)
  const scheduleSource = await FileManager.readAsString(`${projectDirectory}/page/library/weekday_schedule.tsx`)
  const librarySource = await FileManager.readAsString(`${projectDirectory}/page/library/index.tsx`)
  const videoComponentsSource = await FileManager.readAsString(`${projectDirectory}/page/hanime/video_components.tsx`)
  const videoDetailSource = await FileManager.readAsString(`${projectDirectory}/page/hanime/video_detail.tsx`)

  const parserStart = clientSource.indexOf("function parseWeekdaySchedule")
  const parserEnd = clientSource.indexOf("function parseHomePage", parserStart)
  const parserSource = clientSource.slice(parserStart, parserEnd)
  if (parserStart < 0 || parserEnd < 0) throw new Error("未找到新番时间表解析器")

  const weekdayIds = Array.from(parserSource.matchAll(/\{ id: ([1-7]), title: "星期[一二三四五六日]", shortTitle: "周[一二三四五六日]" \}/g))
    .map((match) => Number(match[1]))
  if (weekdayIds.join(",") !== "1,2,3,4,5,6,7") throw new Error("解析器未固定声明周一至周日七天结构")
  requireMatch(parserSource, /extractElementById\(html, `week-module-\$\{weekday\.id\}`\)/, "解析器未读取官网 week-module-1…7 数据")
  requireMatch(parserSource, /parseVideoItems\(segment\)/, "官网星期模块未交给番剧条目解析器")
  requireMatch(clientSource, /ageRating: extractAgeRating\(segment\)/, "番剧条目未写入官网分级字段")
  requireMatch(clientSource, /extractTextByClass\(segment, "public-prt"\)/, "番剧分级未读取官网 public-prt 节点")
  requireMatch(parserSource, /!days\.some\(\(day\) => day\.items\.length > 0\)/, "解析器缺少官网时间表全空保护")

  requireMatch(bangumiSource, /const CALENDAR_CACHE_TTL = 60 \* 60 \* 1000/, "Bangumi 时间表未使用一小时短时缓存")
  requireMatch(bangumiSource, /async getCalendar\(forceRefresh = false\)[\s\S]*?\/calendar[\s\S]*?parseCalendar/, "Bangumi 客户端未接入公开日历接口")
  requireMatch(bangumiSource, /function parseCalendar[\s\S]*?id: 1, title: "星期一"[\s\S]*?id: 7, title: "星期日"/, "Bangumi 日历未固定周一至周日七天结构")
  requireMatch(bangumiSource, /numberValue\(input\.type\) !== 2/, "Bangumi 日历未过滤非动画条目")
  requireMatch(bangumiSource, /!days\.some\(\(day\) => day\.items\.length > 0\)/, "Bangumi 日历缺少全空保护")

  requireMatch(scheduleSource, /<ScheduleOverviewCard[\s\S]*?<ScheduleSourceButton title="GiriGiri"[\s\S]*?<ScheduleSourceButton title="Bangumi"[\s\S]*?<ScrollView axes="horizontal">/, "时间表未按概览、来源切换、星期选择器顺序布局")
  requireMatch(scheduleSource, /function ScheduleOverviewCard[\s\S]*?const isBangumi = source === "bangumi"/, "时间表概览未按来源切换内容")
  requireMatch(scheduleSource, /\{title\}[\s\S]*?\{subtitle\}/, "时间表概览未使用标题与说明两级阅读文字")
  if (/HanimeHeroCard/.test(scheduleSource)) throw new Error("时间表概览不应再使用已退场的 Hero 卡")
  const overviewStart = scheduleSource.indexOf("function ScheduleOverviewCard")
  const overviewEnd = scheduleSource.indexOf("function ScheduleSourceButton", overviewStart)
  const overviewSource = scheduleSource.slice(overviewStart, overviewEnd)
  if (overviewStart < 0 || overviewEnd < 0) throw new Error("未找到合并后的时间表概览卡")
  if (/<Image\b/.test(overviewSource)) throw new Error("合并后的时间表概览卡不应包含 SF Symbol")
  requireMatch(scheduleSource, /\{group\.id !== "upcoming" \? <ScheduleGroupHeader group=\{group\} \/> : null\}/, "尚未放送仍重复显示独立提示框")
  const sourceButtonStart = scheduleSource.indexOf("function ScheduleSourceButton")
  const sourceButtonEnd = scheduleSource.indexOf("function BangumiCalendarRow", sourceButtonStart)
  const sourceButtonSource = scheduleSource.slice(sourceButtonStart, sourceButtonEnd)
  requireMatch(sourceButtonSource, /<Button[\s\S]*?glassEffect=\{glassEffectFor/, "来源切换未由原生 Button 直接持有 Glass")
  requireMatch(sourceButtonSource, /accessibilityAddTraits=\{selected \? "isSelected" : \[\]\}/, "来源切换缺少辅助功能选中语义")
  requireMatch(sourceButtonSource, /systemName="checkmark"/, "来源切换缺少非颜色勾选线索")
  requireMatch(sourceButtonSource, />已选<\//, "来源切换缺少可见已选文字")
  requireMatch(scheduleSource, /destination=\{<BangumiDetailView title=\{item\.nameCn \|\| item\.name\} subjectId=\{item\.id\} \/>\}/, "Bangumi 时间表条目未按 subject id 直达资料页")
  requireMatch(scheduleSource, /function BangumiCalendarRow[\s\S]*?item\.airDate[\s\S]*?item\.score[\s\S]*?item\.doingCount/, "Bangumi 时间表行未展示真实日期、评分与在看资料")
  requireMatch(scheduleSource, /<GlassSurface material="content">[\s\S]*?<ScrollView axes="horizontal">/, "星期选择器缺少完整静态 Glass 背景")
  requireMatch(scheduleSource, /<ScrollView axes="horizontal">/, "星期选择器不是横向滚动")
  requireMatch(scheduleSource, /groupTodaySchedule\(selectedGiriGiriDay\.items, now\)/, "GiriGiri 今日列表未按当前时间动态分层")
  requireMatch(scheduleSource, /const selectedBangumiDay = source === "bangumi"[\s\S]*?const todayGroups = selectedGiriGiriDay/, "Bangumi 时间表错误复用了 GiriGiri 分钟级状态")
  requireMatch(scheduleSource, /title: "尚未放送"[\s\S]*?title: "已过放送时间"[\s\S]*?title: "时间待定"/, "今日列表缺少明确的放送时间分层")
  requireMatch(scheduleSource, /parseBroadcastMinutes\(item\.duration\)/, "今日分层未读取官网条目的放送时间")
  requireMatch(scheduleSource, /<ScheduleGroupHeader group=\{group\} \/>/, "今日放送分层缺少静态 Glass 标题行")
  requireMatch(scheduleSource, /accessory=\{<ScheduleStatusAccessory/, "今日番剧行缺少非颜色状态附件")
  requireMatch(videoComponentsSource, /<PosterCover url=\{video\.coverUrl\} size="compact" \/>/, "共享视频行未使用统一竖版海报相框")
  requireMatch(videoComponentsSource, /\{meta\}[\s\S]*?<AgeRatingBadge rating=\{video\.ageRating\} \/>/, "共享视频行未将分级作为说明之后的 compact summary")
  requireMatch(videoComponentsSource, /function AgeRatingBadge[\s\S]*?const label = rating \|\| "分级待定"[\s\S]*?glassEffect=\{glassEffectFor\("content", "capsule", false\)\}/, "说明文字列分级不是带待定回退的 non-interactive 小 Glass")
  requireMatch(clientSource, /ageRating: extractAgeRating\(detail\)/, "番剧详情未解析官网分级")
  requireMatch(videoDetailSource, /<PosterCover url=\{item\.coverUrl \|\| detail\?\.coverUrl\} size="regular" \/>[\s\S]*?<AgeRatingBadge rating=\{detail\?\.ageRating \|\| item\.ageRating\} \/>/, "详情页头部未按海报在左、标题与分级在右排布")
  if (/DetailHeroCover/.test(videoDetailSource)) throw new Error("详情页不应再使用已退场的横版 Hero 封面")
  requireMatch(scheduleSource, /setTimeout\([\s\S]*?60_000/, "今日放送状态未按分钟刷新")
  if (/Section title=\{selectedDay/.test(scheduleSource) || /Section title=\{selectedDay\.id/.test(scheduleSource)) {
    throw new Error("星期或播出状态仍以裸露 Section 标题显示")
  }
  const weekdayButtonStart = scheduleSource.indexOf("function WeekdayButton")
  const weekdayButtonEnd = scheduleSource.indexOf("function localWeekdayId", weekdayButtonStart)
  const weekdayButtonSource = scheduleSource.slice(weekdayButtonStart, weekdayButtonEnd)
  if (weekdayButtonStart < 0 || weekdayButtonEnd < 0) throw new Error("未找到星期 Button 组件")
  requireMatch(weekdayButtonSource, /<Button[\s\S]*?glassEffect=\{glassEffectFor\([^>]+>[\s\S]*?<\/Button>/, "星期原生 Button 未直接持有 Glass")
  requireMatch(weekdayButtonSource, /glassEffectTransition="materialize"/, "星期 Button 缺少原生 materialize 反馈")
  requireMatch(weekdayButtonSource, /const detailText = \[[\s\S]*?`\$\{day\.items\.length\} 部`[\s\S]*?isToday \? "今天" : ""[\s\S]*?selected \? "已选" : ""[\s\S]*?\]\.filter\(Boolean\)\.join\(" · "\)/, "星期胶囊未同时保留真实数量、今天与已选状态")
  requireMatch(weekdayButtonSource, /systemName="checkmark"/, "当前选择缺少非颜色勾选线索")
  requireMatch(weekdayButtonSource, /accessibilityAddTraits=\{selected \? "isSelected" : \[\]\}/, "当前选择缺少辅助功能选中语义")

  requireMatch(librarySource, /import \{ WeekdayScheduleView \} from "\.\/weekday_schedule"/, "首页未导入新番时间表")
  requireMatch(librarySource, /<NavigationLink[\s\S]*?destination=\{<WeekdayScheduleView \/>\}[\s\S]*?>/, "首页缺少新番时间表导航入口")
  requireMatch(librarySource, />新番时间表<\//, "首页入口缺少可见标题")
  requireMatch(librarySource, /GiriGiri 与 Bangumi [\s\S]{0,20}周一至周日/, "首页入口未说明双来源时间表")
  requireMatch(clientSource, /const banners = parseBanners\(html\)/, "首页未解析多个官网焦点推荐")
  requireMatch(clientSource, /extractElementsByClass\(html, "slide-time-bj"\)/, "焦点推荐未读取全部官网轮播项")
  requireMatch(librarySource, /home\.banners\.map\(\(banner\) =>/, "首页焦点推荐仍只显示单项")
  requireMatch(librarySource, /const SHELF_HEIGHT = posterCardHeight\("regular", true\)/, "首页货架未使用共享海报高度公式")
  requireMatch(librarySource, /<ShelfHeader title="焦点推荐"[\s\S]*?<PosterShelf height=\{SHELF_HEIGHT\}>/, "首页焦点分区未按轻量标题 + 统一高度货架组合")
  requireMatch(librarySource, /<PosterCardContent[\s\S]*?coverUrl=\{banner\.picUrl\}[\s\S]*?ageRating=\{banner\.ageRating\}/, "焦点推荐未使用统一海报卡与分级角标")
  requireMatch(librarySource, /home\.sections\.map\(\(section\) => \([\s\S]*?<PosterShelf height=\{SHELF_HEIGHT\}>/, "首页分区未统一使用海报货架")
  requireMatch(videoComponentsSource, /<Text font="caption2" fontWeight="semibold" foregroundStyle="label"/, "分级小 Glass 未固定使用系统正文色")
  if (/GlassSectionHeader/.test(librarySource)) throw new Error("首页不应再使用已退场的实色胶囊分区标题")

  console.log(JSON.stringify({
    fixedWeekdays: weekdayIds.length,
    sources: ["GiriGiri week-module-1…7", "Bangumi /calendar"],
    sourceSwitcher: "native Glass with checkmark, 已选 and isSelected",
    bangumiNavigation: "subject id direct to BangumiDetailView",
    horizontalScroll: true,
    weekdayGlassBackground: true,
    nativeButtonGlassOwner: true,
    nonColorStateCues: ["checkmark", "已选", "今天", "isSelected"],
    todayBroadcastLayers: ["尚未放送（合并至顶部）", "已过放送时间", "时间待定"],
    scheduleOverview: "settings-style branded hero, icon-free",
    minuteRefresh: true,
    ageRatingBadge: "all titles, previous metadata position, small non-interactive Glass",
    focusRowBackground: "clear",
    focusCarousel: "horizontal, uniform compact 310x122 cards",
    homeEntry: true,
  }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
