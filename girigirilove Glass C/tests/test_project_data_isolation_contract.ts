import { Script } from "scripting"

const root = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  const [settingSource, databaseSource, downloadSource, scriptJSON] = await Promise.all([
    FileManager.readAsString(`${root}/class/setting.ts`),
    FileManager.readAsString(`${root}/class/hanime_database.ts`),
    FileManager.readAsString(`${root}/class/hanime_download_manager.ts`),
    FileManager.readAsString(`${root}/script.json`),
  ])

  assert(settingSource.includes('GIRIGIRI_GLASS_C_DATA_DIRECTORY = "girigirilove-glass-c"'), "缺少 GiriGiri Glass C 独占数据目录")
  assert(settingSource.includes('GIRIGIRI_GLASS_C_STORAGE_LOCATION_KEY = "girigirilove_glass_c_storage_location_v1"'), "存储位置 key 未按本项目隔离")
  assert(!settingSource.includes('Path.join(FileManager.appGroupDocumentsDirectory, "GiriGiri")'), "不得继续使用跨项目共享的 appGroup GiriGiri 目录")
  assert(!settingSource.includes('Path.join(FileManager.iCloudDocumentsDirectory, "GiriGiri")'), "不得继续使用跨项目共享的 iCloud GiriGiri 目录")
  assert(!settingSource.includes('private LOCATION_KEY = "storage_location"'), "不得继续使用跨项目共享的 storage_location key")

  assert(databaseSource.includes('SQLite.open(Path.join(setting.getBasePath(), "hanime.db"))'), "收藏与历史数据库必须从本项目独占基础目录打开")
  assert(downloadSource.includes('Path.join(setting.getBasePath(), "downloads")'), "下载文件必须写入本项目独占基础目录")
  assert(downloadSource.includes('Path.join(FileManager.documentsDirectory, "GiriGiri Glass C", "Downloads")'), "文件 App 导出目录必须使用本项目独占名称")
  assert(!downloadSource.includes('Path.join(FileManager.documentsDirectory, "GiriGiri", "Downloads")'), "文件 App 导出不得继续与其他 GiriGiri 项目混放")
  assert(databaseSource.includes("WHERE is_favorite = 1"), "收藏读取必须由本项目数据库提供")
  assert(databaseSource.includes("WHERE last_watched_at IS NOT NULL"), "历史读取必须由本项目数据库提供")
  assert(databaseSource.includes("FROM hanime_download"), "下载记录必须由本项目数据库提供")

  const metadata = JSON.parse(scriptJSON)
  assert(metadata.version === "5.1.1", `版本号应为 5.1.1，实际为 ${metadata.version}`)

  console.log(JSON.stringify({
    dataDirectory: "girigirilove-glass-c",
    isolatedDomains: ["favorites", "history", "download records", "download files", "pending downloads"],
    importsLegacySharedData: false,
    version: metadata.version,
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
