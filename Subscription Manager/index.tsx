import {
  AppSettings,
  CATEGORIES,
  CURRENCIES,
  POPULAR_SERVICES,
  REMINDER_OPTIONS,
  Subscription,
  activeItems,
  advanceBillingDate,
  createSubscription,
  cycleLabel,
  dateOnly,
  daysUntil,
  effectiveDueDate,
  formatCostSummary,
  formatDate,
  formatMoney,
  monthlyCost,
  remainingDays,
  sortByNextBilling,
} from "./model"
import { notificationSummary, rescheduleNotifications } from "./notifications"
import { CustomIcon, deleteCustomIcon, importCustomIcons, loadCustomIcons } from "./icons"
import {
  DEFAULT_ICON_LIBRARY_URL,
  RemoteIcon,
  fetchAllRemoteIcons,
  fetchIconLibrary,
  loadCachedRemoteIcons,
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

function IconView({ item, size = 28 }: { item: Subscription; size?: number }) {
  if (item.iconPath) return <Image filePath={item.iconPath} resizable={true} scaleToFit={true} frame={{ width: size, height: size }} />
  if (item.iconURL) return <Image imageUrl={item.iconURL} resizable={true} scaleToFit={true} frame={{ width: size, height: size }} />
  return <Image systemName={item.icon || "creditcard.fill"} foregroundStyle={item.color || "systemBlue"} font={size - 5} />
}

function Summary({ items }: { items: Subscription[] }) {
  const active = activeItems(items)
  const next = sortByNextBilling(active)[0]
  const dueSoon = active.filter(item => {
    const days = daysUntil(effectiveDueDate(item))
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
          {dueSoon > 0 ? `${dueSoon} 项 7 天内到期` : "未来 7 天无到期项"}
        </Text>
      </HStack>
      {next ? <Text font="caption" foregroundStyle="secondaryLabel">最近：{next.name || "未命名订阅"} · {dueText(effectiveDueDate(next))}</Text> : null}
    </VStack>
  </Section>
}

function SubscriptionRow({ item, onEdit }: { item: Subscription; onEdit: (item: Subscription) => void }) {
  const days = daysUntil(effectiveDueDate(item))
  const color = !item.active ? "secondaryLabel" : days <= 3 ? "systemOrange" : "secondaryLabel"
  return <Button action={() => onEdit(item)}>
    <HStack spacing={10}>
      <IconView item={item} size={30} />
      <VStack alignment="leading" spacing={2}>
        <Text fontWeight="semibold" lineLimit={1}>{item.name || "未命名订阅"}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">{cycleLabel(item.cycle)} · {item.category}</Text>
        <Text font="caption" foregroundStyle={color}>{item.active ? dueText(effectiveDueDate(item)) : "已停用 · 点击编辑"}</Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={2}>
        <Text fontWeight="semibold">{formatMoney(item.price, item.currency)}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">点击编辑</Text>
      </VStack>
    </HStack>
  </Button>
}

function EditorPage({
  initial,
  isNew = false,
  onBack,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Subscription
  isNew?: boolean
  onBack: () => void
  onClose: () => void
  onSave: (item: Subscription) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}) {
  const [item, setItem] = useState<Subscription>(initial)
  const [error, setError] = useState("")
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([])
  const [remoteIcons, setRemoteIcons] = useState<RemoteIcon[]>([])
  const [remoteQuery, setRemoteQuery] = useState("")
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteReady, setRemoteReady] = useState(false)
  const [libraryURL, setLibraryURL] = useState(DEFAULT_ICON_LIBRARY_URL)
  const [hasTrial, setHasTrial] = useState(!!initial.trialEndDate)
  const [hasEndDate, setHasEndDate] = useState(!!initial.endDate)

  useEffect(() => {
    loadCustomIcons().then(setCustomIcons).catch(() => {})
    loadIconLibraryURLs().then(urls => { if (urls[0]) setLibraryURL(urls[0]) }).catch(() => {})
    loadCachedRemoteIcons().then(icons => { setRemoteIcons(icons); setRemoteReady(true) }).catch(() => setRemoteReady(true))
  }, [])

  const update = (patch: Partial<Subscription>) => setItem(previous => ({ ...previous, ...patch }))
  async function importIcons() {
    try { setCustomIcons(await importCustomIcons()) } catch (e) { setError(`导入图标失败：${String(e)}`) }
  }
  async function refreshRemoteIcons() {
    setRemoteLoading(true); setError("")
    try {
      const icons = await fetchAllRemoteIcons()
      setRemoteIcons(icons); setRemoteReady(true)
      if (!icons.length) setError("图标库为空或暂时无法访问")
    } catch (e) { setError(`读取图标库失败：${String(e)}`) }
    finally { setRemoteLoading(false) }
  }
  async function changeRemoteLibrary() {
    const value = await Dialog.prompt({
      title: "Raw 图标库地址",
      message: "JSON 需要包含 icons 数组，每项包含 name 和 url",
      defaultValue: libraryURL,
      placeholder: "https://raw.githubusercontent.com/.../icons.json",
      confirmLabel: "读取",
      cancelLabel: "取消",
    })
    if (!value || !/^https:\/\//.test(value.trim())) return
    try {
      const url = value.trim(); const icons = await fetchIconLibrary(url)
      await saveIconLibraryURLs([url]); setLibraryURL(url); setRemoteIcons(icons); setRemoteReady(true)
      if (!icons.length) setError("图标库没有有效图标")
    } catch (e) { setError(`图标库格式或网络错误：${String(e)}`) }
  }
  function selectSystemIcon(value: string) { update({ icon: value, iconPath: "", iconURL: "" }) }
  function selectRemoteIcon(icon: RemoteIcon) { update({ icon: `remote:${icon.name}`, iconURL: icon.url, iconPath: "" }) }
  function selectCustomIcon(icon: CustomIcon) { update({ icon: `custom:${icon.id}`, iconPath: icon.filePath, iconURL: "" }) }
  async function removeIcon(icon: CustomIcon) {
    const next = await deleteCustomIcon(icon.id); setCustomIcons(next)
    if (item.icon === `custom:${icon.id}`) selectSystemIcon("creditcard.fill")
  }
  async function save() {
    const name = item.name.trim()
    if (!name) return setError("请输入订阅名称")
    if (!Number.isFinite(item.price) || item.price < 0) return setError("请输入有效价格")
    if (item.endDate && item.endDate < item.startDate) return setError("结束日期不能早于开始日期")
    try { await onSave({ ...item, name }); onBack() } catch (e) { setError(`保存失败：${String(e)}`) }
  }
  async function remove() {
    const yes = await Dialog.confirm({ title: "删除订阅", message: `确定删除“${item.name || "未命名订阅"}”吗？`, cancelLabel: "取消", confirmLabel: "删除" })
    if (!yes) return
    try { await onDelete(item.id); onBack() } catch (e) { setError(`删除失败：${String(e)}`) }
  }
  async function markPaid() {
    const next = item.cycle === "oneTime" ? { ...item, active: false } : { ...item, nextBillingDate: advanceBillingDate(item.nextBillingDate, item.cycle) }
    try { await onSave(next); onBack() } catch (e) { setError(`更新失败：${String(e)}`) }
  }

  return <List navigationTitle={isNew ? "新增订阅" : "编辑订阅"} navigationBarTitleDisplayMode="inline" toolbar={{
    topBarLeading: <Button title="返回" action={onBack} />,
    topBarTrailing: [<Button title="关闭" action={onClose} />, <Button title="保存" action={save} />],
  }}>
    <Section>
      <TextField title="名称" value={item.name} onChanged={value => update({ name: value })} prompt="例如：Apple Music" />
      <TextField title={`价格（${item.currency}）`} value={String(item.price)} onChanged={value => update({ price: Number(value.replace(/[^0-9.]/g, "")) || 0 })} prompt="例如：9.99" />
      <Picker title="币种" pickerStyle="menu" value={item.currency} onChanged={value => update({ currency: String(value) })}>{CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}</Picker>
      <Picker title="周期" pickerStyle="menu" value={item.cycle} onChanged={value => update({ cycle: value as Subscription["cycle"] })}><Text tag="weekly">每周</Text><Text tag="monthly">每月</Text><Text tag="quarterly">每季</Text><Text tag="yearly">每年</Text><Text tag="oneTime">一次性</Text></Picker>
      <Picker title="分类" pickerStyle="menu" value={item.category} onChanged={value => update({ category: String(value) })}>{CATEGORIES.map(value => <Text tag={value}>{value}</Text>)}</Picker>
    </Section>
    <Section header={<Text>图标与进度条</Text>}>
      {customIcons.length ? <VStack alignment="leading" spacing={4}><Text font="caption" foregroundStyle="secondaryLabel">本地图标</Text>{customIcons.map(icon => <Button key={icon.id} action={() => selectCustomIcon(icon)}><HStack><Image filePath={icon.filePath} resizable={true} scaleToFit={true} frame={{ width: 28, height: 28 }} /><Text>{icon.name}</Text><Spacer />{item.icon === `custom:${icon.id}` ? <Image systemName="checkmark" foregroundStyle="systemBlue" /> : null}</HStack></Button>)}</VStack> : null}
      <Button title="从文件导入图标" systemImage="folder.badge.plus" action={importIcons} />
      {customIcons.length ? <Button title="删除已导入图标" systemImage="trash" action={async () => { const index = await Dialog.actionSheet({ title: "删除图标", actions: customIcons.map(icon => ({ label: icon.name, destructive: true })) }); if (index !== null && customIcons[index]) await removeIcon(customIcons[index]) }} /> : null}
      <Button title={remoteLoading ? "正在读取远程图标库…" : (remoteReady ? `读取远程图标库（${remoteIcons.length}）` : "读取远程图标库")} systemImage="arrow.clockwise" action={refreshRemoteIcons} disabled={remoteLoading} />
      <Button title="更换 Raw 图标库" systemImage="link" action={changeRemoteLibrary} />
      {remoteIcons.length ? <VStack alignment="leading" spacing={4}><Text font="caption" foregroundStyle="secondaryLabel">远程图标（筛选后最多 60 项）</Text><TextField title="筛选" value={remoteQuery} onChanged={setRemoteQuery} prompt="输入名称" />{remoteIcons.filter(icon => !remoteQuery || icon.name.toLowerCase().includes(remoteQuery.toLowerCase())).slice(0, 60).map(icon => <Button key={`${icon.name}-${icon.url}`} action={() => selectRemoteIcon(icon)}><HStack><Image imageUrl={icon.url} resizable={true} scaleToFit={true} frame={{ width: 28, height: 28 }} /><Text lineLimit={1}>{icon.name}</Text><Spacer />{item.iconURL === icon.url ? <Image systemName="checkmark" foregroundStyle="systemBlue" /> : null}</HStack></Button>)}</VStack> : null}
      {(item.iconPath || item.iconURL) ? <Button title="改用系统图标" systemImage="arrow.uturn.backward" action={() => selectSystemIcon("creditcard.fill")} /> : null}
      <Picker title="系统图标" pickerStyle="menu" value={item.iconPath || item.iconURL ? "creditcard.fill" : item.icon} onChanged={value => selectSystemIcon(String(value))}>{ICON_OPTIONS.map(value => <Text tag={value}>{value}</Text>)}</Picker>
      <ColorPicker title="Widget 进度条颜色" value={item.progressColor || "systemBlue"} supportsOpacity={false} onChanged={value => update({ progressColor: String(value) })} />
      {error ? <Text font="caption" foregroundStyle="systemRed">{error}</Text> : null}
    </Section>
    <Section header={<Text>日期与续费</Text>}>
      <DatePicker title="开始日期" value={item.startDate} displayedComponents={["date"]} onChanged={value => update({ startDate: dateOnly(value) })} />
      <DatePicker title="下次到期" value={item.nextBillingDate} displayedComponents={["date"]} onChanged={value => update({ nextBillingDate: dateOnly(value) })} />
      <Toggle title="设置试用结束日期" value={hasTrial} onChanged={value => { setHasTrial(value); update({ trialEndDate: value ? (item.trialEndDate || item.nextBillingDate) : null }) }} />
      {hasTrial ? <DatePicker title="试用结束" value={item.trialEndDate || item.nextBillingDate} displayedComponents={["date"]} onChanged={value => update({ trialEndDate: dateOnly(value) })} /> : null}
      <Toggle title="自动续费" value={item.autoRenew} onChanged={value => update({ autoRenew: value })} />
      {item.autoRenew && item.cycle !== "oneTime" ? <Picker title="提前提醒" pickerStyle="menu" value={item.reminderDays} onChanged={value => update({ reminderDays: Number(value) })}>{REMINDER_OPTIONS.map(value => <Text tag={value}>{value === 0 ? "不提醒" : `提前 ${value} 天`}</Text>)}</Picker> : null}
      <Toggle title="设置结束日期" value={hasEndDate} onChanged={value => { setHasEndDate(value); update({ endDate: value ? (item.endDate || item.nextBillingDate) : null }) }} />
      {hasEndDate ? <DatePicker title="结束日期" value={item.endDate || item.nextBillingDate} displayedComponents={["date"]} onChanged={value => update({ endDate: dateOnly(value) })} /> : null}
      <Toggle title="有效订阅" value={item.active} onChanged={value => update({ active: value })} />
    </Section>
    <Section header={<Text>备注</Text>}><TextField title="备注" value={item.notes} onChanged={value => update({ notes: value })} prompt="可选" axis="vertical" lineLimit={{ min: 2, max: 5 }} /></Section>
    {!isNew ? <Section><Button title="记录本次扣款并顺延" systemImage="checkmark.circle" action={markPaid} /><Button title="删除此订阅" role="destructive" action={remove} /></Section> : null}
  </List>
}

function PopularPicker({ onPicked, onClose }: { onPicked: (item: Subscription) => void | Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("全部")
  const [settings, setSettings] = useState<AppSettings>({ defaultCurrency: "CNY", defaultReminderDays: 3, notificationsEnabled: true })
  useEffect(() => { loadSettings().then(setSettings).catch(() => {}) }, [])
  const filtered = POPULAR_SERVICES.filter(service => (!query || service.name.toLowerCase().includes(query.toLowerCase())) && (category === "全部" || service.category === category))
  return <List navigationTitle="添加常用服务" navigationBarTitleDisplayMode="inline" toolbar={{ topBarLeading: <Button title="返回" action={onClose} />, topBarTrailing: <Button title="关闭" action={onClose} /> }}>
    <Section><TextField title="搜索" value={query} onChanged={setQuery} prompt="搜索服务名称" /><Picker title="分类" pickerStyle="menu" value={category} onChanged={value => setCategory(String(value))}>{["全部", ...CATEGORIES].map(value => <Text tag={value}>{value}</Text>)}</Picker></Section>
    <Section>{filtered.map(service => <Button key={service.name} action={() => { void onPicked(createSubscription(settings, service)); onClose() }}><HStack><Image systemName={service.icon} foregroundStyle={service.color} font={22} /><Text>{service.name}</Text><Spacer /><Image systemName="plus.circle" foregroundStyle="systemBlue" /></HStack></Button>)}</Section>
  </List>
}

function Home({ items, onItemsChanged, onOpenSettings, onOpenStats, onClose }: { items: Subscription[]; onItemsChanged: (items: Subscription[]) => void; onOpenSettings: () => void; onOpenStats: () => void; onClose: () => void }) {
  const editDismiss = Navigation.useDismiss()
  const [page, setPage] = useState<"home" | "add" | "popular">("home")
  const [settings, setSettings] = useState<AppSettings>({ defaultCurrency: "CNY", defaultReminderDays: 3, notificationsEnabled: true })
  useEffect(() => { loadSettings().then(setSettings).catch(() => {}) }, [])
  function save(item: Subscription) {
    const next = items.some(existing => existing.id === item.id) ? items.map(existing => existing.id === item.id ? item : existing) : [...items, item]
    onItemsChanged(next)
    void saveSubscriptions(next)
    rescheduleNotifications(next, settings).catch(() => {})
  }
  async function remove(id: string) {
    const next = items.filter(item => item.id !== id)
    onItemsChanged(next)
    await saveSubscriptions(next)
  }
  if (page === "add") return <EditorPage initial={createSubscription(settings)} isNew={true} onBack={() => setPage("home")} onClose={onClose} onSave={save} onDelete={async () => {}} />
  if (page === "popular") return <PopularPicker onPicked={item => { save(item); setPage("home") }} onClose={() => setPage("home")} />
  const active = sortByNextBilling(activeItems(items))
  return <List navigationTitle="订阅管理" navigationBarTitleDisplayMode="large" toolbar={{ topBarLeading: <Button title="关闭" action={onClose} />, topBarTrailing: <Button title="设置" action={onOpenSettings} /> }}><Summary items={items} /><Section header={<Text>我的订阅</Text>}>{active.length === 0 ? <Text foregroundStyle="secondaryLabel">还没有订阅，点击下方添加</Text> : active.map(item => <SubscriptionRow key={item.id} item={item} onEdit={edited => { void Navigation.present({ element: <EditorPage initial={edited} onBack={editDismiss} onClose={onClose} onSave={save} onDelete={remove} /> }) }} />)}</Section><Section><Button title="从常用服务添加" systemImage="square.grid.2x2" action={() => setPage("popular")} /><Button title="自定义订阅" systemImage="plus" action={() => setPage("add")} /><Button title="查看统计" systemImage="chart.pie.fill" action={onOpenStats} /></Section></List>
}

function StatisticsPage({ items, onBack, onClose }: { items: Subscription[]; onBack: () => void; onClose: () => void }) {
  const active = activeItems(items)
  const by: Record<string, number> = {}
  for (const item of active) by[item.category] = (by[item.category] || 0) + monthlyCost([item])
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1])
  const marks = rows.map(([category, amount]) => ({ category, value: amount }))
  return <List navigationTitle="统计" navigationBarTitleDisplayMode="inline" toolbar={{ topBarLeading: <Button title="返回" action={onBack} />, topBarTrailing: <Button title="关闭" action={onClose} /> }}><Section><Text font="caption" foregroundStyle="secondaryLabel">每月估算</Text><Text font="title" fontWeight="bold">{formatCostSummary(active)}</Text><Text font="caption" foregroundStyle="secondaryLabel">每年估算</Text><Text font="headline">{formatCostSummary(active, true)}</Text></Section>{marks.length > 0 ? <Section header={<Text>费用占比</Text>}><Chart frame={{ height: 220 }}><DonutChart marks={marks} /></Chart></Section> : null}<Section header={<Text>按分类</Text>}>{rows.length === 0 ? <Text foregroundStyle="secondaryLabel">暂无数据</Text> : rows.map(([category, amount]) => <HStack key={category}><Text>{category}</Text><Spacer /><Text>{formatMoney(amount, active.find(item => item.category === category)?.currency || "CNY")}</Text></HStack>)}</Section></List>
}

function SettingsPage({ items, onBack, onClose }: { items: Subscription[]; onBack: () => void; onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings>({ defaultCurrency: "CNY", defaultReminderDays: 3, notificationsEnabled: true })
  const [notice, setNotice] = useState("")
  useEffect(() => { loadSettings().then(setSettings).catch(() => {}) }, [])
  function update(patch: Partial<AppSettings>) { const next = { ...settings, ...patch }; setSettings(next); void saveSettings(next) }
  return <List navigationTitle="设置" navigationBarTitleDisplayMode="inline" toolbar={{ topBarLeading: <Button title="返回" action={onBack} />, topBarTrailing: <Button title="关闭" action={onClose} /> }}><Section header={<Text>默认值</Text>}><Picker title="默认币种" pickerStyle="menu" value={settings.defaultCurrency} onChanged={value => update({ defaultCurrency: String(value) })}>{CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}</Picker><Picker title="默认提醒" pickerStyle="menu" value={settings.defaultReminderDays} onChanged={value => update({ defaultReminderDays: Number(value) })}>{REMINDER_OPTIONS.map(value => <Text tag={value}>{value === 0 ? "不提醒" : `提前 ${value} 天`}</Text>)}</Picker></Section><Section><Toggle title="启用续费通知" value={settings.notificationsEnabled} onChanged={value => update({ notificationsEnabled: value })} /><Button title="重新安排所有提醒" systemImage="bell.badge" action={async () => { const count = await rescheduleNotifications(items, settings); setNotice(count ? `已安排 ${count} 条提醒` : notificationSummary(items, settings)) }} />{notice ? <Text font="caption" foregroundStyle="secondaryLabel">{notice}</Text> : null}</Section></List>
}

function App() {
  const dismiss = Navigation.useDismiss()
  const [page, setPage] = useState<"home" | "settings" | "stats">("home")
  const [items, setItems] = useState<Subscription[]>(() => [])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState("")
  useEffect(() => { loadSubscriptions().then(value => { setItems(value); setLoaded(true) }).catch(error => { setLoadError(String(error)); setLoaded(true) }) }, [])
  function updateItems(value: Subscription[]) { setItems(value) }
  if (!loaded) return <List navigationTitle="订阅管理"><Section><Text>正在读取订阅…</Text></Section></List>
  if (loadError) return <List navigationTitle="订阅管理"><Section><Text foregroundStyle="systemRed">读取数据失败</Text><Text font="caption">{loadError}</Text><Button title="重试" action={() => { setLoaded(false); setLoadError(""); loadSubscriptions().then(value => { setItems(value); setLoaded(true) }).catch(error => { setLoadError(String(error)); setLoaded(true) }) }} /><Button title="关闭" action={dismiss} /></Section></List>
  if (page === "settings") return <SettingsPage items={items} onBack={() => setPage("home")} onClose={dismiss} />
  if (page === "stats") return <StatisticsPage items={items} onBack={() => setPage("home")} onClose={dismiss} />
  return <Home items={items} onItemsChanged={updateItems} onOpenSettings={() => setPage("settings")} onOpenStats={() => setPage("stats")} onClose={dismiss} />
}

async function run() {
  await Navigation.present({ element: <App /> })
  Script.exit()
}
run()
