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
  monthlyCost,
  sortByNextBilling,
} from "./model"
import { notificationSummary, rescheduleNotifications } from "./notifications"
import { CustomIcon, deleteCustomIcon, importCustomIcons, loadCustomIcons } from "./icons"
import {
  RemoteIcon,
  DEFAULT_ICON_LIBRARY_URL,
  fetchAllRemoteIcons,
  fetchIconLibrary,
  loadIconLibraryURLs,
  saveIconLibraryURLs,
} from "./remote-icons"

import {
  Button,
  Chart,
  ColorPicker,
  DatePicker,
  Dialog,
  DonutChart,
  HStack,
  Image,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  Picker,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  useEffect,
  useState,
} from "scripting"

function dueText(timestamp: number): string {
  const days = daysUntil(timestamp)
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`
  if (days === 0) return "今天到期"
  if (days === 1) return "明天到期"
  return `${days} 天后到期`
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

function IconView({ item, size = 28 }: { item: Subscription; size?: number }) {
  if (item.iconPath) {
    return <Image filePath={item.iconPath} resizable={true} scaleToFit={true} frame={{ width: size, height: size }} />
  }
  if (item.iconURL) {
    return <Image imageUrl={item.iconURL} resizable={true} scaleToFit={true} frame={{ width: size, height: size }} />
  }
  return <Image systemName={item.icon || "creditcard.fill"} foregroundStyle={item.color || "systemBlue"} font={size - 6} />
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
        <Text font="caption" foregroundStyle={dueSoon > 0 ? "systemOrange" : "secondaryLabel"}>{dueSoon > 0 ? `${dueSoon} 项即将扣款` : "未来 7 天无扣款"}</Text>
      </HStack>
      {next ? <Text font="caption" foregroundStyle="secondaryLabel">最近：{next.name || "未命名订阅"} · {formatDate(next.nextBillingDate)}</Text> : null}
    </VStack>
  </Section>
}

function SubscriptionRow({
  item,
  onSaved,
  onDeleted,
  onClose,
}: {
  item: Subscription
  onSaved: (item: Subscription) => void | Promise<void>
  onDeleted: (id: string) => void | Promise<void>
  onClose?: () => void
}) {
  const days = daysUntil(item.nextBillingDate)
  const dueColor = !item.active ? "secondaryLabel" : days <= 3 ? "systemOrange" : "secondaryLabel"
  return <NavigationLink destination={
    <SubscriptionEditor initial={item} onSaved={onSaved} onDeleted={onDeleted} onClose={onClose} />
  }>
    <HStack spacing={10}>
      <IconView item={item} size={30} />
      <VStack alignment="leading" spacing={2}>
        <Text fontWeight="semibold" lineLimit={1}>{item.name || "未命名订阅"}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">{cycleLabel(item.cycle)} · {item.category}</Text>
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
  onBack,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: Subscription
  isNew?: boolean
  onBack?: () => void
  onClose?: () => void
  onSaved: (item: Subscription) => void | Promise<void>
  onDeleted: (id: string) => void | Promise<void>
}) {
  const dismiss = Navigation.useDismiss()
  const back = onBack || dismiss
  const close = onClose || dismiss
  const [item, setItem] = useState<Subscription>(initial)
  const [error, setError] = useState("")
  const [hasTrial, setHasTrial] = useState(!!initial.trialEndDate)
  const [hasEndDate, setHasEndDate] = useState(!!initial.endDate)
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>(() => [])
  const [remoteIcons, setRemoteIcons] = useState<RemoteIcon[]>(() => [])
  const [remoteQuery, setRemoteQuery] = useState("")
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [iconLibraryURL, setIconLibraryURL] = useState(DEFAULT_ICON_LIBRARY_URL)
  const iconIsCustom = item.icon.startsWith("custom:") && !!item.iconPath
  const iconIsRemote = item.icon.startsWith("remote:") && !!item.iconURL

  useEffect(() => {
    loadLocalIcons()
    loadIconLibraryURLs().then(urls => {
      if (urls.length > 0) setIconLibraryURL(urls[0])
    }).catch(() => {})
  }, [])

  function update(patch: Partial<Subscription>) {
    setItem(previous => ({ ...previous, ...patch }))
  }

  async function loadLocalIcons() {
    try { setCustomIcons(await loadCustomIcons()) } catch { /* 使用空图标库 */ }
  }

  async function addIcons() {
    try {
      const icons = await importCustomIcons()
      setCustomIcons(icons)
      if (icons.length === 0) setError("没有选择可用的图片")
    } catch (error) {
      setError(`导入图标失败：${String(error)}`)
    }
  }

  async function loadRemoteIcons() {
    setRemoteLoading(true)
    setError("")
    try {
      const icons = await fetchAllRemoteIcons()
      setRemoteIcons(icons)
      if (icons.length === 0) setError("图标库为空或暂时无法访问")
    } catch (error) {
      setError(`读取图标库失败：${String(error)}`)
    } finally {
      setRemoteLoading(false)
    }
  }

  async function changeIconLibrary() {
    const url = await Dialog.prompt({
      title: "添加 Raw 图标库",
      message: "请输入返回 { icons: [{ name, url }] } 的 HTTPS JSON 地址",
      defaultValue: iconLibraryURL,
      placeholder: "https://raw.githubusercontent.com/.../icons.json",
      confirmLabel: "读取",
      cancelLabel: "取消",
    })
    if (!url || !/^https:\/\//.test(url.trim())) return
    const nextURL = url.trim()
    try {
      const icons = await fetchIconLibrary(nextURL)
      await saveIconLibraryURLs([nextURL])
      setIconLibraryURL(nextURL)
      setRemoteIcons(icons)
      setError(icons.length > 0 ? "" : "图标库中没有可用图标")
    } catch (error) {
      setError(`图标库格式或网络错误：${String(error)}`)
    }
  }

  async function restoreDefaultIconLibrary() {
    await saveIconLibraryURLs([DEFAULT_ICON_LIBRARY_URL])
    setIconLibraryURL(DEFAULT_ICON_LIBRARY_URL)
    await loadRemoteIcons()
  }

  function selectCustomIcon(icon: CustomIcon) {
    update({ icon: `custom:${icon.id}`, iconPath: icon.filePath, iconURL: "" })
  }

  function selectRemoteIcon(icon: RemoteIcon) {
    update({ icon: `remote:${icon.name}`, iconURL: icon.url, iconPath: "" })
  }

  function selectSystemIcon(value: string) {
    update({ icon: value, iconURL: "", iconPath: "" })
  }

  async function removeIcon(icon: CustomIcon) {
    const icons = await deleteCustomIcon(icon.id)
    setCustomIcons(icons)
    if (item.icon === `custom:${icon.id}`) update({ icon: "creditcard.fill", iconPath: "", iconURL: "" })
  }

  async function save() {
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
    try {
      await onSaved({ ...item, name })
      back()
    } catch (error) {
      setError(`保存失败：${String(error)}`)
    }
  }

  async function deleteItem() {
    const confirmed = await Dialog.confirm({
      title: "删除订阅",
      message: `确定删除“${item.name || "未命名订阅"}”吗？`,
      cancelLabel: "取消",
      confirmLabel: "删除",
    })
    if (!confirmed) return
    try {
      await onDeleted(item.id)
      back()
    } catch (error) {
      setError(`删除失败：${String(error)}`)
    }
  }

  async function markPaid() {
    const nextItem = item.cycle === "oneTime"
      ? { ...item, active: false }
      : { ...item, nextBillingDate: advanceBillingDate(item.nextBillingDate, item.cycle) }
    try {
      await onSaved(nextItem)
      back()
    } catch (error) {
      setError(`更新失败：${String(error)}`)
    }
  }

  const toolbarActions = onClose
    ? [<Button title="关闭" action={close} />, <Button title="保存" action={save} />]
    : <Button title="保存" action={save} />

  return <List
    navigationTitle={isNew ? "新增订阅" : "编辑订阅"}
    navigationBarTitleDisplayMode="inline"
    toolbar={{
      topBarLeading: <Button title="返回" action={back} />,
      topBarTrailing: toolbarActions,
    }}
  >
    <Section>
      <TextField title="名称" value={item.name} onChanged={value => update({ name: value })} prompt="例如：Apple Music" />
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
      {customIcons.length > 0 ? <VStack alignment="leading" spacing={5}>
        <Text font="caption" foregroundStyle="secondaryLabel">本地图标</Text>
        {customIcons.map(icon => <Button key={icon.id} action={() => selectCustomIcon(icon)}>
          <HStack>
            <Image filePath={icon.filePath} resizable={true} scaleToFit={true} frame={{ width: 28, height: 28 }} />
            <Text lineLimit={1}>{icon.name}</Text>
            <Spacer />
            {item.icon === `custom:${icon.id}` ? <Image systemName="checkmark" foregroundStyle="systemBlue" /> : null}
          </HStack>
        </Button>)}
      </VStack> : null}
      <Button title="从文件导入图标" systemImage="folder.badge.plus" action={addIcons} />
      {customIcons.length > 0 ? <Button title="管理已导入图标" systemImage="trash" action={async () => {
        const index = await Dialog.actionSheet({
          title: "删除图标",
          actions: customIcons.map(icon => ({ label: icon.name, destructive: true })),
        })
        if (index !== null && customIcons[index]) await removeIcon(customIcons[index])
      }} /> : null}
      <Button title="更换 Raw 图标库" systemImage="link" action={changeIconLibrary} />
      <Button title="恢复默认图标库" systemImage="arrow.counterclockwise" action={restoreDefaultIconLibrary} />
      <Button
        title={remoteLoading ? "正在读取远程图标库…" : "读取远程图标库"}
        systemImage="arrow.clockwise"
        action={loadRemoteIcons}
        disabled={remoteLoading}
      />
      {remoteIcons.length > 0 ? <VStack alignment="leading" spacing={5}>
        <Text font="caption" foregroundStyle="secondaryLabel">远程图标（{remoteIcons.length}，最多显示筛选结果前 60 项）</Text>
        <TextField title="筛选远程图标" value={remoteQuery} onChanged={setRemoteQuery} prompt="输入名称搜索" />
        {remoteIcons
          .filter(icon => !remoteQuery || icon.name.toLowerCase().includes(remoteQuery.toLowerCase()))
          .slice(0, 60)
          .map(icon => <Button key={`${icon.name}-${icon.url}`} action={() => selectRemoteIcon(icon)}>
            <HStack>
              <Image imageUrl={icon.url} resizable={true} scaleToFit={true} frame={{ width: 28, height: 28 }} />
              <Text lineLimit={1}>{icon.name}</Text>
              <Spacer />
              {item.iconURL === icon.url ? <Image systemName="checkmark" foregroundStyle="systemBlue" /> : <Image systemName="plus.circle" foregroundStyle="systemBlue" />}
            </HStack>
          </Button>)}
      </VStack> : null}
      {(iconIsCustom || iconIsRemote) ? <Button title="改用系统图标" systemImage="arrow.uturn.backward" action={() => selectSystemIcon(ICON_OPTIONS[0])} /> : null}
      <Picker title="系统图标" pickerStyle="menu" value={iconIsCustom || iconIsRemote ? ICON_OPTIONS[0] : item.icon} onChanged={value => selectSystemIcon(String(value))}>
        {ICON_OPTIONS.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <ColorPicker title="进度条颜色" value={item.progressColor || "systemBlue"} supportsOpacity={false} onChanged={value => update({ progressColor: String(value) })} />
      <Text font="caption" foregroundStyle="secondaryLabel">Widget 将使用此颜色显示剩余天数进度</Text>
      {error ? <Text font="caption" foregroundStyle="systemRed">{error}</Text> : null}
    </Section>
    <Section header={<Text>日期与续费</Text>}>
      <DatePicker title="开始日期" value={item.startDate} displayedComponents={["date"]} onChanged={value => update({ startDate: dateOnly(value) })} />
      <DatePicker title="下次到期" value={item.nextBillingDate} displayedComponents={["date"]} onChanged={value => update({ nextBillingDate: dateOnly(value) })} />
      <Toggle title="设置试用结束日期" value={hasTrial} onChanged={value => {
        setHasTrial(value)
        update({ trialEndDate: value ? (item.trialEndDate || item.nextBillingDate) : null })
      }} />
      {hasTrial ? <DatePicker title="试用结束" value={item.trialEndDate || item.nextBillingDate} displayedComponents={["date"]} onChanged={value => update({ trialEndDate: dateOnly(value) })} /> : null}
      <Toggle title="自动续费" value={item.autoRenew} onChanged={value => update({ autoRenew: value })} />
      {item.autoRenew && item.cycle !== "oneTime" ? <Picker title="提前提醒" pickerStyle="menu" value={item.reminderDays} onChanged={value => update({ reminderDays: Number(value) })}>
        {REMINDER_OPTIONS.map(value => <Text tag={value}>{value === 0 ? "不提醒" : `提前 ${value} 天`}</Text>)}
      </Picker> : null}
      <Toggle title="设置结束日期" value={hasEndDate} onChanged={value => {
        setHasEndDate(value)
        update({ endDate: value ? (item.endDate || item.nextBillingDate) : null })
      }} />
      {hasEndDate ? <DatePicker title="结束日期" value={item.endDate || item.nextBillingDate} displayedComponents={["date"]} onChanged={value => update({ endDate: dateOnly(value) })} /> : null}
      <Toggle title="有效订阅" value={item.active} onChanged={value => update({ active: value })} />
    </Section>
    <Section header={<Text>备注</Text>}>
      <TextField title="备注" value={item.notes} onChanged={value => update({ notes: value })} prompt="可选" axis="vertical" lineLimit={{ min: 2, max: 5 }} />
    </Section>
    {!isNew ? <Section>
      <Button title="记录本次扣款并顺延" systemImage="checkmark.circle" action={markPaid} />
      <Button title="删除此订阅" role="destructive" action={deleteItem} />
    </Section> : null}
  </List>
}

function PopularPicker({ onPicked, onClose }: { onPicked: (item: Subscription) => void | Promise<void>; onClose?: () => void }) {
  const dismiss = Navigation.useDismiss()
  const close = onClose || dismiss
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("全部")
  const [settings, setSettings] = useState<AppSettings>({ defaultCurrency: "CNY", defaultReminderDays: 3, notificationsEnabled: true })
  const filtered = POPULAR_SERVICES.filter(service =>
    (!query || service.name.toLowerCase().includes(query.toLowerCase())) &&
    (category === "全部" || service.category === category)
  )

  // 加载失败时仍可使用列表；页面本身不会因为设置读取失败而退出。
  loadSettings().then(setSettings).catch(() => {})
  async function pick(service: typeof POPULAR_SERVICES[number]) {
    await onPicked(createSubscription(settings, service))
    close()
  }
  return <List navigationTitle="添加常用服务" navigationBarTitleDisplayMode="inline" toolbar={{
    topBarLeading: <Button title="返回" action={close} />,
    topBarTrailing: <Button title="关闭" action={dismiss} />,
  }}>
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

function Home({ onOpenSettings, onOpenStats, onClose }: { onOpenSettings: () => void; onOpenStats: () => void; onClose: () => void }) {
  const [items, setItems] = useState<Subscription[]>(() => [])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showPopular, setShowPopular] = useState(false)

  useEffect(() => {
    loadSubscriptions().then(value => { setItems(value); setDataLoaded(true) }).catch(() => setDataLoaded(true))
  }, [])

  function saveSubscription(item: Subscription) {
    const next = items.some(existing => existing.id === item.id)
      ? items.map(existing => existing.id === item.id ? item : existing)
      : [...items, item]
    setItems(next)
    void saveSubscriptions(next)
    loadSettings().then(settings => rescheduleNotifications(next, settings)).catch(error => console.error("刷新提醒失败", error))
  }
  function removeSubscriptionItem(id: string) {
    const next = items.filter(item => item.id !== id)
    setItems(next)
    void saveSubscriptions(next)
    loadSettings().then(settings => rescheduleNotifications(next, settings)).catch(error => console.error("刷新提醒失败", error))
  }

  if (!dataLoaded) return <List navigationTitle="订阅管理"><Section><Text>正在读取订阅…</Text></Section></List>
  if (showAdd) return <SubscriptionEditor initial={createSubscription({ defaultCurrency: "CNY", defaultReminderDays: 3, notificationsEnabled: true })} isNew={true}
    onSaved={item => { saveSubscription(item); setShowAdd(false) }}
    onDeleted={() => setShowAdd(false)} onClose={() => setShowAdd(false)} />
  if (showPopular) return <PopularPicker onPicked={item => { saveSubscription(item); setShowPopular(false) }} onClose={() => setShowPopular(false)} />

  const active = sortByNextBilling(activeItems(items))
  return <List navigationTitle="订阅管理" navigationBarTitleDisplayMode="large" toolbar={{
    topBarLeading: <Button title="关闭" action={onClose} />,
    topBarTrailing: <Button title="设置" action={onOpenSettings} />,
  }}>
    <Summary items={items} />
    <Section header={<Text>我的订阅</Text>}>
      {active.length === 0 ? <Text foregroundStyle="secondaryLabel">还没有订阅，点击下方添加</Text> : active.map(item => <SubscriptionRow key={item.id} item={item} onSaved={saveSubscription} onDeleted={removeSubscriptionItem} />)}
    </Section>
    <Section>
      <Button title="从常用服务添加" systemImage="square.grid.2x2" action={() => setShowPopular(true)} />
      <Button title="自定义订阅" systemImage="plus" action={() => setShowAdd(true)} />
      <Button title="查看统计" systemImage="chart.pie.fill" action={onOpenStats} />
    </Section>
  </List>
}

function StatisticsPage({ items, onBack, onClose }: { items: Subscription[]; onBack: () => void; onClose: () => void }) {
  const active = activeItems(items)
  const byCategory: Record<string, number> = {}
  for (const item of active) byCategory[item.category] = (byCategory[item.category] || 0) + monthlyCost([item])
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const marks = rows.map(([category, amount]) => ({ category, value: amount }))
  return <List navigationTitle="统计" navigationBarTitleDisplayMode="inline" toolbar={{
    topBarLeading: <Button title="返回" action={onBack} />,
    topBarTrailing: <Button title="关闭" action={onClose} />,
  }}>
    <Section>
      <VStack alignment="leading" spacing={8}>
        <Text font="caption" foregroundStyle="secondaryLabel">每月估算</Text>
        <Text font="title" fontWeight="bold">{formatCostSummary(active)}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">每年估算（按周期折算）</Text>
        <Text font="headline">{formatCostSummary(active, true)}</Text>
      </VStack>
    </Section>
    {marks.length > 0 ? <Section header={<Text>费用占比</Text>}>
      <Chart frame={{ height: 220 }}><DonutChart marks={marks} /></Chart>
    </Section> : null}
    <Section header={<Text>按分类</Text>}>
      {rows.length === 0 ? <Text foregroundStyle="secondaryLabel">暂无数据</Text> : rows.map(([category, amount]) => <HStack key={category}><Text>{category}</Text><Spacer /><Text>{formatMoney(amount, active.find(x => x.category === category)?.currency ?? "CNY")}</Text></HStack>)}
    </Section>
  </List>
}

function SettingsPage({ items, onBack, onClose }: { items: Subscription[]; onBack: () => void; onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings>({ defaultCurrency: "CNY", defaultReminderDays: 3, notificationsEnabled: true })
  const [notice, setNotice] = useState("")
  useEffect(() => { loadSettings().then(setSettings).catch(() => {}) }, [])
  function update(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    void saveSettings(next)
  }
  async function refreshReminders() {
    const count = await rescheduleNotifications(items, settings)
    setNotice(count > 0 ? `已安排 ${count} 条续费提醒` : notificationSummary(items, settings))
  }
  return <List navigationTitle="设置" navigationBarTitleDisplayMode="inline" toolbar={{
    topBarLeading: <Button title="返回" action={onBack} />,
    topBarTrailing: <Button title="关闭" action={onClose} />,
  }}>
    <Section header={<Text>默认值</Text>}>
      <Picker title="默认币种" pickerStyle="menu" value={settings.defaultCurrency} onChanged={value => update({ defaultCurrency: String(value) })}>{CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}</Picker>
      <Picker title="默认提醒" pickerStyle="menu" value={settings.defaultReminderDays} onChanged={value => update({ defaultReminderDays: Number(value) })}>{REMINDER_OPTIONS.map(value => <Text tag={value}>{value === 0 ? "不提醒" : `提前 ${value} 天`}</Text>)}</Picker>
    </Section>
    <Section>
      <Toggle title="启用续费通知" value={settings.notificationsEnabled} onChanged={value => update({ notificationsEnabled: value })} />
      <Button title="重新安排所有提醒" systemImage="bell.badge" action={refreshReminders} />
      {notice ? <Text font="caption" foregroundStyle="secondaryLabel">{notice}</Text> : null}
    </Section>
    <Section footer={<Text>数据保存在 Scripting 本地存储中。</Text>}><Text>已保存 {items.length} 项订阅</Text></Section>
  </List>
}

function App() {
  const dismiss = Navigation.useDismiss()
  const [page, setPage] = useState<"home" | "settings" | "stats">("home")
  const [items, setItems] = useState<Subscription[]>(() => [])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    loadSubscriptions().then(value => { setItems(value); setLoaded(true) }).catch(() => setLoaded(true))
  }, [])
  if (!loaded) return <List navigationTitle="订阅管理"><Section><Text>正在读取订阅…</Text></Section></List>
  if (page === "settings") return <SettingsPage items={items} onBack={() => setPage("home")} onClose={dismiss} />
  if (page === "stats") return <StatisticsPage items={items} onBack={() => setPage("home")} onClose={dismiss} />
  return <Home key={String(items.length)} onOpenSettings={() => setPage("settings")} onOpenStats={() => setPage("stats")} onClose={dismiss} />
}

async function run() {
  await Navigation.present({ element: <App /> })
  Script.exit()
}

run()
