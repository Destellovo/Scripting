import { FileManager, Path, Storage, UIImage } from "scripting"

export type CustomIcon = {
  id: string
  name: string
  filePath: string
  createdAt: number
}

const ICONS_KEY = "subscription_manager_custom_icons_v2"
const LEGACY_ICONS_KEY = "subscription_manager_custom_icons_v1"
const ICON_DIR_NAME = "subscription_icons"

export async function loadCustomIcons(): Promise<CustomIcon[]> {
  try {
    let value = await Storage.get<CustomIcon[]>(ICONS_KEY, { shared: false })
    if (!Array.isArray(value)) value = await Storage.get<CustomIcon[]>(ICONS_KEY, { shared: true })
    if (!Array.isArray(value)) value = await Storage.get<CustomIcon[]>(LEGACY_ICONS_KEY, { shared: false })
    if (!Array.isArray(value)) value = await Storage.get<CustomIcon[]>(LEGACY_ICONS_KEY, { shared: true })
    return Array.isArray(value)
      ? value.filter(icon => !!icon?.id && !!icon?.filePath && FileManager.existsSync(icon.filePath))
      : []
  } catch (error) {
    console.error("读取本地图标失败", error)
    return []
  }
}

async function saveCustomIcons(icons: CustomIcon[]): Promise<void> {
  await Storage.set(ICONS_KEY, icons, { shared: false })
  await Storage.set(ICONS_KEY, icons, { shared: true })
}

export async function importCustomIcons(): Promise<CustomIcon[]> {
  const paths = await DocumentPicker.pickFiles({
    types: ["public.image"],
    allowsMultipleSelection: true,
    shouldShowFileExtensions: true,
  })
  if (!paths || paths.length === 0) return loadCustomIcons()

  const directory = Path.join(FileManager.appGroupDocumentsDirectory, ICON_DIR_NAME)
  if (!FileManager.existsSync(directory)) FileManager.createDirectorySync(directory, true)

  const icons = await loadCustomIcons()
  for (const source of paths) {
    try {
      const image = UIImage.fromFile(source)
      if (!image) continue
      const originalName = source.split("/").pop() || `icon-${Date.now()}.png`
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const target = Path.join(directory, `${id}-${safeName}`)
      const data = image.toPNGData()
      if (!data) continue
      FileManager.writeAsDataSync(target, data)
      icons.push({
        id,
        name: originalName.replace(/\.[^.]+$/, ""),
        filePath: target,
        createdAt: Date.now(),
      })
    } catch (error) {
      console.error("导入订阅图标失败", error)
    }
  }
  await saveCustomIcons(icons)
  return icons
}

export async function deleteCustomIcon(id: string): Promise<CustomIcon[]> {
  const icons = await loadCustomIcons()
  const target = icons.find(icon => icon.id === id)
  if (target && FileManager.existsSync(target.filePath)) {
    try { FileManager.removeSync(target.filePath) } catch { /* 忽略单个文件删除失败 */ }
  }
  const next = icons.filter(icon => icon.id !== id)
  await saveCustomIcons(next)
  return next
}
