import { Script } from "scripting"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

async function main() {
  const librarySource = await FileManager.readAsString(`${projectDirectory}/page/saved/index.tsx`)
  const settingSource = await FileManager.readAsString(`${projectDirectory}/page/setting/index.tsx`)

  requireMatch(librarySource, /BangumiProgressView/, "片库缺少 Bangumi 进度固定入口")
  requireMatch(librarySource, /icon=\{isBangumiAuthenticated \? "chart\.bar\.xaxis" : "lock"\}/, "片库 Bangumi 进度入口缺少实时状态图标")
  requireMatch(librarySource, /navigationDestination=\{showBangumiProgress[\s\S]*?content: <BangumiProgressView/, "实时授权入口未打开 Bangumi 进度页")
  requireMatch(librarySource, /需要 Bangumi 授权/, "未登录入口缺少授权提示")
  requireMatch(librarySource, /onAppear=\{\(\) => \{[\s\S]*?refreshBangumiAuthentication\(\)[\s\S]*?void loadData\(\)/, "片库显示时未同步刷新数据与 OAuth 状态")
  requireMatch(librarySource, /openBangumiProgress[\s\S]*?refreshBangumiAuthentication\(\)/, "片库缺少点击时实时登录门禁")

  requireMatch(settingSource, /SettingActionRow icon="key" iconTint="secondaryLabel" title="账号授权"/, "账号授权入口未复用透明 SF Symbol 设置行")
  requireMatch(
    settingSource,
    /function SettingSymbol[\s\S]*?frame=\{\{ width: SETTING_ICON_COLUMN_WIDTH, maxHeight: "infinity", alignment: "center" \}\}/,
    "设置页图标未使用固定宽度对齐槽与整行中线居中",
  )
  requireMatch(settingSource, /SettingActionRow icon="key" iconTint="secondaryLabel" title="账号授权" subtitle="配置 Bangumi 开发者应用并连接账号/, "账号授权说明未与设置行对齐")

  console.log(JSON.stringify({ libraryProgressEntry: true, emptyStateVisible: true, oauthGate: true, settingSymbol: true, settingRowAlignment: true }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
