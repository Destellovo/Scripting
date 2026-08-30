import { AppSettings, Subscription, activeItems, daysUntil, formatMoney } from "./model"

// 通知相关全局 API 由 Scripting 运行时提供。

export async function rescheduleNotifications(items: Subscription[], settings: AppSettings): Promise<number> {
  try {
    await Notification.removeAllPendingsOfCurrentScript()
  } catch {
    // 没有通知权限或当前系统不支持时，继续完成数据保存
  }

  if (!settings.notificationsEnabled) return 0

  let scheduled = 0
  const now = Date.now()
  for (const item of activeItems(items)) {
    if (!item.autoRenew || item.reminderDays <= 0 || item.cycle === "oneTime") continue

    const date = new Date(item.nextBillingDate)
    date.setDate(date.getDate() - item.reminderDays)
    date.setHours(9, 0, 0, 0)
    if (date.getTime() <= now + 30 * 1000) continue

    try {
      await Notification.schedule({
        title: `${item.name || "订阅"} 即将续费`,
        subtitle: `${item.reminderDays} 天后提醒`,
        body: `预计扣款 ${formatMoney(item.price, item.currency)}，周期：${cycleLabelFor(item.cycle)}`,
        interruptionLevel: "active",
        threadIdentifier: "subscription-manager-renewals",
        userInfo: { subscriptionId: item.id },
        trigger: new CalendarNotificationTrigger({
          dateMatching: new DateComponents({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
          }),
          repeats: false,
        }),
      })
      scheduled += 1
    } catch {
      // 单条通知失败不影响其它订阅
    }
  }
  return scheduled
}

function cycleLabelFor(cycle: Subscription["cycle"]): string {
  switch (cycle) {
    case "weekly": return "每周"
    case "monthly": return "每月"
    case "quarterly": return "每季"
    case "yearly": return "每年"
    case "oneTime": return "一次性"
  }
}

export function notificationSummary(items: Subscription[], settings: AppSettings): string {
  if (!settings.notificationsEnabled) return "续费通知已关闭"
  const count = activeItems(items).filter(item => item.autoRenew && item.reminderDays > 0 && daysUntil(item.nextBillingDate) > item.reminderDays).length
  return count > 0 ? `已为 ${count} 项订阅启用提醒` : "暂无可安排的续费提醒"
}
