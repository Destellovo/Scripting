import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [databaseSource, savedSource] = await Promise.all([
    FileManager.readAsString(`${root}/class/hanime_database.ts`),
    FileManager.readAsString(`${root}/page/saved/index.tsx`),
  ])

  const clearFavoritesStart = databaseSource.indexOf("async clearFavorites(): Promise<void>")
  const clearHistoryStart = databaseSource.indexOf("async clearHistory(): Promise<void>", clearFavoritesStart)
  assert(clearFavoritesStart >= 0 && clearHistoryStart > clearFavoritesStart, "数据库缺少独立 clearFavorites 接口")
  const clearFavoritesSource = databaseSource.slice(clearFavoritesStart, clearHistoryStart)
  assert(clearFavoritesSource.includes("SET is_favorite = 0"), "清空收藏必须批量取消收藏标记")
  assert(clearFavoritesSource.includes("WHERE is_favorite = 1"), "清空收藏必须只修改当前收藏记录")
  assert(!clearFavoritesSource.includes("DELETE FROM hanime_video"), "清空收藏不得删除视频父记录")
  assert(!clearFavoritesSource.includes("hanime_download"), "清空收藏不得修改离线文件记录")
  assert(!clearFavoritesSource.includes("last_watched_at"), "清空收藏不得修改观看历史")

  assert(savedSource.includes("async function clearFavorites()"), "片库页缺少清空收藏动作")
  assert(savedSource.includes("await hanimeDatabase.clearFavorites()"), "片库页未调用数据库清空收藏接口")
  assert(savedSource.includes("await loadData()"), "清空收藏后必须刷新列表与统计")
  assert(savedSource.includes('<Button title="清空收藏"') && savedSource.includes('disabled action={() => {}}'), "清空收藏菜单缺少明确的确认标题")
  assert(savedSource.includes("观看历史、续播记录与本机离线文件会保留"), "确认信息必须说明保留观看历史、续播记录与离线文件")
  assert(!savedSource.includes("Dialog.confirm"), "清空收藏必须由原触发菜单直接确认，不得嵌套独立确认弹窗")
  assert(savedSource.includes('role="destructive"'), "清空收藏入口必须使用破坏性动作语义")
  assert(savedSource.includes('title="清空全部收藏"') && savedSource.includes('systemImage="heart.slash"'), "收藏区缺少带非颜色线索的清空入口")

  console.log(JSON.stringify({
    clearFavorites: "confirmed destructive action",
    mutation: "favorite flags only",
    preserved: ["watch history", "episode resume", "offline files"],
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
