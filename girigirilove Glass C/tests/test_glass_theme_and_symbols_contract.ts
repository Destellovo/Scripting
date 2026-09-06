import { Script } from "scripting"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

async function main() {
  const appearance = await FileManager.readAsString(`${projectDirectory}/page/setting/background-appearance-editor.tsx`)
  const backgroundTheme = await FileManager.readAsString(`${projectDirectory}/design-glass/background-theme.tsx`)
  const library = await FileManager.readAsString(`${projectDirectory}/page/library/index.tsx`)
  const schedule = await FileManager.readAsString(`${projectDirectory}/page/library/weekday_schedule.tsx`)
  const search = await FileManager.readAsString(`${projectDirectory}/page/search/index.tsx`)
  const detail = await FileManager.readAsString(`${projectDirectory}/page/hanime/video_detail.tsx`)
  const oauth = await FileManager.readAsString(`${projectDirectory}/page/setting/bangumi_oauth.tsx`)

  if (/presetThemesExpanded|BACKGROUND_THEMES|BackgroundThemeButton|展开预设|收起预设/.test(appearance)) throw new Error("设置页不得保留预设主题入口或死代码")
  if (/樱桃绯红|柔粉渐变|暖白瓷|灰雾鼠尾草|雾蓝|灰紫云|海岸蓝青|紫暮星云|青岚薄荷|琥珀日落|石墨夜色|原生玻璃/.test(backgroundTheme)) throw new Error("主题 Provider 不得保留项目预设主题定义")
  requireMatch(backgroundTheme, /export type BackgroundThemeID = "custom" \| "customGradient"/, "主题 ID 必须仅保留自定义纯色与渐变")
  requireMatch(appearance, /<ShelfHeader title="外观" caption="自定义纯色、渐变与个人主题" \/>/, "外观标题必须与下方设置分区统一复用 ShelfHeader")
  requireMatch(appearance, /<SaveCurrentThemeMenu onSave=\{saveCustomTheme\} \/>/, "移除预设后仍须保留用户主题保存入口")
  requireMatch(
    library,
    /calendar\.badge\.clock"[^>]*foregroundStyle="(?:label|secondaryLabel)"[^>]*frame=\{\{ width: \d+, maxHeight: "infinity" \}\}/,
    "首页时间表普通行图标不是居中对齐的中性透明 Symbol",
  )
  const scheduleOverviewStart = schedule.indexOf("function ScheduleOverviewCard")
  const scheduleOverviewEnd = schedule.indexOf("function ScheduleSourceButton", scheduleOverviewStart)
  if (scheduleOverviewStart < 0 || scheduleOverviewEnd < 0) throw new Error("未找到时间表品牌 Hero")
  if (/<Image\b/.test(schedule.slice(scheduleOverviewStart, scheduleOverviewEnd))) throw new Error("时间表品牌 Hero 不应包含 SF Symbol")
  requireMatch(search, /Image systemName=\{icon\} frame=\{\{ width: 22 \}\} foregroundStyle="secondaryLabel"/, "搜索筛选普通行图标不是中性透明 Symbol")
  requireMatch(detail, /captions\.bubble" font="caption" foregroundStyle="secondaryLabel" frame=\{\{ width: 20 \}\}/, "字幕信息行图标不是中性透明 Symbol")
  requireMatch(detail, /doc\.on\.doc" font="body" foregroundStyle="secondaryLabel" frame=\{\{ width: 24 \}\}/, "复制标题普通行图标不是中性透明 Symbol")
  requireMatch(appearance, /plus\.circle" frame=\{\{ width: 22 \}\} foregroundStyle="secondaryLabel"/, "保存主题普通行图标不是中性透明 Symbol")
  requireMatch(oauth, /<PageBackground \/>/, "Bangumi 授权页缺少唯一 PageBackground owner")
  requireMatch(oauth, /scrollContentBackground="hidden"/, "Bangumi 授权页未隐藏 List 背景")
  requireMatch(oauth, /listRowBackground=/, "Bangumi 授权页缺少透明行背景")
  requireMatch(oauth, /listRowSeparator="hidden"/, "Bangumi 授权页未隐藏行分隔线")
  if (/toolbar=\{\{ topBarLeading:/.test(oauth)) throw new Error("Bangumi 授权页不应叠加手动返回按钮")

  console.log(JSON.stringify({ presetThemesRemoved: true, customThemesRetained: true, transparentSymbolRows: ["library", "search", "detail", "appearance"], iconFreeHeroes: ["schedule"], bangumiOAuthPageBackground: true }))
}

main().catch((error) => { console.error(error); throw error }).finally(() => { Script.exit() })
