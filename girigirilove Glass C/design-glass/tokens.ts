export type GlassMaterial = "navigation" | "content" | "elevated" | "media"

export type AppTab = "discover" | "search" | "library" | "downloads" | "settings"

export const APP_TABS: ReadonlyArray<{
  id: AppTab
  title: string
  systemImage: string
}> = [
  { id: "discover", title: "浏览", systemImage: "house.fill" },
  { id: "search", title: "搜索", systemImage: "magnifyingglass" },
  { id: "library", title: "片库", systemImage: "rectangle.stack.fill" },
  { id: "downloads", title: "下载", systemImage: "arrow.down.circle.fill" },
  { id: "settings", title: "设置", systemImage: "gear" },
]

export const GIRIGIRI_GLASS_TOKENS = {
  accent: "systemPink",
  background: "systemGroupedBackground",
  spacing: {
    compact: 8,
    regular: 12,
    comfortable: 16,
    section: 24,
  },
  radius: {
    control: 12,
    content: 16,
    media: 18,
  },
  material: {
    navigation: { glass: "clear", interactive: true, shadow: "rgba(72,88,120,0.24)" },
    content: { glass: "clear", interactive: false, shadow: "rgba(72,88,120,0.16)" },
    elevated: { glass: "clear", interactive: true, shadow: "rgba(38,92,160,0.18)" },
    media: { glass: "clear", interactive: false, shadow: "rgba(80,54,120,0.18)" },
  },
} as const

export function glassShape(material: GlassMaterial) {
  if (material === "navigation") return "capsule" as const
  return {
    type: "rect" as const,
    cornerRadius: material === "media"
      ? GIRIGIRI_GLASS_TOKENS.radius.media
      : material === "content"
        ? GIRIGIRI_GLASS_TOKENS.radius.content
        : GIRIGIRI_GLASS_TOKENS.radius.control,
    style: "continuous" as const,
  }
}
