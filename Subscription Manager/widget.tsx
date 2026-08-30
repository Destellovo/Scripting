import { activeItems, effectiveDueDate, formatDate, loadSubscriptions, remainingDays, remainingProgress, sortByNextBilling, Subscription } from "./model"
import { RefreshSubscriptionIntent } from "./app_intents"
import { Button, Capsule, HStack, Image, Spacer, Text, VStack, Widget, modifiers } from "scripting"

function IconView({ item, size = 22 }: { item: Subscription; size?: number }) {
  if (item.iconPath) return <Image filePath={item.iconPath} resizable={true} scaleToFit={true} frame={{ width: size, height: size }} />
  if (item.iconURL) return <Image imageUrl={item.iconURL} resizable={true} scaleToFit={true} frame={{ width: size, height: size }} />
  return <Image systemName={item.icon || "creditcard.fill"} foregroundStyle={item.color || "systemBlue"} font={size - 4} />
}

function ProgressBar({ item, width = 120 }: { item: Subscription; width?: number }) {
  const progress = remainingProgress(item)
  const fillWidth = Math.max(3, Math.round(width * progress))
  return <HStack spacing={6}>
    <ZStackBar width={width} fillWidth={fillWidth} color={item.progressColor || "systemBlue"} />
    <Text font="caption" foregroundStyle={item.progressColor || "systemBlue"}>{remainingDays(item)}天</Text>
  </HStack>
}

function ZStackBar({ width, fillWidth, color }: { width: number; fillWidth: number; color: string }) {
  return <HStack spacing={0} frame={{ width, height: 7 }}>
    <Capsule fill={color} frame={{ width: fillWidth, height: 7 }} />
    {fillWidth < width ? <Capsule fill="secondarySystemFill" frame={{ width: width - fillWidth, height: 7 }} /> : null}
  </HStack>
}

function WidgetView() {
  const items = sortByNextBilling(activeItems(loadSubscriptions()))
  const visible = items.slice(0, 3)
  const next = visible[0]
  return <Button intent={RefreshSubscriptionIntent(undefined)} buttonStyle="plain" modifiers={modifiers().widgetBackground({ light: "#F5F7FF", dark: "#1C1C1E" }).frame({ maxWidth: "infinity", maxHeight: "infinity" })}>
    <VStack alignment="leading" spacing={7} safeAreaPadding={12}>
      <HStack>
        <Image systemName="calendar.badge.clock" foregroundStyle="systemBlue" font={16} />
        <Text font="headline" fontWeight="semibold">订阅到期</Text>
        <Spacer />
        <Text font="caption" foregroundStyle="secondaryLabel">{items.length} 项</Text>
      </HStack>
      {visible.length === 0 ? <Text font="caption" foregroundStyle="secondaryLabel">暂无有效订阅</Text> : visible.map(item => <HStack key={item.id} spacing={7}>
        <IconView item={item} />
        <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
          <Text font="caption" fontWeight="semibold" lineLimit={1}>{item.name || "未命名订阅"}</Text>
          <ProgressBar item={item} width={Widget.family === "systemSmall" ? 88 : 125} />
        </VStack>
      </HStack>)}
      {next ? <Text font="caption" foregroundStyle="secondaryLabel">最近到期：{formatDate(effectiveDueDate(next))}</Text> : null}
    </VStack>
  </Button>
}

Widget.present(<WidgetView />)
