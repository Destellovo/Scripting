import { Script } from "scripting"
import { extractBangumiTranslatableText } from "../class/bangumi_translation"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

function requireText(source: string, text: string, message: string) {
  if (!source.includes(text)) throw new Error(message)
}

async function main() {
  const clientSource = await FileManager.readAsString(`${projectDirectory}/class/bangumi.ts`)
  const pageSource = await FileManager.readAsString(`${projectDirectory}/page/hanime/bangumi_detail.tsx`)
  const detailSource = await FileManager.readAsString(`${projectDirectory}/page/hanime/video_detail.tsx`)

  const mixedJapanese = extractBangumiTranslatableText("中文简介。\n\n[简介原文]\nこれは日本語の紹介です。")
  if (mixedJapanese?.text !== "これは日本語の紹介です。" || mixedJapanese.source !== "ja") {
    throw new Error("Bangumi 混合中日简介未只提取日文原文")
  }
  const mixedEnglish = extractBangumiTranslatableText("中文简介。\n\nOriginal synopsis\nAn English summary.")
  if (mixedEnglish?.text !== "Original synopsis\nAn English summary." || mixedEnglish.source !== "en") {
    throw new Error("Bangumi 混合中英简介未只提取英文原文")
  }
  if (extractBangumiTranslatableText("这是一段纯中文简介。") !== null) {
    throw new Error("Bangumi 纯中文简介不应调用系统翻译")
  }
  const originalJapanese = extractBangumiTranslatableText("これは日本語だけの紹介です。")
  if (originalJapanese?.text !== "これは日本語だけの紹介です。" || originalJapanese.source !== "ja") {
    throw new Error("Bangumi 纯日文简介未保留完整原文")
  }

  requireMatch(clientSource, /filter: \{ type: \[2\] \}/, "Bangumi 搜索未限定动画条目")
  requireMatch(clientSource, /isExactTitleMatch/, "Bangumi 索引缺少标题精确匹配")
  requireMatch(detailSource, /destination=\{<BangumiDetailView title=\{item\.title \|\| displayTitle\}[\s\S]*?onSubjectSelected=\{selectBangumiSubject\}/, "Giri 视频详情未接入可持久绑定的 Bangumi 条目匹配")
  requireText(detailSource, "function BangumiVideoProgressPanel", "Giri 视频详情缺少 Bangumi 账号进度联动面板")
  requireText(detailSource, "Bangumi 进度联动", "Giri 视频详情缺少明确的账号联动文案")
  requireMatch(detailSource, /BANGUMI_STATUS_ACTIONS[\s\S]*?"想看"[\s\S]*?type: 1[\s\S]*?"在看"[\s\S]*?type: 3[\s\S]*?"看过"[\s\S]*?type: 2[\s\S]*?"搁置"[\s\S]*?type: 4[\s\S]*?"抛弃"[\s\S]*?type: 5/, "Giri 视频详情的五状态未使用官方 Bangumi 类型编号")
  requireMatch(detailSource, /updateBangumiProgress[\s\S]*?bangumiClient\.updateProgress\(bangumiSubject\.id, type\)/, "Giri 视频详情未通过共享账号客户端同步整部收藏状态")
  requireMatch(detailSource, /getProgressForSubject\(subjectId\)/, "Giri 视频详情未读取当前登录账号的条目状态")
  requireText(detailSource, "<BangumiOAuthView />", "Giri 视频详情缺少未登录授权入口")
  requireMatch(clientSource, /BANGUMI_GIRIGIRI_SUBJECT_KEY_PREFIX[\s\S]*?getLinkedSubjectId[\s\S]*?linkGirigiriSubject[\s\S]*?unlinkGirigiriSubject/, "客户端缺少 Giri videoCode 到 Bangumi subjectId 的持久绑定与解绑")
  requireMatch(clientSource, /unlinkGirigiriSubject[\s\S]*?Storage\.remove\(`\$\{BANGUMI_GIRIGIRI_SUBJECT_KEY_PREFIX\}\$\{normalizedCode\}`\)/, "重新匹配未删除旧持久映射")
  requireMatch(pageSource, /onSubjectSelected\?\.\(nextDetails\.subject\)/, "Bangumi 条目页未将用户选择结果回传给 Giri 视频详情")
  requireText(pageSource, "<PageBackground />", "Bangumi 内嵌页未复用根背景")
  requireText(pageSource, "function BangumiTransparentSection", "Bangumi 缺少透明 Section 容器")
  requireText(pageSource, "listRowBackground={<></>}", "Bangumi 分区未统一收口到透明 Section 行背景")
  requireText(pageSource, "listRowSeparator=\"hidden\"", "Bangumi 分区未隐藏系统分隔线")
  requireMatch(pageSource, /<GlassSurface material="media">/, "Bangumi 条目 Hero 未使用共享 Glass surface")
  requireText(pageSource, "title=\"重新选择匹配条目\"", "Bangumi 详情缺少纠正错误匹配的入口")
  requireMatch(pageSource, /loadMatches\(requestId = \+\+requestIdRef\.current, allowAutomaticExactMatch = true\)/, "Bangumi 匹配未区分初次自动匹配与主动重新选择")
  requireMatch(pageSource, /allowAutomaticExactMatch && exactMatches\.length === 1/, "Bangumi 精确匹配自动跳转缺少主动重匹配门禁")
  requireMatch(pageSource, /function beginManualRematch\(\)[\s\S]*?manualMatchingRef\.current = true[\s\S]*?onSubjectCleared\?\.\(\)[\s\S]*?loadMatches\(undefined, false\)/, "主动重新匹配未先解绑旧条目并保持手动候选模式")
  requireMatch(pageSource, /if \(!subjectId && manualMatchingRef\.current\) return/, "父页面清空旧条目后候选页会重新触发自动匹配")
  requireMatch(pageSource, /onChooseAgain=\{beginManualRematch\}/, "重新匹配按钮未进入即时解绑事务")
  requireMatch(pageSource, /BangumiMatchList[\s\S]*?onSelect=\{\(match\) => \{ void loadSubject\(match\.id, undefined, true\) \}\}/, "候选条目选择未作为用户主动选择加载")
  requireMatch(pageSource, /if \(manualSelection\) manualMatchingRef\.current = false/, "用户选择新条目后未退出手动匹配模式")
  requireMatch(detailSource, /function clearBangumiSubject\(\)[\s\S]*?unlinkGirigiriSubject\(item\.videoCode\)[\s\S]*?setBangumiSubject\(null\)[\s\S]*?setBangumiStatus\(null\)/, "Giri 视频详情未在重匹配时立即清空旧关联与进度")
  requireMatch(detailSource, /onSubjectCleared=\{clearBangumiSubject\}/, "Bangumi 资料页解绑事件未传回 Giri 视频详情")
  const relatedRowSource = pageSource.slice(pageSource.indexOf("function RelatedSubjectRow"), pageSource.indexOf("function BangumiSubjectRow"))
  requireMatch(relatedRowSource, /<Text font="subheadline" foregroundStyle="secondaryLabel"[\s\S]*?\{subject\.relation\}<\/Text>/, "关联作品关系文字未与作品标题共用左轴")
  requireMatch(relatedRowSource, /<CenteredSymbol systemName="link"[\s\S]*?slotWidth=\{28\}/, "关联作品右侧未使用透明链接符号")
  if (/TransparentSymbolText|chevron\.right/.test(relatedRowSource)) throw new Error("关联作品行不应保留左侧关系图标或右侧箭头")
  requireMatch(clientSource, /getSubjectDetails[\s\S]*?v0\/episodes\?subject_id=/, "Bangumi 聚合详情缺少公开章节接口")
  requireMatch(clientSource, /v0\/subjects\/\$\{subjectId\}\/characters/, "Bangumi 聚合详情缺少公开角色接口")
  requireMatch(clientSource, /v0\/subjects\/\$\{subjectId\}\/persons/, "Bangumi 聚合详情缺少公开制作人员接口")
  requireMatch(clientSource, /function getAllEpisodes[\s\S]*?limit = 100[\s\S]*?maxPages = 20[\s\S]*?seenEpisodeIds[\s\S]*?!uniquePageItems\.length/, "Bangumi 剧集分页缺少页数上限、ID 去重或无进展终止")
  if (/function getAllEpisodes[\s\S]*?while \(true\)/.test(clientSource)) throw new Error("Bangumi 剧集分页不应使用无上限 while true")
  requireMatch(clientSource, /const searchRequests = new Map[\s\S]*?const subjectRequests = new Map[\s\S]*?const subjectDetailRequests = new Map/, "Bangumi 搜索与详情请求缺少 in-flight 去重")
  requireMatch(clientSource, /getProgressForSubject[\s\S]*?p1\/collections\/subjects\/\$\{subjectId\}[\s\S]*?notFoundAsNull: true/, "单条进度读取未使用单条收藏接口")
  const singleProgressSource = clientSource.slice(clientSource.indexOf("async getProgressForSubject"), clientSource.indexOf("async updateProgress"))
  if (/getProgressCollections/.test(singleProgressSource)) throw new Error("单条进度读取不应扫描全量收藏")
  requireMatch(detailSource, /bangumiLinkRequestRef[\s\S]*?existing\?\.key === requestKey[\s\S]*?return existing\.request/, "Giri 视频详情自动匹配缺少同请求并发保护")
  const detailOnAppearSource = detailSource.slice(detailSource.indexOf("onAppear={() =>"), detailSource.indexOf("navigationDestination="))
  if (/loadBangumiLink/.test(detailOnAppearSource)) throw new Error("视频详情 onAppear 不应重复触发 Bangumi 自动匹配")
  requireMatch(pageSource, /requestIdRef[\s\S]*?loadedSubjectIdRef[\s\S]*?loadedSubjectIdRef\.current === subjectId/, "Bangumi 资料页缺少过期请求和同条目重载保护")
  requireMatch(pageSource, /const fullInfo = subject\.infobox\.filter[\s\S]*?fullInfo\.map/, "Bangumi 制作与放送未展示完整 infobox")

  const episodeSource = pageSource.slice(pageSource.indexOf("function EpisodeRow"), pageSource.indexOf("function episodeStaffFor"))
  requireMatch(episodeSource, /episode\.description[\s\S]*?multilineTextAlignment="leading"/, "Bangumi 章节未展示完整公开剧情简介")
  if (/lineLimit=/.test(episodeSource)) throw new Error("Bangumi 每话内容不应使用固定 lineLimit 截断")
  requireText(episodeSource, "<GlassSurface material=\"content\" shape={{ type: \"rect\", cornerRadius: 18, style: \"continuous\" }}>", "每话未恢复独立自适应大 Glass")
  requireMatch(episodeSource, /glassEffect=\{glassEffectFor\("content", "capsule", true\)\}/, "每话大 Glass 未提供右上角小 Glass 翻译按钮")
  requireMatch(episodeSource, /padding=\{\{ leading: 56 \}\}[\s\S]*?staff\.length[\s\S]*?episode\.description/, "每话制作信息和简介未与标题时间内容列对齐")
  requireText(episodeSource, "accessibilityLabel=\"翻译本话简介\"", "每话翻译按钮缺少明确的辅助功能名称")
  requireText(pageSource, "function episodeStaffFor", "每话未按章节匹配制作人员信息")
  requireText(pageSource, "episodeStaffFor(episode, persons)", "每话未调用章节制作人员匹配")

  requireMatch(pageSource, /function TranslationModal[\s\S]*?原文[\s\S]*?系统翻译[\s\S]*?ScrollView/, "Bangumi 翻译未使用完整可滚动弹窗")
  requireMatch(pageSource, /presentTranslation[\s\S]*?Navigation\.present[\s\S]*?BackgroundThemeProvider/, "Bangumi 翻译弹窗未复用独立主题渲染树")
  requireText(pageSource, "extractBangumiTranslatableText(summary)", "Bangumi 翻译前未提取简介原文")
  requireMatch(pageSource, /translation\.translate\(\{[\s\S]*?text: original\.text,[\s\S]*?source: original\.source,[\s\S]*?target: "zh"/, "Bangumi 翻译未使用提取后的原文和明确源语言")
  requireText(pageSource, "该简介没有可翻译的原文部分。", "Bangumi 纯中文简介缺少明确反馈")
  requireText(pageSource, "<TranslationModal title={title} sourceText={sourceText} translatedText={translatedText} />", "翻译弹窗缺少完整译文面板")
  requireText(pageSource, "accessibilityLabel=\"关闭翻译弹窗\"", "翻译弹窗缺少独立关闭按钮")
  requireText(pageSource, "条目简介翻译", "条目简介未接入同款翻译弹窗")
  requireText(pageSource, "accessibilityLabel=\"翻译条目简介\"", "条目简介缺少翻译按钮")
  if (/translatedEpisodes|translatedDescription|收回本话翻译/.test(pageSource)) throw new Error("翻译结果不应再次塞回每话大 Glass")

  requireMatch(pageSource, /function CenteredSymbol[\s\S]*?slotWidth = 40[\s\S]*?alignment: "center"[\s\S]*?width: iconWidth[\s\S]*?alignment: "center"/, "资料页 SF Symbol 未统一以 Glass 中线居中")
  if (/function CenteredSymbol[\s\S]*?height: iconHeight/.test(pageSource)) throw new Error("资料页 SF Symbol 仍使用人为固定高度槽")
  requireMatch(pageSource, /const characterCardHeight = characters\.length \? Math\.max\(\.\.\.characters\.map\(characterCardHeightFor\)\) : 0/, "角色横向 Glass 卡未按最大内容需求计算统一高度")
  requireMatch(pageSource, /function characterCardHeightFor[\s\S]*?const contentHeight =[\s\S]*?return contentHeight \+ 24/, "角色横向 Glass 卡高度未只计算一次总 padding")
  requireMatch(pageSource, /isLead[\s\S]*?star\.fill[\s\S]*?person\.2\.fill/, "角色卡主配角标识未使用和谐的关系图标")
  requireMatch(pageSource, /function DetailSectionHeader[\s\S]*?<ShelfHeader[\s\S]*?title=\{title\}[\s\S]*?caption=\{subtitle\}[\s\S]*?chevron\.up\.circle/, "Bangumi 分区标题未复用 C 项目统一 ShelfHeader")
  requireMatch(pageSource, /function BangumiRelatedShelfCard[\s\S]*?<PosterCover url=\{subject\.imageUrl\} size="compact" \/>/, "Bangumi 关联动画未使用统一紧凑海报货架卡")
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
