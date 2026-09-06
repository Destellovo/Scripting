import { HStack, Image, LazyVGrid, Text, VStack, ZStack, type Color } from "scripting"
import { GIRIGIRI_GLASS_TOKENS } from "./tokens"
import { POSTER_METRICS, posterCardHeight } from "./poster"

/**
 * 海报网格：搜索、片库、标签结果等需要密集扫读的页面使用。
 * 自适应列宽以海报标准宽度为下限，保证不同机型上列数合理且封面不被压缩变形。
 */
export const POSTER_GRID_COLUMNS = [
  {
    size: { type: "adaptive" as const, min: POSTER_METRICS.regular.width, max: 168 },
    spacing: GIRIGIRI_GLASS_TOKENS.spacing.regular,
  },
]

export const POSTER_GRID_ROW_HEIGHT = posterCardHeight("regular", true)

export function PosterGrid({ children }: { children?: any }) {
  return (
    <LazyVGrid
      columns={POSTER_GRID_COLUMNS}
      alignment="leading"
      spacing={GIRIGIRI_GLASS_TOKENS.spacing.comfortable}
      frame={{ maxWidth: "infinity" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      listRowInsets={{ leading: 0, trailing: 0, top: 4, bottom: 4 }}
      padding={{
        leading: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
        trailing: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
      }}
    >
      {children}
    </LazyVGrid>
  )
}

/**
 * 统一行卡内容：需要横向阅读的列表（历史、下载、剧集、文件）共用同一 anatomy。
 * 左侧固定宽度图标或缩略图槽相对整卡中线居中；标题与 byline 是普通阅读文字行，
 * 共享 leading 轴；trailing accessory 是整卡 sibling。
 */
export function ContentRow({
  title,
  subtitle,
  detail,
  leading,
  accessory,
  showsChevron,
}: {
  title: string
  subtitle?: string
  detail?: string
  leading?: JSX.Element
  accessory?: JSX.Element
  showsChevron?: boolean
}) {
  return (
    <HStack
      alignment="center"
      spacing={12}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      padding={{ vertical: 4 }}
    >
      {leading ? (
        <ZStack frame={{ width: 30, maxHeight: "infinity", alignment: "center" }} alignment="center">
          {leading}
        </ZStack>
      ) : null}

      <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text
          font="subheadline"
          fontWeight="semibold"
          foregroundStyle="label"
          lineLimit={2}
          multilineTextAlignment="leading"
          frame={{ maxWidth: "infinity", alignment: "leading" }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            font="caption"
            foregroundStyle="secondaryLabel"
            lineLimit={2}
            multilineTextAlignment="leading"
            frame={{ maxWidth: "infinity", alignment: "leading" }}
          >
            {subtitle}
          </Text>
        ) : null}
        {detail ? (
          <Text
            font="caption2"
            foregroundStyle="tertiaryLabel"
            lineLimit={1}
            multilineTextAlignment="leading"
            frame={{ maxWidth: "infinity", alignment: "leading" }}
          >
            {detail}
          </Text>
        ) : null}
      </VStack>

      {accessory ?? null}
      {showsChevron ? <Image systemName="chevron.right" font="caption" foregroundStyle="tertiaryLabel" /> : null}
    </HStack>
  )
}

/**
 * 行内轻量标记：集数、状态、进度等 compact summary。
 * 不用于标题或来源 byline；状态差异由文字本身承载，不依赖颜色。
 */
export function RowTag({
  text,
  emphasis,
}: {
  text: string
  emphasis?: boolean
}) {
  return (
    <Text
      font="caption2"
      fontWeight={emphasis ? "semibold" : "regular"}
      foregroundStyle={emphasis ? "label" : "secondaryLabel"}
      lineLimit={1}
      padding={{ horizontal: 7, vertical: 3 }}
      background={{
        style: { light: "rgba(0,0,0,0.06)" as Color, dark: "rgba(255,255,255,0.10)" as Color },
        shape: "capsule",
      }}
    >
      {text}
    </Text>
  )
}

/** 一组行内标记，自动换行由调用方控制行数。 */
export function RowTagStrip({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <HStack spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      {items.map((item) => (
        <RowTag key={item} text={item} />
      ))}
    </HStack>
  )
}
