import { HStack, Image, Text, VStack, ZStack } from "scripting"
import { HanimeVideoItem } from "../../class/hanime"
import { glassEffectFor, PosterCover } from "../../design-glass"

export function HanimeVideoRow({
  video,
  accessory,
}: {
  video: HanimeVideoItem
  accessory?: JSX.Element
}) {
  const title = normalizeVideoTitle(video.title) || "未命名视频"
  const meta = formatVideoMeta(video)
  const stats = formatVideoStats(video)

  return (
    <HStack alignment="center" spacing={12} padding={{ vertical: 6 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <PosterCover url={video.coverUrl} size="compact" />
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="subheadline" fontWeight="semibold" lineLimit={3} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
          {meta}
        </Text>
        {stats ? (
          <Text font="caption2" foregroundStyle="tertiaryLabel" lineLimit={1} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>{stats}</Text>
        ) : null}
        <AgeRatingBadge rating={video.ageRating} />
      </VStack>
      {accessory ? (
        <VStack alignment="trailing" spacing={4} frame={{ minWidth: 44, maxHeight: "infinity", alignment: "center" }}>
          {accessory}
        </VStack>
      ) : null}
    </HStack>
  )
}

export function AgeRatingBadge({ rating }: { rating?: string }) {
  const label = rating || "分级待定"
  return (
    <ZStack
      glassEffect={glassEffectFor("content", "capsule", false)}
      accessibilityLabel={`番剧分级 ${label}`}
    >
      <Text font="caption2" fontWeight="semibold" foregroundStyle="label" lineLimit={1} padding={{ horizontal: 6, vertical: 2 }}>
        {label}
      </Text>
    </ZStack>
  )
}

export function VideoCover({ url, size = 64, width, height }: { url?: string; size?: number; width?: number; height?: number }) {
  const coverWidth = width ?? size
  const coverHeight = height ?? Math.round(size * 0.66)

  const coverFrame = { width: coverWidth, height: coverHeight, alignment: "center" as const }
  const coverShape = { type: "rect" as const, cornerRadius: 10, style: "continuous" as const }

  return (
    <ZStack
      frame={coverFrame}
      alignment="center"
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      {url ? (
        <Image
          imageUrl={url}
          resizable={true}
          scaleToFill={true}
          frame={coverFrame}
          clipShape={coverShape}
        />
      ) : (
        <Image
          systemName="play.rectangle.fill"
          frame={coverFrame}
          foregroundStyle="secondaryLabel"
          background="secondarySystemBackground"
          clipShape={coverShape}
        />
      )}
    </ZStack>
  )
}

export function normalizeVideoTitle(value?: string): string {
  return cleanVideoText(value)
    .replace(/([\u3040-\u30ff\u3400-\u9fff])\s+([\u3040-\u30ff\u3400-\u9fff])/g, "$1$2")
    .replace(/\s+([、。，．！？!?：；])/g, "$1")
    .replace(/([（「『【［《([{])\s+/g, "$1")
    .replace(/\s+([）」』】］》)\]}])/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/ ([([{])/g, "\u00A0$1")
    .trim()
}

export function formatVideoMeta(video: HanimeVideoItem): string {
  const meta = [video.currentArtist, video.duration, video.uploadTime]
    .map(cleanVideoText)
    .filter(Boolean)
  return meta.length > 0 ? meta.join(" · ") : "GiriGiri"
}

function formatVideoStats(video: HanimeVideoItem): string {
  return [formatViews(video.views), formatReviews(video.reviews)].filter(Boolean).join(" · ")
}

function formatViews(value?: string): string {
  const text = cleanVideoText(value)
  return text.replace(/^(觀看次數|观看次数)[:：]?\s*/, "")
}

function formatReviews(value?: string): string {
  const text = cleanVideoText(value)
  const percent = text.match(/\d+(?:\.\d+)?%/)
  return percent ? `好评 ${percent[0]}` : text
}

function cleanVideoText(value?: string): string {
  if (!value) return ""
  const text = value
    .replace(/\b(?:play_arrow|thumb_up|visibility|favorite|favorite_border|schedule|access_time)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  return /^(播放|觀看|观看|更多|GiriGiri)$/i.test(text) ? "" : text
}
