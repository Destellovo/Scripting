import {
  AppSettings,
  CATEGORIES,
  COLOR_OPTIONS,
  CURRENCIES,
  ICON_OPTIONS,
  POPULAR_SERVICES,
  REMINDER_OPTIONS,
  Subscription,
  activeItems,
  advanceBillingDate,
  createSubscription,
  cycleLabel,
  dateOnly,
  daysUntil,
  formatCostSummary,
  formatDate,
  formatMoney,
  loadSettings,
  loadSubscriptions,
  monthlyCost,
  saveSettings,
  saveSubscriptions,
  sortByNextBilling,
} from "./model"
import { notificationSummary, rescheduleNotifications } from "./notifications"

import {
  Button,
  Chart,
  DatePicker,
  Dialog,
  DonutChart,
  HStack,
  Image,
  List,
  Navigation,
  NavigationLink,
  Picker,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  useState,
} from "scripting"

function dueText(timestamp: number): string {
  const days = daysUntil(timestamp)
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`
  if (days === 0) return "今天扣款"
  if (days === 1) return "明天扣款"
  return `${days} 天后扣款`
}

function itemStatus(item: Subscription): string {
  if (item.trialEndDate && daysUntil(item.trialEndDate) >= 0) {
    return `试用中 · ${dueText(item.trialEndDate)}`
  }
  if (!item.autoRenew || item.cycle === "oneTime") {
    return `到期：${formatDate(item.nextBillingDate)}`
  }
  return dueText(item.nextBillingDate)
}

function Summary({ items }: { items: Subscription[] }) {
  const active = activeItems(items)
  const next = sortByNextBilling(active)[0]
  const dueSoon = active.filter(item => {
    const days = daysUntil(item.nextBillingDate)
    return days >= 0 && days <= 7
  }).length

  return <Section>
    <VStack alignment="leading" spacing={8}>
      <Text font="caption" foregroundStyle="secondaryLabel">本月预计支出</Text>
      <Text font="title" fontWeight="bold">{formatCostSummary(items)}</Text>
      <HStack>
        <Text font="caption" foregroundStyle="secondaryLabel">{active.length} 项有效订阅</Text>
        <Spacer />
        <Text font="caption" foregroundStyle={dueSoon > 0 ? "systemOrange" : "secondaryLabel"}>
          {dueSoon > 0 ? `${dueSoon} 项即将扣款` : "未来 7 天无扣款"}
        </Text>
      </HStack>
      {next ? <Text font="caption" foregroundStyle="secondaryLabel">
        最近：{next.name || "未命名订阅"} · {formatDate(next.nextBillingDate)}
      </Text> : null}
    </VStack>
  </Section>
}

function SubscriptionRow({
  item,
  onSaved,
  onDeleted,
}: {
  item: Subscription
  onSaved: (item: Subscription) => void
  onDeleted: (id: string) => void
}) {
  const days = daysUntil(item.nextBillingDate)
  const dueColor = !item.active ? "secondaryLabel" : days <= 3 ? "systemOrange" : "secondaryLabel"
  return <NavigationLink destination={
    <SubscriptionEditor initial={item} onSaved={onSaved} onDeleted={onDeleted} />
  }>
    <HStack spacing={10}>
      <Image
        systemName={item.icon || "creditcard.fill"}
        foregroundStyle={item.color || "systemBlue"}
        font={22}
      />
      <VStack alignment="leading" spacing={2}>
        <Text fontWeight="semibold" lineLimit={1}>{item.name || "未命名订阅"}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {cycleLabel(item.cycle)} · {item.category}
        </Text>
        <Text font="caption" foregroundStyle={dueColor}>{itemStatus(item)}</Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={2}>
        <Text fontWeight="semibold">{formatMoney(item.price, item.currency)}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {item.autoRenew && item.cycle !== "oneTime" ? "自动续费" : "不自动续费"}
        </Text>
      </VStack>
    </HStack>
  </NavigationLink>
}

function SubscriptionEditor({
  initial,
  isNew = false,
  onSaved,
  onDeleted,
}: {
  initial: Subscription
  isNew?: boolean
  onSaved: (item: Subscription) => void
  onDeleted: (id: string) => void
}) {
  const dismiss = Navigation.useDismiss()
  const [item, setItem] = useState<Subscription>(initial)
  const [error, setError] = useState("")
  const [hasTrial, setHasTrial] = useState(!!initial.trialEndDate)
  const [hasEndDate, setHasEndDate] = useState(!!initial.endDate)

  function update(patch: Partial<Subscription>) {
    setItem(previous => ({ ...previous, ...patch }))
  }

  function save() {
    const name = item.name.trim()
    if (!name) {
      setError("请输入订阅名称")
      return
    }
    if (!Number.isFinite(item.price) || item.price < 0) {
      setError("请输入有效价格")
      return
    }
    if (item.endDate && item.endDate < item.startDate) {
      setError("结束日期不能早于开始日期")
      return
    }
    onSaved({ ...item, name })
    dismiss()
  }

  async function deleteItem() {
    const confirmed = await Dialog.confirm({
      title: "删除订阅",
      message: `确定删除“${item.name || "未命名订阅"}”吗？`,
      cancelLabel: "取消",
      confirmLabel: "删除",
    })
    if (!confirmed) return
    onDeleted(item.id)
    dismiss()
  }

  function markPaid() {
    const nextItem = item.cycle === "oneTime"
      ? { ...item, active: false }
      : { ...item, nextBillingDate: advanceBillingDate(item.nextBillingDate, item.cycle) }
    onSaved(nextItem)
    dismiss()
  }

  return <List
    navigationTitle={isNew ? "新增订阅" : "编辑订阅"}
    navigationBarTitleDisplayMode="inline"
    toolbar={{
      cancellationAction: <Button title="取消" action={dismiss} />,
      confirmationAction: <Button title="保存" action={save} />,
    }}
  >
    <Section>
      <TextField
        title="名称"
        value={item.name}
        onChanged={value => update({ name: value })}
        prompt="例如：Apple Music"
      />
      <TextField
        title={`价格（${item.currency}）`}
        value={String(item.price)}
        onChanged={value => update({ price: Number(value.replace(/[^0-9.]/g, "")) || 0 })}
        prompt="例如：9.99"
      />
      <Picker title="币种" pickerStyle="menu" value={item.currency} onChanged={value => update({ currency: String(value) })}>
        {CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <Picker title="周期" pickerStyle="menu" value={item.cycle} onChanged={value => update({ cycle: value as Subscription["cycle"] })}>
        <Text tag="weekly">每周</Text>
        <Text tag="monthly">每月</Text>
        <Text tag="quarterly">每季</Text>
        <Text tag="yearly">每年</Text>
        <Text tag="oneTime">一次性</Text>
      </Picker>
      <Picker title="分类" pickerStyle="menu" value={item.category} onChanged={value => update({ category: String(value) })}>
        {CATEGORIES.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
    </Section>
    <Section header={<Text>外观</Text>}>
      <Picker title="图标" pickerStyle="menu" value={item.icon} onChanged={value => update({ icon: String(value) })}>
        {ICON_OPTIONS.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <Picker title="颜色" pickerStyle="menu" value={item.color} onChanged={value => update({ color: String(value) })}>
        {COLOR_OPTIONS.map(value => <Text tag={value}>{value.replace("system", "")}</Text>)}
      </Picker>
    </Section>
    <Section header={<Text>日期与续费</Text>}>
      <DatePicker
        title="开始日期"
        value={item.startDate}
        displayedComponents={["date"]}
        onChanged={value => update({ startDate: dateOnly(value) })}
      />
      <DatePicker
        title="下次扣款"
        value={item.nextBillingDate}
        displayedComponents={["date"]}
        onChanged={value => update({ nextBillingDate: dateOnly(value) })}
      />
      <Toggle
        title="设置试用结束日期"
        value={hasTrial}
        onChanged={value => {
          setHasTrial(value)
          update({ trialEndDate: value ? (item.trialEndDate || item.nextBillingDate) : null })
        }}
      />
      {hasTrial ? <DatePicker
        title="试用结束"
        value={item.trialEndDate || item.nextBillingDate}
        displayedComponents={["date"]}
        onChanged={value => update({ trialEndDate: dateOnly(value) })}
      /> : null}
      <Toggle title="自动续费" value={item.autoRenew} onChanged={value => update({ autoRenew: value })} />
      {item.autoRenew && item.cycle !== "oneTime" ? <Picker title="提前提醒" pickerStyle="menu" value={item.reminderDays} onChanged={value => update({ reminderDays: Number(value) })}>
        {REMINDER_OPTIONS.map(value => <Text tag={value}>{value === 0 ? "不提醒" : `提前 ${value} 天`}</Text>)}
      </Picker> : null}
      <Toggle
        title="设置结束日期"
        value={hasEndDate}
        onChanged={value => {
          setHasEndDate(value)
          update({ endDate: value ? (item.endDate || item.nextBillingDate) : null })
        }}
      />
      {hasEndDate ? <DatePicker
        title="结束日期"
        value={item.endDate || item.nextBillingDate}
        displayedComponents={["date"]}
        onChanged={value => update({ endDate: dateOnly(value) })}
      /> : null}
      <Toggle title="有效订阅" value={item.active} onChanged={value => update({ active: value })} />
    </Section>
    <Section header={<Text>备注</Text>}>
      <TextField
        title="备注"
        value={item.notes}
        onChanged={value => update({ notes: value })}
        prompt="可选"
        axis="vertical"
        lineLimit={{ min: 2, max: 5 }}
      />
      {error ? <Text foregroundStyle="systemRed">{error}</Text> : null}
    </Section>
    {!isNew ? <Section>
      <Button title="记录本次扣款并顺延" systemImage="checkmark.circle" action={markPaid} />
      <Button title="删除此订阅" role="destructive" action={deleteItem} />
    </Section> : null}
  </List>
}

function PopularPicker({ onPicked }: { onPicked: (item: Subscription) => void }) {
  const dismiss = Navigation.useDismiss()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("全部")
  const settings = loadSettings()
  const filtered = POPULAR_SERVICES.filter(service =>
    (!query || service.name.toLowerCase().includes(query.toLowerCase())) &&
    (category === "全部" || service.category === category)
  )
  function pick(service: typeof POPULAR_SERVICES[number]) {
    onPicked(createSubscription(settings, service))
    dismiss()
  }
  return <List navigationTitle="添加常用服务" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="取消" action={dismiss} /> }}>
    <Section>
      <TextField title="搜索" value={query} onChanged={setQuery} prompt="搜索服务名称" />
      <Picker title="分类" pickerStyle="menu" value={category} onChanged={value => setCategory(String(value))}>
        {["全部", ...CATEGORIES].map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
    </Section>
    <Section>
      {filtered.map(service => <Button key={service.name} action={() => pick(service)}>
        <HStack>
          <Image systemName={service.icon} foregroundStyle={service.color} font={22} />
          <VStack alignment="leading" spacing={2}>
            <Text fontWeight="semibold">{service.name}</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">{service.category}</Text>
          </VStack>
          <Spacer />
          <Image systemName="plus.circle" foregroundStyle="systemBlue" />
        </HStack>
      </Button>)}
    </Section>
  </List>
}

function Home({ onOpenSettings, onOpenStats }: { onOpenSettings: () => void; onOpenStats: () => void }) {
  const [items, setItems] = useState<Subscription[]>(() => loadSubscriptions())
  const [showAdd, setShowAdd] = useState(false)
  const [showPopular, setShowPopular] = useState(false)

  function save(item: Subscription) {
    const next = items.some(x => x.id === item.id)
      ? items.map(x => x.id === item.id ? item : x)
      : [...items, item]
    setItems(next)
    saveSubscriptions(next)
    rescheduleNotifications(next, loadSettings())
  }
  function remove(id: string) {
    const next = items.filter(item => item.id !== id)
    setItems(next)
    saveSubscriptions(next)
    rescheduleNotifications(next, loadSettings())
  }

  if (showAdd) return <SubscriptionEditor
    initial={createSubscription(loadSettings())}
    isNew={true}
    onSaved={item => { save(item); setShowAdd(false) }}
    onDeleted={() => setShowAdd(false)}
  />
  if (showPopular) return <PopularPicker onPicked={item => { save(item); setShowPopular(false) }} />

  const active = sortByNextBilling(activeItems(items))
  return <List navigationTitle="订阅管理" navigationBarTitleDisplayMode="large" toolbar={{
    primaryAction: <Button title="设置" action={onOpenSettings} />,
  }}>
    <Summary items={items} />
    <Section header={<Text>我的订阅</Text>}>
      {active.length === 0
        ? <Text foregroundStyle="secondaryLabel">还没有订阅，点击下方添加</Text>
        : active.map(item => <SubscriptionRow key={item.id} item={item} onSaved={save} onDeleted={remove} />)}
    </Section>
    <Section>
      <Button title="从常用服务添加" systemImage="square.grid.2x2" action={() => setShowPopular(true)} />
      <Button title="自定义订阅" systemImage="plus" action={() => setShowAdd(true)} />
      <Button title="查看统计" systemImage="chart.pie.fill" action={onOpenStats} />
    </Section>
  </List>
}

function StatisticsPage() {
  const dismiss = Navigation.useDismiss()
  const items = activeItems(loadSubscriptions())
  const byCategory: Record<string, number> = {}
  for (const item of items) byCategory[item.category] = (byCategory[item.category] || 0) + monthlyCost([item])
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const marks = rows.map(([category, amount]) => ({ category, value: amount }))
  return <List navigationTitle="统计" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="完成" action={dismiss} /> }}>
    <Section>
      <VStack alignment="leading" spacing={8}>
        <Text font="caption" foregroundStyle="secondaryLabel">每月估算</Text>
        <Text font="title" fontWeight="bold">{formatCostSummary(items)}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">每年估算（按周期折算）</Text>
        <Text font="headline">{formatCostSummary(items, true)}</Text>
      </VStack>
    </Section>
    {marks.length > 0 ? <Section header={<Text>费用占比</Text>}>
      <Chart frame={{ height: 220 }}><DonutChart marks={marks} /></Chart>
    </Section> : null}
    <Section header={<Text>按分类</Text>}>
      {rows.length === 0
        ? <Text foregroundStyle="secondaryLabel">暂无数据</Text>
        : rows.map(([category, amount]) => <HStack key={category}><Text>{category}</Text><Spacer /><Text>{formatMoney(amount, items.find(x => x.category === category)?.currency ?? "CNY")}</Text></HStack>)}
    </Section>
  </List>
}

function SettingsPage({ onChanged }: { onChanged: () => void }) {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [notice, setNotice] = useState("")
  function update(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
    onChanged()
  }
  async function refreshReminders() {
    const count = await rescheduleNotifications(loadSubscriptions(), settings)
    setNotice(count > 0 ? `已安排 ${count} 条续费提醒` : notificationSummary(loadSubscriptions(), settings))
  }
  return <List navigationTitle="设置" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="完成" action={dismiss} /> }}>
    <Section header={<Text>默认值</Text>}>
      <Picker title="默认币种" pickerStyle="menu" value={settings.defaultCurrency} onChanged={value => update({ defaultCurrency: String(value) })}>
        {CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <Picker title="默认提醒" pickerStyle="menu" value={settings.defaultReminderDays} onChanged={value => update({ defaultReminderDays: Number(value) })}>
        {REMINDER_OPTIONS.map(value => <Text tag={value}>{value === 0 ? "不提醒" : `提前 ${value} 天`}</Text>)}
      </Picker>
    </Section>
    <Section>
      <Toggle title="启用续费通知" value={settings.notificationsEnabled} onChanged={value => update({ notificationsEnabled: value })} />
      <Button title="重新安排所有提醒" systemImage="bell.badge" action={refreshReminders} />
      {notice ? <Text font="caption" foregroundStyle="secondaryLabel">{notice}</Text> : null}
    </Section>
    <Section footer={<Text>当前版本使用 Scripting 本地存储；尚未接入 iCloud 多设备同步。</Text>}>
      <Text>已保存 {loadSubscriptions().length} 项订阅</Text>
    </Section>
  </List>
}

function App() {
  const [page, setPage] = useState<"home" | "settings" | "stats">("home")
  const [version, setVersion] = useState(0)
  if (page === "settings") return <SettingsPage onChanged={() => setVersion(version + 1)} />
  if (page === "stats") return <StatisticsPage />
  return <Home key={version} onOpenSettings={() => setPage("settings")} onOpenStats={() => setPage("stats")} />
}

async function run() {
  await Navigation.present({ element: <App /> })
  Script.exit()
}

run()
