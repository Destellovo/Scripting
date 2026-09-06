import { Script } from "scripting"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

async function main() {
  const librarySource = await FileManager.readAsString(`${projectDirectory}/page/saved/index.tsx`)
  const progressSource = await FileManager.readAsString(`${projectDirectory}/page/library/bangumi_progress.tsx`)
  const clientSource = await FileManager.readAsString(`${projectDirectory}/class/bangumi.ts`)

  requireMatch(librarySource, /BangumiProgressView/, "片库缺少 Bangumi 进度页面入口")
  requireMatch(librarySource, /isBangumiAuthenticated/, "片库入口缺少 Bangumi OAuth 登录门禁")
  requireMatch(librarySource, /需要 Bangumi 授权/, "未登录状态缺少授权提示")
  requireMatch(librarySource, /navigationDestination=\{showBangumiProgress[\s\S]*?content: <BangumiProgressView/, "片库未通过实时门禁导航到进度页面")
  requireMatch(librarySource, /function refreshBangumiAuthentication\(\)[\s\S]*?getOAuthStatus\(\)\.isAuthenticated/, "片库缺少 Bangumi OAuth 实时状态刷新")
  requireMatch(librarySource, /onAppear=\{\(\) => \{[\s\S]*?refreshBangumiAuthentication\(\)[\s\S]*?loadData/, "片库返回前台后未刷新 Bangumi OAuth 状态")
  requireMatch(librarySource, /async function openBangumiProgress\(\)[\s\S]*?if \(refreshBangumiAuthentication\(\)\)[\s\S]*?setShowBangumiProgress\(true\)/, "进度入口点击时未实时校验 OAuth 会话")

  requireMatch(progressSource, /PageBackground/, "进度页面缺少根背景")
  if (/HanimeHeroCard/.test(progressSource)) throw new Error("进度页面不应再使用已退场的 Hero 卡")
  requireMatch(progressSource, /counts\.map\(\(status\) =>/, "进度页顶部缺少状态统计摘要")
  requireMatch(progressSource, /<ShelfHeader title="收藏状态"/, "进度页未使用轻量分区标题")
  requireMatch(progressSource, /scrollContentBackground="hidden"/, "进度页面未隐藏 List 背景")
  for (const label of ["想看", "在看", "看过", "搁置", "抛弃"]) {
    requireMatch(progressSource, new RegExp(label), `进度页面缺少收藏状态：${label}`)
  }
  requireMatch(progressSource, /getProgressCollections/, "进度页面缺少收藏列表查询")
  if (/onMarkFullyWatched|全部看过/.test(progressSource)) throw new Error("进度页面不应包含全部看过按钮")
  requireMatch(progressSource, /updateProgress\(/, "进度页面缺少整部番剧状态更新")
  requireMatch(progressSource, /EpisodeProgressRow/, "进度页面缺少单话信息行")
  if (/onUpdateEpisode|updateEpisodeProgress|单话更新失败/.test(progressSource)) throw new Error("单话信息行不应包含状态更新操作")
  const episodeRowSource = progressSource.slice(progressSource.indexOf("function EpisodeProgressRow"), progressSource.indexOf("function ProgressSection"))
  if (/episode\.collection/.test(episodeRowSource)) throw new Error("单话信息行不应单独显示未看或看过状态")
  requireMatch(episodeRowSource, /accessibilityLabel="翻译本话简介"/, "进度管理每话资料缺少翻译按钮")
  requireMatch(episodeRowSource, /glassEffect=\{glassEffectFor\("content", "capsule", true\)\}/, "进度管理每话翻译按钮未使用小 Glass")
  requireMatch(progressSource, /translationHost=\{translation\}/, "进度管理 List 未挂载系统翻译宿主")
  requireMatch(progressSource, /extractBangumiTranslatableText\(episode\.description\)/, "进度管理翻译前未提取简介原文")
  requireMatch(progressSource, /translation\.translate\(\{ text: original\.text, source: original\.source, target: "zh" \}\)/, "进度管理未调用系统翻译并指定中文目标")
  requireMatch(progressSource, /Navigation\.present\([\s\S]*?<TranslationModal/, "进度管理翻译未复用完整可滚动翻译弹窗")
  requireMatch(progressSource, /BackgroundThemeProvider/, "进度管理翻译弹窗未接入独立主题树")
  requireMatch(progressSource, /getProgressEpisodes/, "进度页面缺少单话列表加载")
  requireMatch(progressSource, /单话明细|剧集明细|剧集资料/, "进度条目缺少剧集展开语义")
  requireMatch(progressSource, /const episodeCount = props\.item\.totalEpisodes > 0 \? `共 \$\{props\.item\.totalEpisodes\} 话`/, "进度条目摘要未只显示番剧总话数")
  if (/props\.item\.watchedEpisodes[\s\S]*?<Text font="caption" foregroundStyle="secondaryLabel">/.test(progressSource)) throw new Error("进度条目摘要不应显示单话观看进度")
  requireMatch(progressSource, /navigationDestination=\{detailSubject[\s\S]*?content: <BangumiDetailView/, "进度条目未在当前导航栈中打开既有全量 Bangumi 详情")
  if (/Navigation\.present\(\{\s*element:\s*<BangumiDetailView/.test(progressSource)) throw new Error("进度条目不应以底部模态页面打开 Bangumi 详情")
  requireMatch(progressSource, /GlassSurface material="content"/, "进度页面缺少内容 Glass")

  requireMatch(clientSource, /getProgressCollections\(type\?/, "客户端缺少收藏进度查询 API")
  requireMatch(clientSource, /since: "0"/, "收藏分页缺少官方 since 参数")
  requireMatch(clientSource, /URLSearchParams/, "客户端缺少收藏分页查询参数")
  requireMatch(clientSource, /p1\/collections\/subjects/, "客户端未调用 Bangumi 收藏列表接口")
  requireMatch(clientSource, /p1\/subjects\/\$\{subjectId\}\/episodes/, "客户端缺少 Bangumi Beta 单话查询接口")
  requireMatch(clientSource, /p1\/collections\/subjects\/\$\{subjectId\}/, "客户端缺少官方条目收藏更新接口")
  requireMatch(clientSource, /method: "PUT", body/, "条目收藏更新未使用官方 PUT 语义")
  if (/v0\/users\/\-\/collections/.test(clientSource)) throw new Error("客户端不应继续使用旧 v0 收藏更新回退")
  requireMatch(clientSource, /const BANGUMI_PROGRESS_TYPES/, "客户端缺少状态枚举归一化")
  requireMatch(clientSource, /collection: BangumiEpisodeCollectionStatus/, "客户端缺少单话收藏状态字段")
  requireMatch(clientSource, /\{ type: 2, label: "看过" \}/, "Bangumi 状态 2 未映射为看过")
  requireMatch(clientSource, /\{ type: 3, label: "在看" \}/, "Bangumi 状态 3 未映射为在看")

  console.log(JSON.stringify({ libraryEntry: true, oauthGate: true, progressGlass: true, collectionQuery: true, collectionUpdate: true, detailNavigation: true }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
