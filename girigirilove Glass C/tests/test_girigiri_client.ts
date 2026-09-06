import { Script } from "scripting"
import { hanimeClient } from "../class/hanime"

async function main() {
  const home = await hanimeClient.getHomePage()
  const cachedHome = await hanimeClient.getHomePage()
  if (home !== cachedHome) throw new Error("首页短时缓存未生效")
  if (home.banners.length < 2) throw new Error(`官网焦点推荐应包含多个轮播项，实际为 ${home.banners.length} 项`)
  if (new Set(home.banners.map((banner) => banner.videoCode || `${banner.title}|${banner.picUrl}`)).size !== home.banners.length) {
    throw new Error("官网焦点推荐包含重复轮播项")
  }
  console.log(JSON.stringify({
    sections: home.sections.length,
    firstSection: home.sections[0]?.title,
    firstCount: home.sections[0]?.items.length || 0,
    banners: home.banners.length,
    firstBanner: home.banners[0]?.title || "",
  }))

  const schedule = await hanimeClient.getWeekdaySchedule()
  const cachedSchedule = await hanimeClient.getWeekdaySchedule()
  if (schedule !== cachedSchedule) throw new Error("新番时间表短时缓存未生效")
  if (schedule.days.length !== 7) throw new Error(`新番时间表应固定返回 7 天，实际为 ${schedule.days.length} 天`)
  if (schedule.days.some((day, index) => day.id !== index + 1)) throw new Error("新番时间表未按周一至周日固定排序")
  const scheduledItems = schedule.days.flatMap((day) => day.items)
  if (scheduledItems.length === 0) throw new Error("新番时间表没有解析到任何官网条目")
  if (scheduledItems.some((item) => !/^\d+$/.test(item.videoCode))) throw new Error("新番时间表包含无效的 GiriGiri 番剧 ID")
  const ratedItems = scheduledItems.filter((item) => item.ageRating)
  if (ratedItems.length === 0) throw new Error("新番时间表没有解析到官网番剧分级")
  if (ratedItems.some((item) => !/^(普通級|PG-12|R-15|R-18)$/.test(item.ageRating || ""))) {
    throw new Error("新番时间表包含未识别的官网番剧分级")
  }
  console.log(JSON.stringify({
    weekdays: schedule.days.length,
    weekdayCounts: schedule.days.map((day) => day.items.length),
    firstScheduled: scheduledItems[0]?.title || "",
    firstScheduledCode: scheduledItems[0]?.videoCode || "",
    ratedItems: ratedItems.length,
    ratings: Array.from(new Set(ratedItems.map((item) => item.ageRating))),
  }))

  const search = await hanimeClient.searchVideos({ query: "史莱姆" })
  console.log(JSON.stringify({ searchCount: search.length, firstSearch: search[0]?.title || "" }))

  const first = home.sections.flatMap((section) => section.items)[0] || search[0]
  if (first?.videoCode) {
    const detail = await hanimeClient.getVideo(first.videoCode)
    console.log(JSON.stringify({ title: detail.title, episodes: detail.videoUrls.length, watchUrl: detail.watchUrl }))
  }
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
