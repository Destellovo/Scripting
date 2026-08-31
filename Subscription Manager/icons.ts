import { FileManager, Path } from "scripting"

export type CustomIcon = { id: string; name: string; filePath: string; createdAt: number }
const ICONS_KEY = "subscription_manager_custom_icons_v4"
const ICON_DIR_NAME = "subscription_icons"

async function readIcons(): Promise<CustomIcon[]> {
  try {
    const privateValue = await Storage.get<CustomIcon[]>(ICONS_KEY, { shared: false })
    if (Array.isArray(privateValue)) return privateValue
  } catch { /* 尝试共享域 */ }
  try {
    const sharedValue = await Storage.get<CustomIcon[]>(ICONS_KEY, { shared: true })
    return Array.isArray(sharedValue) ? sharedValue : []
  } catch { return [] }
}
async function writeIcons(icons: CustomIcon[]): Promise<void> {
  await Storage.set(ICONS_KEY, icons, { shared: false })
  try { await Storage.set(ICONS_KEY, icons, { shared: true }) } catch { /* 私有域已保存 */ }
}
export async function loadCustomIcons(): Promise<CustomIcon[]> {
  const icons = await readIcons()
  return icons.filter(icon => !!icon?.id && !!icon?.filePath && FileManager.existsSync(icon.filePath))
}
export async function importCustomIcons(): Promise<CustomIcon[]> {
  const paths = await DocumentPicker.pickFiles({ types: ["public.image"], allowsMultipleSelection: true, shouldShowFileExtensions: true })
  if (!paths.length) return loadCustomIcons()
  const dir = Path.join(FileManager.appGroupDocumentsDirectory, ICON_DIR_NAME)
  if (!FileManager.existsSync(dir)) FileManager.createDirectorySync(dir, true)
  const icons = await loadCustomIcons()
  for (const source of paths) {
    try {
      const data = Data.fromFile(source)
      if (!data) continue
      const original = source.split("/").pop() || `icon-${Date.now()}.png`
      const safe = original.replace(/[^a-zA-Z0-9._-]/g, "_")
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const target = Path.join(dir, `${id}-${safe}`)
      FileManager.writeAsDataSync(target, data)
      icons.push({ id, name: original.replace(/\.[^.]+$/, ""), filePath: target, createdAt: Date.now() })
    } catch (error) { console.error("导入订阅图标失败", error) }
  }
  await writeIcons(icons)
  return icons
}
export async function deleteCustomIcon(id: string): Promise<CustomIcon[]> {
  const icons = await loadCustomIcons()
  const target = icons.find(icon => icon.id === id)
  if (target && FileManager.existsSync(target.filePath)) {
    try { FileManager.removeSync(target.filePath) } catch { /* 忽略文件删除失败 */ }
  }
  const next = icons.filter(icon => icon.id !== id)
  await writeIcons(next)
  return next
}
