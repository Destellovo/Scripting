import { HStack, Image, ScrollView, Text, VStack, ZStack } from "scripting"
import { GIRIGIRI_GLASS_TOKENS } from "./tokens"
import { useBackgroundTheme } from "./background-theme"

/**
 * 轻量分区标题：裸露在环境背景上的标题行。
 * 标题本身不占用实色胶囊，只用一条消费当前主题 fill 的短标记做非颜色之外的层级线索，
 * 避免分区色块重量压过内容。可选 trailing 说明文字（数量、状态等）。
 */
export function ShelfHeader({
  title,
  caption,
  accessory,
}: {
  title: string
  caption?: string
  accessory?: JSX.Element
}) {
  const { backgroundFill } = useBackgroundTheme()

  return (
    <HStack
      alignment="center"
      spacing={10}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      padding={{ top: 4, bottom: 2 }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <ZStack
        frame={{ width: 4, height: 20 }}
        background={{ style: backgroundFill, shape: "capsule" }}
        clipShape="capsule"
      />
      <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="headline" fontWeight="semibold" foregroundStyle="label" lineLimit={2} multilineTextAlignment="leading">
          {title}
        </Text>
        {caption ? (
          <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1} multilineTextAlignment="leading">
            {caption}
          </Text>
        ) : null}
      </VStack>
      {accessory ?? null}
    </HStack>
  )
}

/**
 * 横向货架：同一轨道内所有卡片共用调用方算出的统一高度，
 * 保证最高卡不裁切、最短卡不出现大片底部空白。
 */
export function PosterShelf({
  height,
  children,
}: {
  height: number
  children?: any
}) {
  return (
    <ScrollView
      axes="horizontal"
      frame={{ maxWidth: "infinity" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      listRowInsets={{ leading: 0, trailing: 0, top: 0, bottom: 0 }}
    >
      <HStack
        alignment="top"
        spacing={GIRIGIRI_GLASS_TOKENS.spacing.regular}
        frame={{ height, alignment: "topLeading" }}
        padding={{
          leading: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
          trailing: GIRIGIRI_GLASS_TOKENS.spacing.comfortable,
        }}
      >
        {children}
      </HStack>
    </ScrollView>
  )
}

/** 货架末尾的“查看全部”入口内容，几何与海报卡对齐。 */
export function ShelfMoreTileContent({
  title,
  systemImage = "arrow.right",
  height,
  width,
}: {
  title: string
  systemImage?: string
  height: number
  width: number
}) {
  return (
    <VStack
      alignment="center"
      spacing={8}
      frame={{ width, height, alignment: "center" }}
    >
      <Image systemName={systemImage} font="title3" foregroundStyle="label" />
      <Text font="caption" fontWeight="semibold" foregroundStyle="label" lineLimit={1}>
        {title}
      </Text>
    </VStack>
  )
}
