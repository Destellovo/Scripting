import { Path } from "scripting"

export type StorageLocation = "appGroup" | "iCloud"

/**
 * GiriGiri Glass C 独占的数据命名空间。
 * 不读取、复制或迁移旧的共享 `GiriGiri` 目录，避免其他项目的收藏、历史和下载污染本项目。
 */
export const GIRIGIRI_GLASS_C_DATA_DIRECTORY = "girigirilove-glass-c"
export const GIRIGIRI_GLASS_C_STORAGE_LOCATION_KEY = "girigirilove_glass_c_storage_location_v1"

class Setting {
  private readonly LOCATION_KEY = GIRIGIRI_GLASS_C_STORAGE_LOCATION_KEY
  location: StorageLocation = this.readLocation()

  private readLocation(): StorageLocation {
    const value = Storage.get(this.LOCATION_KEY)
    return value === "iCloud" ? "iCloud" : "appGroup"
  }

  getBasePath(): string {
    return this.location === "iCloud"
      ? Path.join(FileManager.iCloudDocumentsDirectory, GIRIGIRI_GLASS_C_DATA_DIRECTORY)
      : Path.join(FileManager.appGroupDocumentsDirectory, GIRIGIRI_GLASS_C_DATA_DIRECTORY)
  }

  async setLocation(newLocation: StorageLocation): Promise<void> {
    if (this.location === newLocation) return

    const previousLocation = this.location
    const oldPath = this.getBasePath()
    this.location = newLocation
    const newPath = this.getBasePath()

    try {
      await this.migrateFiles(oldPath, newPath)
      Storage.set(this.LOCATION_KEY, newLocation)
    } catch (error) {
      this.location = previousLocation
      throw error
    }
  }

  private async migrateFiles(oldPath: string, newPath: string): Promise<void> {
    if (!(await FileManager.exists(oldPath))) return

    await FileManager.createDirectory(newPath, true)

    const items = await FileManager.readDirectory(oldPath)
    for (const item of items) {
      const oldItemPath = Path.join(oldPath, item)
      const newItemPath = Path.join(newPath, item)

      if (await FileManager.isDirectory(oldItemPath)) {
        await this.copyDirectory(oldItemPath, newItemPath)
      } else {
        await FileManager.copyFile(oldItemPath, newItemPath)
      }
    }

    await FileManager.remove(oldPath)
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await FileManager.createDirectory(dest, true)
    const items = await FileManager.readDirectory(src)

    for (const item of items) {
      const srcPath = Path.join(src, item)
      const destPath = Path.join(dest, item)

      if (await FileManager.isDirectory(srcPath)) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await FileManager.copyFile(srcPath, destPath)
      }
    }
  }
}

export const setting = new Setting()