import { Script } from "scripting"
import { bangumiClient } from "../class/bangumi"

async function main() {
  const calendar = await bangumiClient.getCalendar(true)
  const cachedCalendar = await bangumiClient.getCalendar()
  if (calendar !== cachedCalendar) throw new Error("Bangumi 新番时间表短时缓存未复用同一结果")
  if (calendar.days.length !== 7) throw new Error(`Bangumi 新番时间表应固定返回 7 天，实际为 ${calendar.days.length} 天`)
  if (calendar.days.some((day, index) => day.id !== index + 1)) throw new Error("Bangumi 新番时间表未按周一至周日固定排序")
  const items = calendar.days.flatMap((day) => day.items)
  if (!items.length) throw new Error("Bangumi 新番时间表没有可用动画条目")
  if (items.some((item) => !item.id || !(item.nameCn || item.name))) throw new Error("Bangumi 新番时间表包含无效资料条目")

  console.log(JSON.stringify({
    weekdays: calendar.days.length,
    weekdayCounts: calendar.days.map((day) => day.items.length),
    firstItem: items[0].nameCn || items[0].name,
    firstSubjectId: items[0].id,
    cached: calendar === cachedCalendar,
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
