import {
  AppSettings,
  CATEGORIES,
  CURRENCIES,
  DEFAULT_SETTINGS,
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
  effectiveDueDate,
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
  ColorPicker,
  DatePicker,
  Dialog,
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
  useState,
} from "scripting"

function dueText(timestamp: number): string {
  const days = daysUntil(timestamp)
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`
  if (days === 0) return "今天到期"
  if (days === 1) return "明天到期"
  return `${days} 天后到期`
}

function IconView({ item, size = 28 }: {
  item: Subscription
  size?: number
}) {
  return <Image
    systemName={item.icon || "creditcard.fill"}
    foregroundStyle={item.progressColor || "systemBlue"}
    font={size - 4}
  />
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
      <Text font="caption" foregroundStyle="secondaryLabel">
        本月预计支出
      </Text>
      <Text font="title" fontWeight="bold">
        {formatCostSummary(items)}
      </Text>
      <HStack>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {active.length} 项有效订阅
        </Text>
        <Spacer />
        <Text
          font="caption"
          foregroundStyle={dueSoon > 0 ? "systemOrange" : "secondaryLabel"}
        >
          {dueSoon > 0 ? `${dueSoon} 项 7 天内到期` : "未来 7 天无到期项"}
        </Text>
      </HStack>
      {next ? <Text font="caption" foregroundStyle="secondaryLabel">
        最近：{next.name || "未命名订阅"} · {dueText(effectiveDueDate(next))}
      </Text> : null}
    </VStack>
  </Section>
}

function SubscriptionRow({
  item,
  onEdit,
}: {
  item: Subscription
  onEdit: (item: Subscription) => void
}) {
  const days = daysUntil(effectiveDueDate(item))
  const statusColor = !item.active
    ? "secondaryLabel"
    : days <= 3
      ? "systemOrange"
      : "secondaryLabel"

  return <Button action={() => onEdit(item)}>
    <HStack spacing={10}>
      <IconView item={item} size={30} />
      <VStack alignment="leading" spacing={2}>
        <Text fontWeight="semibold" lineLimit={1}>
          {item.name || "未命名订阅"}
        </Text>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {cycleLabel(item.cycle)} · {item.category}
        </Text>
        <Text font="caption" foregroundStyle={statusColor}>
          {item.active ? dueText(effectiveDueDate(item)) : "已停用"}
        </Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={2}>
        <Text fontWeight="semibold">
          {formatMoney(item.price, item.currency)}
        </Text>
        <Text font="caption" foregroundStyle="secondaryLabel">
          编辑
        </Text>
      </VStack>
    </HStack>
  </Button>
}

function EditorPage({
  initial,
  isNew,
  onBack,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Subscription
  isNew: boolean
  onBack: () => void
  onClose: () => void
  onSave: (item: Subscription) => void
  onDelete: (id: string) => void
}) {
  const [item, setItem] = useState<Subscription>(initial)
  const [error, setError] = useState("")
  const [hasTrial, setHasTrial] = useState(!!initial.trialEndDate)
  const [hasEndDate, setHasEndDate] = useState(!!initial.endDate)

  function update(patch: Partial<Subscription>): void {
    setItem(previous => ({ ...previous, ...patch }))
  }

  function save(): void {
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
      onSave({ ...item, name })
      onBack()
    } catch (saveError) {
      setError(`保存失败：${String(saveError)}`)
    }
  }

  async function remove(): Promise<void> {
    const confirmed = await Dialog.confirm({
      title: "删除订阅",
      message: `确定删除“${item.name || "未命名订阅"}”吗？`,
      cancelLabel: "取消",
      confirmLabel: "删除",
    })
    if (!confirmed) return
    try {
      onDelete(item.id)
      onBack()
    } catch (deleteError) {
      setError(`删除失败：${String(deleteError)}`)
    }
  }

  function markPaid(): void {
    const next = item.cycle === "oneTime"
      ? { ...item, active: false }
      : {
          ...item,
          nextBillingDate: advanceBillingDate(
            item.nextBillingDate,
            item.cycle,
          ),
        }
    onSave(next)
    onBack()
  }

  return <List
    navigationTitle={isNew ? "新增订阅" : "编辑订阅"}
    navigationBarTitleDisplayMode="inline"
    toolbar={{
      topBarLeading: <Button title="返回" action={onBack} />,
      topBarTrailing: [
        <Button title="关闭" action={onClose} />,
        <Button title="保存" action={save} />,
      ],
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
        onChanged={value => update({
          price: Number(value.replace(/[^0-9.]/g, "")) || 0,
        })}
        prompt="例如：9.99"
      />
      <Picker
        title="币种"
        pickerStyle="menu"
        value={item.currency}
        onChanged={value => update({ currency: String(value) })}
      >
        {CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <Picker
        title="周期"
        pickerStyle="menu"
        value={item.cycle}
        onChanged={value => update({
          cycle: value as Subscription["cycle"],
        })}
      >
        <Text tag="weekly">每周</Text>
        <Text tag="monthly">每月</Text>
        <Text tag="quarterly">每季</Text>
        <Text tag="yearly">每年</Text>
        <Text tag="oneTime">一次性</Text>
      </Picker>
      <Picker
        title="分类"
        pickerStyle="menu"
        value={item.category}
        onChanged={value => update({ category: String(value) })}
      >
        {CATEGORIES.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
    </Section>

    <Section header={<Text>SF Symbols 与 Widget</Text>}>
      <HStack>
        <Image
          systemName={item.icon || "creditcard.fill"}
          foregroundStyle={item.progressColor || "systemBlue"}
          font={26}
        />
        <Text>{item.icon || "creditcard.fill"}</Text>
      </HStack>
      <Picker
        title="常用 SF Symbol"
        pickerStyle="menu"
        value={item.icon}
        onChanged={value => update({ icon: String(value) })}
      >
        {ICON_OPTIONS.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <TextField
        title="自定义 SF Symbol 名称"
        value={item.icon}
        onChanged={value => update({ icon: value.trim() })}
        prompt="例如：star.fill"
      />
      <ColorPicker
        title="Widget 进度条颜色"
        value={item.progressColor || "systemBlue"}
        supportsOpacity={false}
        onChanged={value => update({ progressColor: String(value) })}
      />
      <Text font="caption" foregroundStyle="secondaryLabel">
        自定义名称必须是设备系统支持的 SF Symbol。
      </Text>
    </Section>

    <Section header={<Text>日期与续费</Text>}>
      <DatePicker
        title="开始日期"
        value={item.startDate}
        displayedComponents={["date"]}
        onChanged={value => update({ startDate: dateOnly(value) })}
      />
      <DatePicker
        title="下次到期"
        value={item.nextBillingDate}
        displayedComponents={["date"]}
        onChanged={value => update({ nextBillingDate: dateOnly(value) })}
      />
      <Toggle
        title="设置试用结束日期"
        value={hasTrial}
        onChanged={value => {
          setHasTrial(value)
          update({
            trialEndDate: value
              ? item.trialEndDate || item.nextBillingDate
              : null,
          })
        }}
      />
      {hasTrial ? <DatePicker
        title="试用结束"
        value={item.trialEndDate || item.nextBillingDate}
        displayedComponents={["date"]}
        onChanged={value => update({ trialEndDate: dateOnly(value) })}
      /> : null}
      <Toggle
        title="自动续费"
        value={item.autoRenew}
        onChanged={value => update({ autoRenew: value })}
      />
      {item.autoRenew && item.cycle !== "oneTime" ? <Picker
        title="提前提醒"
        pickerStyle="menu"
        value={item.reminderDays}
        onChanged={value => update({ reminderDays: Number(value) })}
      >
        {REMINDER_OPTIONS.map(value => <Text tag={value}>
          {value === 0 ? "不提醒" : `提前 ${value} 天`}
        </Text>)}
      </Picker> : null}
      <Toggle
        title="设置结束日期"
        value={hasEndDate}
        onChanged={value => {
          setHasEndDate(value)
          update({
            endDate: value ? item.endDate || item.nextBillingDate : null,
          })
        }}
      />
      {hasEndDate ? <DatePicker
        title="结束日期"
        value={item.endDate || item.nextBillingDate}
        displayedComponents={["date"]}
        onChanged={value => update({ endDate: dateOnly(value) })}
      /> : null}
      <Toggle
        title="有效订阅"
        value={item.active}
        onChanged={value => update({ active: value })}
      />
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
      {error ? <Text
        font="caption"
        foregroundStyle="systemRed"
      >
        {error}
      </Text> : null}
    </Section>

    {!isNew ? <Section>
      <Button
        title="记录本次扣款并顺延"
        systemImage="checkmark.circle"
        action={markPaid}
      />
      <Button
        title="删除此订阅"
        role="destructive"
        action={remove}
      />
    </Section> : null}
  </List>
}

function PopularPicker({
  settings,
  onPicked,
  onBack,
  onClose,
}: {
  settings: AppSettings
  onPicked: (item: Subscription) => void
  onBack: () => void
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("全部")
  const filtered = POPULAR_SERVICES.filter(service => {
    const nameMatches = !query || service.name
      .toLowerCase()
      .includes(query.toLowerCase())
    return nameMatches && (
      category === "全部" || service.category === category
    )
  })

  return <List
    navigationTitle="添加常用服务"
    navigationBarTitleDisplayMode="inline"
    toolbar={{
      topBarLeading: <Button title="返回" action={onBack} />,
      topBarTrailing: <Button title="关闭" action={onClose} />,
    }}
  >
    <Section>
      <TextField
        title="搜索"
        value={query}
        onChanged={setQuery}
        prompt="搜索服务名称"
      />
      <Picker
        title="分类"
        pickerStyle="menu"
        value={category}
        onChanged={value => setCategory(String(value))}
      >
        {["全部", ...CATEGORIES].map(value => <Text tag={value}>
          {value}
        </Text>)}
      </Picker>
    </Section>
    <Section>
      {filtered.map(service => <Button
        key={service.name}
        action={() => {
          onPicked(createSubscription(settings, service))
          onBack()
        }}
      >
        <HStack>
          <Image
            systemName={service.icon}
            foregroundStyle={service.color}
            font={22}
          />
          <Text>{service.name}</Text>
          <Spacer />
          <Image
            systemName="plus.circle"
            foregroundStyle="systemBlue"
          />
        </HStack>
      </Button>)}
    </Section>
  </List>
}

function HomePage({
  items,
  settings,
  onItemsChanged,
  onOpenSettings,
  onOpenStats,
  onClose,
}: {
  items: Subscription[]
  settings: AppSettings
  onItemsChanged: (items: Subscription[]) => void
  onOpenSettings: () => void
  onOpenStats: () => void
  onClose: () => void
}) {
  const [page, setPage] = useState<"home" | "new" | "popular">("home")
  const [editing, setEditing] = useState<Subscription | null>(null)

  function persist(next: Subscription[]): void {
    saveSubscriptions(next)
    onItemsChanged(next)
  }

  function save(item: Subscription): void {
    const next = items.some(existing => existing.id === item.id)
      ? items.map(existing => existing.id === item.id ? item : existing)
      : [...items, item]
    persist(next)
    void rescheduleNotifications(next, settings)
  }

  function remove(id: string): void {
    persist(items.filter(item => item.id !== id))
  }

  if (editing) {
    return <EditorPage
      initial={editing}
      isNew={false}
      onBack={() => setEditing(null)}
      onClose={onClose}
      onSave={save}
      onDelete={remove}
    />
  }

  if (page === "new") {
    return <EditorPage
      initial={createSubscription(settings)}
      isNew={true}
      onBack={() => setPage("home")}
      onClose={onClose}
      onSave={save}
      onDelete={() => {}}
    />
  }

  if (page === "popular") {
    return <PopularPicker
      settings={settings}
      onPicked={save}
      onBack={() => setPage("home")}
      onClose={onClose}
    />
  }

  const active = sortByNextBilling(activeItems(items))
  return <List
    navigationTitle="订阅管理"
    navigationBarTitleDisplayMode="large"
    toolbar={{
      topBarLeading: <Button title="关闭" action={onClose} />,
      topBarTrailing: <Button
        title="设置"
        action={onOpenSettings}
      />,
    }}
  >
    <Summary items={items} />
    <Section header={<Text>我的订阅</Text>}>
      {active.length === 0 ? <Text foregroundStyle="secondaryLabel">
        还没有订阅，点击下方添加
      </Text> : active.map(item => <SubscriptionRow
        key={item.id}
        item={item}
        onEdit={setEditing}
      />)}
    </Section>
    <Section>
      <Button
        title="从常用服务添加"
        systemImage="square.grid.2x2"
        action={() => setPage("popular")}
      />
      <Button
        title="自定义订阅"
        systemImage="plus"
        action={() => setPage("new")}
      />
      <Button
        title="查看统计"
        systemImage="chart.pie.fill"
        action={onOpenStats}
      />
    </Section>
  </List>
}

function StatisticsPage({
  items,
  onBack,
  onClose,
}: {
  items: Subscription[]
  onBack: () => void
  onClose: () => void
}) {
  const active = activeItems(items)
  const byCategory: Record<string, number> = {}
  for (const item of active) {
    byCategory[item.category] = (
      byCategory[item.category] || 0
    ) + monthlyCost([item])
  }
  const rows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])

  return <List
    navigationTitle="统计"
    navigationBarTitleDisplayMode="inline"
    toolbar={{
      topBarLeading: <Button title="返回" action={onBack} />,
      topBarTrailing: <Button title="关闭" action={onClose} />,
    }}
  >
    <Section>
      <Text font="caption" foregroundStyle="secondaryLabel">
        每月估算
      </Text>
      <Text font="title" fontWeight="bold">
        {formatCostSummary(active)}
      </Text>
      <Text font="caption" foregroundStyle="secondaryLabel">
        每年估算
      </Text>
      <Text font="headline">
        {formatCostSummary(active, true)}
      </Text>
    </Section>
    <Section header={<Text>按分类</Text>}>
      {rows.length === 0 ? <Text foregroundStyle="secondaryLabel">
        暂无数据
      </Text> : rows.map(([category, amount]) => <HStack key={category}>
        <Text>{category}</Text>
        <Spacer />
        <Text>{formatMoney(
          amount,
          active.find(item => item.category === category)?.currency || "CNY",
        )}</Text>
      </HStack>)}
    </Section>
  </List>
}

function SettingsPage({
  items,
  initial,
  onChanged,
  onBack,
  onClose,
}: {
  items: Subscription[]
  initial: AppSettings
  onChanged: (settings: AppSettings) => void
  onBack: () => void
  onClose: () => void
}) {
  const [settings, setSettings] = useState(initial)
  const [notice, setNotice] = useState("")

  function update(patch: Partial<AppSettings>): void {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
    onChanged(next)
  }

  return <List
    navigationTitle="设置"
    navigationBarTitleDisplayMode="inline"
    toolbar={{
      topBarLeading: <Button title="返回" action={onBack} />,
      topBarTrailing: <Button title="关闭" action={onClose} />,
    }}
  >
    <Section header={<Text>默认值</Text>}>
      <Picker
        title="默认币种"
        pickerStyle="menu"
        value={settings.defaultCurrency}
        onChanged={value => update({ defaultCurrency: String(value) })}
      >
        {CURRENCIES.map(value => <Text tag={value}>{value}</Text>)}
      </Picker>
      <Picker
        title="默认提醒"
        pickerStyle="menu"
        value={settings.defaultReminderDays}
        onChanged={value => update({ defaultReminderDays: Number(value) })}
      >
        {REMINDER_OPTIONS.map(value => <Text tag={value}>
          {value === 0 ? "不提醒" : `提前 ${value} 天`}
        </Text>)}
      </Picker>
    </Section>
    <Section>
      <Toggle
        title="启用续费通知"
        value={settings.notificationsEnabled}
        onChanged={value => update({ notificationsEnabled: value })}
      />
      <Button
        title="重新安排所有提醒"
        systemImage="bell.badge"
        action={async () => {
          const count = await rescheduleNotifications(items, settings)
          setNotice(count
            ? `已安排 ${count} 条提醒`
            : notificationSummary(items, settings))
        }}
      />
      {notice ? <Text font="caption" foregroundStyle="secondaryLabel">
        {notice}
      </Text> : null}
    </Section>
  </List>
}

function App() {
  const dismiss = Navigation.useDismiss()
  const [page, setPage] = useState<"home" | "settings" | "stats">("home")
  const [items, setItems] = useState<Subscription[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [error, setError] = useState("")

  useEffect(() => {
    try {
      setItems(loadSubscriptions())
      setSettings(loadSettings())
    } catch (loadError) {
      setError(String(loadError))
    }
  }, [])

  if (error) {
    return <List navigationTitle="订阅管理">
      <Section>
        <Text foregroundStyle="systemRed">读取数据失败</Text>
        <Text font="caption">{error}</Text>
        <Button title="关闭" action={dismiss} />
      </Section>
    </List>
  }

  if (page === "settings") {
    return <SettingsPage
      items={items}
      initial={settings}
      onChanged={setSettings}
      onBack={() => setPage("home")}
      onClose={dismiss}
    />
  }

  if (page === "stats") {
    return <StatisticsPage
      items={items}
      onBack={() => setPage("home")}
      onClose={dismiss}
    />
  }

  return <HomePage
    items={items}
    settings={settings}
    onItemsChanged={setItems}
    onOpenSettings={() => setPage("settings")}
    onOpenStats={() => setPage("stats")}
    onClose={dismiss}
  />
}

async function run() {
  await Navigation.present({ element: <App /> })
  Script.exit()
}

run()
