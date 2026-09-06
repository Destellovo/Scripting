import { Script } from "scripting"

// 分区标题视觉契约：生产页面统一使用轻量 ShelfHeader，
// 实色填充胶囊标题（GlassSectionHeader）已退场。
const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

const PRODUCTION_PAGES = [
  "library/index.tsx",
  "search/index.tsx",
  "saved/index.tsx",
  "download/index.tsx",
  "setting/index.tsx",
  "library/weekday_schedule.tsx",
  "library/bangumi_progress.tsx",
  "setting/bangumi_oauth.tsx",
  "hanime/video_detail.tsx",
  "hanime/bangumi_detail.tsx",
  "hanime/local_video_player.tsx",
]

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [shelf, poster, grid] = await Promise.all([
    FileManager.readAsString(`${root}/design-glass/shelf.tsx`),
    FileManager.readAsString(`${root}/design-glass/poster.tsx`),
    FileManager.readAsString(`${root}/design-glass/grid.tsx`),
  ])
  const pageSources = await Promise.all(
    PRODUCTION_PAGES.map(async (path) => ({
      path,
      source: await FileManager.readAsString(`${root}/page/${path}`),
    })),
  )

  // 旧实色胶囊标题与旧 Hero 卡不得回归任何生产页面。
  for (const { path, source } of pageSources) {
    assert(!source.includes("GlassSectionHeader"), `${path} 不得恢复实色胶囊分区标题`)
    assert(!source.includes("HanimeHeroCard"), `${path} 不得恢复占满首屏的 Hero 卡`)
  }

  const headerStart = shelf.indexOf("export function ShelfHeader")
  const headerEnd = shelf.indexOf("export function PosterShelf", headerStart)
  assert(headerStart >= 0 && headerEnd > headerStart, "未找到 ShelfHeader 实现")
  const headerSource = shelf.slice(headerStart, headerEnd)

  assert(headerSource.includes("const { backgroundFill } = useBackgroundTheme()"), "分区标题必须实时读取当前主题填充")
  assert(headerSource.includes('font="headline"'), "分区标题必须使用系统阅读层级字号，而非白字投影")
  assert(!headerSource.includes('foregroundStyle="white"'), "分区标题不得再使用固定白字")
  assert(headerSource.includes("width: 4, height: 20"), "分区标题缺少消费主题填充的轻量竖标记")
  assert(
    headerSource.includes("listRowBackground={<></>}") && headerSource.includes('listRowSeparator="hidden"'),
    "分区标题最外层必须清除系统 List 背景与分隔线",
  )

  // 海报几何：2:3 竖版，货架高度由共享公式给出且上下 padding 只算一次。
  assert(poster.includes("regular: { width: 118, coverHeight: 172 }"), "海报未使用 2:3 竖版标准尺寸")
  assert(poster.includes("export function posterCardHeight"), "海报缺少共享高度公式")
  assert(
    /POSTER_METRICS\[size\]\.coverHeight\s*\+\s*POSTER_TEXT_SPACING\s*\+\s*POSTER_TITLE_HEIGHT/.test(poster),
    "海报高度公式未固定文字轨道，或重复累计 padding",
  )
  assert(!poster.includes("glassEffect"), "海报封面不得叠加整幅 Glass 遮盖画面")
  const ratingStart = poster.indexOf("export function PosterAgeRating")
  const ratingEnd = poster.indexOf("export function PosterCardContent", ratingStart)
  assert(ratingStart >= 0 && ratingEnd > ratingStart, "未找到海报分级角标实现")
  const ratingSource = poster.slice(ratingStart, ratingEnd)
  assert(poster.includes('overlay={bottomAccessory ? { alignment: "bottomTrailing", content: bottomAccessory } : undefined}'), "海报分级必须通过结构化 overlay 固定在右下安全区")
  assert(poster.includes("ageRating?: string"), "海报卡必须使用无原生冲突的 ageRating 属性")
  assert(!/\bbadge\?: string/.test(poster), "PosterCardContent 禁止声明 badge 属性，否则原生修饰器会额外生成中部分级")
  for (const { path, source } of pageSources) {
    assert(!source.includes("badge={"), `${path} 的海报调用不得使用会触发原生修饰器的 badge 属性`)
  }
  assert(!ratingSource.includes('maxWidth: "infinity"'), "分级角标不得撑满封面并产生重复合成")
  assert(ratingSource.includes('background={{ style: "rgba(0,0,0,0.68)"'), "分级角标缺少稳定文字对比底")
  assert(grid.includes("min: POSTER_METRICS.regular.width"), "海报网格未以标准海报宽度为自适应下限")
  assert(
    grid.includes("leading: GIRIGIRI_GLASS_TOKENS.spacing.comfortable") &&
      grid.includes("trailing: GIRIGIRI_GLASS_TOKENS.spacing.comfortable"),
    "海报网格首尾必须使用 16pt 内容留白，使首列对齐分区竖标记左侧基线",
  )

  const shelfStart = shelf.indexOf("export function PosterShelf")
  const shelfEnd = shelf.indexOf("export function ShelfMoreTileContent", shelfStart)
  assert(shelfStart >= 0 && shelfEnd > shelfStart, "未找到 PosterShelf 实现")
  const posterShelfSource = shelf.slice(shelfStart, shelfEnd)
  assert(
    posterShelfSource.includes("leading: GIRIGIRI_GLASS_TOKENS.spacing.comfortable") &&
      posterShelfSource.includes("trailing: GIRIGIRI_GLASS_TOKENS.spacing.comfortable"),
    "横向货架首尾必须使用 16pt 内容留白，使首张海报对齐分区竖标记左侧基线",
  )
  assert(!posterShelfSource.includes("padding={{ horizontal: 2"), "横向货架不得再次贴近屏幕左缘")

  const bangumiDetail = pageSources.find(({ path }) => path === "hanime/bangumi_detail.tsx")?.source || ""
  assert(
    (bangumiDetail.match(/leading: GIRIGIRI_GLASS_TOKENS\.spacing\.comfortable/g) || []).length >= 2 &&
      (bangumiDetail.match(/trailing: GIRIGIRI_GLASS_TOKENS\.spacing\.comfortable/g) || []).length >= 2,
    "Bangumi 角色与关联动画独立货架未统一使用 16pt 首尾留白",
  )

  console.log(JSON.stringify({
    retiredSurfaces: ["GlassSectionHeader", "HanimeHeroCard", "DetailHeroCover"],
    sectionTitle: "lightweight headline + theme-filled 4pt marker",
    poster: "2:3 portrait, shared height formula, one bottom-trailing rating, no full-cover glass",
    grid: "adaptive columns floored at poster width",
    checkedPages: PRODUCTION_PAGES.length,
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
