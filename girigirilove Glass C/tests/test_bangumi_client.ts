import { Script } from "scripting"
import { bangumiClient } from "../class/bangumi"

async function main() {
  const matches = await bangumiClient.searchAnime("葬送的芙莉莲")
  if (!matches.length) throw new Error("Bangumi 动画搜索没有返回结果")
  if (!matches.some((item) => item.matchKind === "精确匹配")) throw new Error("Bangumi 标题精确匹配未生效")

  const details = await bangumiClient.getSubjectDetails(matches[0].id)
  const subject = details.subject
  if (!subject.id || !subject.name) throw new Error("Bangumi 条目详情缺少核心字段")
  if (!subject.infobox.length) throw new Error("Bangumi 条目缺少制作与放送资料")
  if (!subject.collection.some((item) => item.count > 0)) throw new Error("Bangumi 条目缺少收藏统计")
  if (!subject.ratingDistribution.some((item) => item.count > 0)) throw new Error("Bangumi 条目缺少评分分布")
  if (!details.episodes.length) throw new Error("Bangumi 条目缺少章节资料")
  if (!details.characters.length) throw new Error("Bangumi 条目缺少主角或配角资料")
  if (details.characters.some((item) => item.relation !== "主角" && item.relation !== "配角")) throw new Error("Bangumi 人物混入非主角/配角关系")
  if (!details.relatedSubjects.length) throw new Error("Bangumi 条目缺少关联作品")
  if (!details.persons.length) throw new Error("Bangumi 条目缺少完整制作人员资料")
  if (details.episodes.length < subject.episodes) throw new Error("Bangumi 本篇章节未全量载入")
  if (!details.episodes.some((item) => item.description)) throw new Error("Bangumi 章节缺少剧情简介")
  if (subject.tags.length <= 16) throw new Error("Bangumi 标签疑似仍被固定数量截断")

  console.log(JSON.stringify({
    id: subject.id,
    name: subject.name,
    nameCn: subject.nameCn,
    score: subject.score,
    rank: subject.rank,
    info: subject.infobox.length,
    episodes: details.episodes.length,
    characters: details.characters.length,
    characterRelations: Array.from(new Set(details.characters.map((item) => item.relation))),
    related: details.relatedSubjects.length,
    persons: details.persons.length,
    tags: subject.tags.length,
    episodesWithDescription: details.episodes.filter((item) => item.description).length,
  }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
