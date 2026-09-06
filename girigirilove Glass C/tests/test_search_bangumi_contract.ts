import { Script } from "scripting"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

async function main() {
  const searchSource = await FileManager.readAsString(`${projectDirectory}/page/search/index.tsx`)
  const bangumiSource = await FileManager.readAsString(`${projectDirectory}/class/bangumi.ts`)

  requireMatch(searchSource, /type SearchSource = "girigiri" \| "bangumi"/, "搜索页缺少 GiriGiri/Bangumi 来源模型")
  requireMatch(searchSource, /function SearchSourceButton[\s\S]*?glassEffect=\{glassEffectFor/, "搜索来源切换未由原生 Button 持有 Glass")
  requireMatch(searchSource, /function SearchSourceButton[\s\S]*?systemName="checkmark"/, "搜索来源切换缺少非颜色勾选线索")
  requireMatch(searchSource, /function SearchSourceButton[\s\S]*?accessibilityAddTraits=\{selected \? "isSelected" : \[\]\}/, "搜索来源切换缺少辅助功能选中语义")
  requireMatch(searchSource, /source === "bangumi"[\s\S]*?runBangumiSearch/, "搜索页未在 Bangumi 来源调用独立搜索流程")
  requireMatch(searchSource, /bangumiClient\.searchAnime\(normalizedKeyword\)/, "搜索页未调用 Bangumi 动画搜索")
  requireMatch(searchSource, /<BangumiDetailView title=\{route\.match\.nameCn \|\| route\.match\.name\} subjectId=\{route\.match\.id\} \/>/, "Bangumi 搜索结果未按 subject id 直达资料页")
  requireMatch(searchSource, /navigationDestination=\{route \? \{[\s\S]*?onChanged: \(isPresented\) => \{ if \(!isPresented\) setRoute\(null\) \}/, "搜索结果未使用单一状态驱动导航，返回时可能发生连锁")
  if (/<NavigationLink/.test(searchSource)) throw new Error("搜索结果仍包含同一 List 行内的 NavigationLink，可能触发卡片藕连与返回连锁")
  const bangumiRowSource = searchSource.slice(searchSource.indexOf("function BangumiSearchRow"), searchSource.indexOf("const glassFilterMenuStyleProps"))
  if (/chevron\.right/.test(bangumiRowSource)) throw new Error("搜索结果漫画卡片仍显示右侧小箭头")
  requireMatch(searchSource, /function BangumiSearchRow[\s\S]*?match\.score/, "Bangumi 搜索结果未展示评分信息")
  requireMatch(searchSource, /function BangumiSearchRow[\s\S]*?match\.matchKind/, "Bangumi 搜索结果未展示匹配类型")
  requireMatch(searchSource, /source === "girigiri" \? <Section>[\s\S]*?浏览偏好/, "GiriGiri 分类筛选未与 Bangumi 搜索隔离")
  requireMatch(bangumiSource, /async searchAnime\(title: string\)[\s\S]*?filter: \{ type: \[2\] \}/, "Bangumi 搜索客户端未限定动画条目")

  console.log(JSON.stringify({ sourceSwitcher: true, bangumiSearch: true, directSubjectNavigation: true, isolatedCardNavigation: true, searchChevronRemoved: true }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
