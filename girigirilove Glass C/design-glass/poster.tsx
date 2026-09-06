import { Image, Text, VStack, ZStack, type Color } from "scripting"
import { GIRIGIRI_GLASS_TOKENS } from "./tokens"

/**
 * 海报几何：番剧封面按 2:3 竖版呈现，避免小横图导致的识别度损失。
 * 同一横向货架内所有卡片共用同一固定高度，上下 padding 只计算一次。
 */
export const POSTER_METRICS = {
  regular: { width: 118, coverHeight: 172 },
  compact: { width: 96, coverHeight: 140 },
} as const

export type PosterSize = keyof typeof POSTER_METRICS

const POSTER_TITLE_HEIGHT = 36
const POSTER_CAPTION_HEIGHT = 15
const POSTER_TEXT_SPACING = 6

export function posterCardHeight(size: PosterSize = "regular", showsCaption = true) {
  return POSTER_METRICS[size].coverHeight
    + POSTER_TEXT_SPACING
    + POSTER_TITLE_HEIGHT
    + (showsCaption ? POSTER_CAPTION_HEIGHT + 2 : 0)
}

const posterShape = {
  type: "rect" as const,
  cornerRadius: GIRIGIRI_GLASS_TOKENS.radius.media,
  style: "continuous" as const,
}

/** 竖版海报相框：图片自身圆角内缩，不叠整幅 Glass 或白层遮盖封面。 */
export function PosterCover({
  url,
  size = "regular",
  bottomAccessory,
}: {
  url?: string
  size?: PosterSize
  bottomAccessory?: JSX.Element
}) {
  const metrics = POSTER_METRICS[size]
  const frame = { width: metrics.width, height: metrics.coverHeight }

  return (
    <ZStack
      frame={frame}
      clipShape={posterShape}
      shadow={{ color: "rgba(0,0,0,0.22)" as Color, radius: 8, y: 4 }}
      overlay={bottomAccessory ? { alignment: "bottomTrailing", content: bottomAccessory } : undefined}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      {url ? (
        <Image
          imageUrl={url}
          resizable={true}
          scaleToFill={true}
          frame={{ width: metrics.width, height: metrics.coverHeight }}
          clipShape={posterShape}
        />
      ) : (
        <ZStack
          frame={{ width: metrics.width, height: metrics.coverHeight }}
          background="secondarySystemBackground"
          clipShape={posterShape}
        >
          <Image systemName="film.stack" font="title" foregroundStyle="tertiaryLabel" />
        </ZStack>
      )}
    </ZStack>
  )
}

/** 分级角标：不使用会触发原生修饰器的 badge 属性名。 */
export function PosterAgeRating({ text }: { text: string }) {
  return (
    <VStack padding={{ trailing: 7, bottom: 7 }}>
      <Text
        font="caption2"
        fontWeight="semibold"
        foregroundStyle="white"
        lineLimit={1}
        padding={{ horizontal: 8, vertical: 4 }}
        background={{ style: "rgba(0,0,0,0.68)" as Color, shape: "capsule" }}
        shadow={{ color: "rgba(0,0,0,0.28)" as Color, radius: 3, y: 1 }}
      >
        {text}
      </Text>
    </VStack>
  )
}

/**
 * 海报卡内容：海报 + 标题 + 可选副标题。
 * 标题与副标题是阅读层级的普通文字行，共享 leading 轴，不做 badge 化。
 */
export function PosterCardContent({
  title,
  caption,
  ageRating,
  coverUrl,
  size = "regular",
}: {
  title: string
  caption?: string
  /** 禁止改回 badge；该名称会触发 Scripting 原生 badge 修饰器。 */
  ageRating?: string
  coverUrl?: string
  size?: PosterSize
}) {
  const metrics = POSTER_METRICS[size]

  return (
    <VStack
      alignment="leading"
      spacing={POSTER_TEXT_SPACING}
      frame={{ width: metrics.width, alignment: "topLeading" }}
    >
      <PosterCover
        url={coverUrl}
        size={size}
        bottomAccessory={ageRating ? <PosterAgeRating text={ageRating} /> : undefined}
      />
      <VStack alignment="leading" spacing={2} frame={{ width: metrics.width, alignment: "topLeading" }}>
        <Text
          font="caption"
          fontWeight="semibold"
          foregroundStyle="label"
          lineLimit={2}
          multilineTextAlignment="leading"
          frame={{ width: metrics.width, height: POSTER_TITLE_HEIGHT, alignment: "topLeading" }}
        >
          {title}
        </Text>
        {caption ? (
          <Text
            font="caption2"
            foregroundStyle="secondaryLabel"
            lineLimit={1}
            multilineTextAlignment="leading"
            frame={{ width: metrics.width, height: POSTER_CAPTION_HEIGHT, alignment: "leading" }}
          >
            {caption}
          </Text>
        ) : null}
      </VStack>
    </VStack>
  )
}
