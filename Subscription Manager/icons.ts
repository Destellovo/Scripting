import { FileManager, Path, Storage, UIImage } from "scripting"

export type CustomIcon = {
  id: string
  name: string
  filePath: string
  createdAt: number
}

const ICONS_KEY = "subscription_manager_custom_icons_v1"
const ICON_DIR_NAME = "subscription_icons"

export function loadCustomIcons(): CustomIcon[] {
  try {
    const value = Storage.get<CustomIcon[]>(ICONS_KEY)
    return Array.isArray(value) ? value.filter(icon => !!icon.id && !!icon.filePath && FileManager.existsSync(icon.filePath)) : []
  } catch {
    return []
  }
}

function saveCustomIcons(icons: CustomIcon[]): void {
  Storage.set(ICONS_KEY, icons)
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

  const icons = loadCustomIcons()
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
      icons.push({ id, name: originalName.replace(/\.[^.]+$/, ""), filePath: target, createdAt: Date.now() })
    } catch (error) {
      console.error("导入订阅图标失败", error)
    }
  }
  saveCustomIcons(icons)
  return icons
}

export function deleteCustomIcon(id: string): CustomIcon[] {
  const icons = loadCustomIcons()
  const target = icons.find(icon => icon.id === id)
  if (target && FileManager.existsSync(target.filePath)) {
    try { FileManager.removeSync(target.filePath) } catch { /* 忽略单个文件删除失败 */ }
  }
  const next = icons.filter(icon => icon.id !== id)
  saveCustomIcons(next)
  return next
}
