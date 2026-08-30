import { Button, HStack, Image, Spacer, Text, VStack, Widget, modifiers } from "scripting"
import { activeItems, daysUntil, formatCostSummary, loadSubscriptions, sortByNextBilling, Subscription } from "./model"
import { RefreshSubscriptionIntent } from "./app_intents"

function WidgetView() {
  const items = sortByNextBilling(activeItems(loadSubscriptions()))
  const next = items[0]
  const due = next ? daysUntil(next.nextBillingDate) : null
  return <Button intent={RefreshSubscriptionIntent(undefined)} buttonStyle="plain" modifiers={modifiers().widgetBackground({ light: "#F5F7FF", dark: "#1C1C1E" }).frame({ maxWidth: "infinity", maxHeight: "infinity" })}>
    <VStack alignment="leading" spacing={7} safeAreaPadding={12}>
      <HStack>
        <Image systemName="creditcard.fill" foregroundStyle="systemBlue" font={16} />
        <Text font="headline" fontWeight="semibold">订阅管理</Text>
        <Spacer />
        <Text font="caption" foregroundStyle="secondaryLabel">{items.length} 项</Text>
      </HStack>
      <Text font="title" fontWeight="bold">{formatCostSummary(items)}<Text font="caption" foregroundStyle="secondaryLabel"> / 月</Text></Text>
      {next ? <HStack>
        <Text font="caption" lineLimit={1}>{next.name || "未命名订阅"}</Text>
        <Spacer />
        <Text font="caption" foregroundStyle={due !== null && due <= 3 ? "systemOrange" : "secondaryLabel"}>{due === 0 ? "今天" : due === 1 ? "明天" : due !== null && due > 1 ? `${due} 天后` : "已到期"}</Text>
      </HStack> : <Text font="caption" foregroundStyle="secondaryLabel">暂无有效订阅</Text>}
    </VStack>
  </Button>
}

Widget.present(<WidgetView />)
