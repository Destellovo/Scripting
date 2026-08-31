import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { advanceBillingDate, loadSubscriptions, saveSubscriptions } from "./model"

export const RefreshSubscriptionIntent = AppIntentManager.register({
  name: "RefreshSubscriptionIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    Widget.reloadAll()
  },
})

export const MarkSubscriptionPaidIntent = AppIntentManager.register({
  name: "MarkSubscriptionPaidIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ id }: { id: string }) => {
    const items = await loadSubscriptions()
    const next = items.map(item => item.id === id
      ? { ...item, nextBillingDate: advanceBillingDate(item.nextBillingDate, item.cycle) }
      : item)
    await saveSubscriptions(next)
    Widget.reloadAll()
  },
})
