import {
  createContext,
  type Color,
  type ColorScheme,
  type DynamicShapeStyle,
  gradient,
  type KeywordPoint,
  type ShapeStyle,
  useContext,
  useState,
} from "scripting"

export type BackgroundThemeID = "custom" | "customGradient"

type BackgroundThemeBase = { id: BackgroundThemeID; title: string }
export type BackgroundTheme = BackgroundThemeBase & ({
  kind: "solid"
  lightColor: Color
  darkColor: Color
} | {
  kind: "gradient"
  lightColors: Color[]
  darkColors: Color[]
  startPoint: KeywordPoint
  endPoint: KeywordPoint
})

export const DEFAULT_BACKGROUND_THEME_ID: BackgroundThemeID = "customGradient"
export const BACKGROUND_THEME_STORAGE_KEY = "girigiri_glass_background_theme_v1"
export const CUSTOM_BACKGROUND_COLOR_STORAGE_KEY = "girigiri_glass_custom_background_color_v1"
export const CUSTOM_GRADIENT_COLOR_A_STORAGE_KEY = "girigiri_glass_custom_gradient_color_a_v1"
export const CUSTOM_GRADIENT_COLOR_B_STORAGE_KEY = "girigiri_glass_custom_gradient_color_b_v1"
export const CUSTOM_GRADIENT_MESH_STORAGE_KEY = "girigiri_glass_custom_gradient_mesh_v1"
export const SAVED_CUSTOM_THEMES_STORAGE_KEY = "girigiri_glass_saved_custom_themes_v1"
export const ACTIVE_SAVED_CUSTOM_THEME_STORAGE_KEY = "girigiri_glass_active_saved_custom_theme_v1"
export const LIGHT_SAVED_CUSTOM_THEME_STORAGE_KEY = "girigiri_glass_light_saved_custom_theme_v1"
export const DARK_SAVED_CUSTOM_THEME_STORAGE_KEY = "girigiri_glass_dark_saved_custom_theme_v1"
export const DEFAULT_CUSTOM_BACKGROUND_COLOR: Color = "#d8b4c4"
export const DEFAULT_CUSTOM_GRADIENT_COLOR_A: Color = "#f7eef0"
export const DEFAULT_CUSTOM_GRADIENT_COLOR_B: Color = "#f0a6bc"

export type SavedCustomTheme = {
  id: string
  title: string
  kind: "solid" | "gradient"
  color?: Color
  colorA?: Color
  colorB?: Color
  usesMesh: boolean
  createdAt: number
}

const validIDs = new Set<BackgroundThemeID>(["custom", "customGradient"])
export function isBackgroundThemeID(value: unknown): value is BackgroundThemeID {
  return typeof value === "string" && validIDs.has(value as BackgroundThemeID)
}
export function getBackgroundTheme(
  id: unknown,
  customColor: Color = DEFAULT_CUSTOM_BACKGROUND_COLOR,
  customGradientColorA: Color = DEFAULT_CUSTOM_GRADIENT_COLOR_A,
  customGradientColorB: Color = DEFAULT_CUSTOM_GRADIENT_COLOR_B,
): BackgroundTheme {
  const validID = isBackgroundThemeID(id) ? id : DEFAULT_BACKGROUND_THEME_ID
  if (validID === "custom") {
    return { id: "custom", title: "自定义纯色", kind: "solid", lightColor: customColor, darkColor: customColor }
  }
  if (validID === "customGradient") {
    return {
      id: "customGradient",
      title: "自定义渐变",
      kind: "gradient",
      lightColors: [customGradientColorA, customGradientColorB],
      darkColors: [customGradientColorA, customGradientColorB],
      startPoint: "topLeading",
      endPoint: "bottomTrailing",
    }
  }
  return getBackgroundTheme(DEFAULT_BACKGROUND_THEME_ID, customColor, customGradientColorA, customGradientColorB)
}
export function getStoredBackgroundThemeID(): BackgroundThemeID {
  const value = Storage.get<string>(BACKGROUND_THEME_STORAGE_KEY)
  return isBackgroundThemeID(value) ? value : DEFAULT_BACKGROUND_THEME_ID
}
export function getStoredCustomBackgroundColor(): Color {
  return Storage.get<Color>(CUSTOM_BACKGROUND_COLOR_STORAGE_KEY) ?? DEFAULT_CUSTOM_BACKGROUND_COLOR
}
export function getStoredCustomGradientColorA(): Color {
  return Storage.get<Color>(CUSTOM_GRADIENT_COLOR_A_STORAGE_KEY) ?? DEFAULT_CUSTOM_GRADIENT_COLOR_A
}
export function getStoredCustomGradientColorB(): Color {
  return Storage.get<Color>(CUSTOM_GRADIENT_COLOR_B_STORAGE_KEY) ?? DEFAULT_CUSTOM_GRADIENT_COLOR_B
}
export function getStoredCustomGradientUsesMesh(): boolean {
  return Storage.get<boolean>(CUSTOM_GRADIENT_MESH_STORAGE_KEY) === true
}
const isSavedCustomTheme = (value: unknown): value is SavedCustomTheme => {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<SavedCustomTheme>
  if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.createdAt !== "number") return false
  if (item.kind === "solid") return typeof item.color === "string"
  return item.kind === "gradient" && typeof item.colorA === "string" && typeof item.colorB === "string" && typeof item.usesMesh === "boolean"
}
export function getStoredSavedCustomThemes(): SavedCustomTheme[] {
  const value = Storage.get<unknown>(SAVED_CUSTOM_THEMES_STORAGE_KEY)
  return Array.isArray(value) ? value.filter(isSavedCustomTheme) : []
}
const getStoredSavedThemeID = (key: string, themes: SavedCustomTheme[]): string | null => {
  const value = Storage.get<string>(key)
  return typeof value === "string" && themes.some(theme => theme.id === value) ? value : null
}
const savedThemeAsBackgroundTheme = (saved: SavedCustomTheme): BackgroundTheme => saved.kind === "solid"
  ? { id: "custom", title: saved.title, kind: "solid", lightColor: saved.color!, darkColor: saved.color! }
  : {
      id: "customGradient",
      title: saved.title,
      kind: "gradient",
      lightColors: [saved.colorA!, saved.colorB!],
      darkColors: [saved.colorA!, saved.colorB!],
      startPoint: "topLeading",
      endPoint: "bottomTrailing",
    }
const CUSTOM_MESH_POINTS: [number, number][] = [
  [0, 0], [0.5, 0], [1, 0],
  [0, 0.5], [0.5, 0.5], [1, 0.5],
  [0, 1], [0.5, 1], [1, 1],
]

function customMeshGradient(colorA: Color, colorB: Color) {
  return gradient("mesh", {
    width: 3,
    height: 3,
    points: CUSTOM_MESH_POINTS,
    colors: [colorA, colorA, colorB, colorA, colorB, colorA, colorB, colorA, colorB],
    background: colorA,
    smoothsColors: true,
  })
}

function backgroundStyleForScheme(theme: BackgroundTheme, customGradientUsesMesh: boolean, scheme: ColorScheme): ShapeStyle {
  if (theme.kind === "solid") return scheme === "light" ? theme.lightColor : theme.darkColor
  const colors = scheme === "light" ? theme.lightColors : theme.darkColors
  if (theme.id === "customGradient" && customGradientUsesMesh) return customMeshGradient(colors[0], colors[1] ?? colors[0])
  return { colors, startPoint: theme.startPoint, endPoint: theme.endPoint }
}

export function backgroundFillForTheme(theme: BackgroundTheme, customGradientUsesMesh = false): DynamicShapeStyle {
  return {
    light: backgroundStyleForScheme(theme, customGradientUsesMesh, "light"),
    dark: backgroundStyleForScheme(theme, customGradientUsesMesh, "dark"),
  }
}

export function backgroundFillForSavedTheme(saved: SavedCustomTheme): DynamicShapeStyle {
  return backgroundFillForTheme(savedThemeAsBackgroundTheme(saved), saved.kind === "gradient" && saved.usesMesh)
}

type BackgroundThemeContextValue = {
  themeID: BackgroundThemeID
  theme: BackgroundTheme
  customColor: Color
  customGradientColorA: Color
  customGradientColorB: Color
  customGradientUsesMesh: boolean
  backgroundFill: DynamicShapeStyle
  savedCustomThemes: SavedCustomTheme[]
  activeSavedCustomThemeID: string | null
  lightSavedCustomThemeID: string | null
  darkSavedCustomThemeID: string | null
  setCustomColor: (color: Color) => void
  setCustomGradientColorA: (color: Color) => void
  setCustomGradientColorB: (color: Color) => void
  setCustomGradientUsesMesh: (enabled: boolean) => void
  saveCustomTheme: (kind: "solid" | "gradient") => void
  applySavedCustomTheme: (id: string) => void
  bindSavedCustomTheme: (id: string | null, scheme: ColorScheme) => void
  renameSavedCustomTheme: (id: string, title: string) => boolean
  deleteSavedCustomTheme: (id: string) => void
}
const BackgroundThemeContext = createContext<BackgroundThemeContextValue>()
export function BackgroundThemeProvider({ children }: { children: JSX.Element }) {
  const [themeID, setThemeID] = useState<BackgroundThemeID>(() => getStoredBackgroundThemeID())
  const [customColor, setCustomColorState] = useState<Color>(() => getStoredCustomBackgroundColor())
  const [customGradientColorA, setCustomGradientColorAState] = useState<Color>(() => getStoredCustomGradientColorA())
  const [customGradientColorB, setCustomGradientColorBState] = useState<Color>(() => getStoredCustomGradientColorB())
  const [customGradientUsesMesh, setCustomGradientUsesMeshState] = useState<boolean>(() => getStoredCustomGradientUsesMesh())
  const [savedCustomThemes, setSavedCustomThemes] = useState<SavedCustomTheme[]>(() => getStoredSavedCustomThemes())
  const [activeSavedCustomThemeID, setActiveSavedCustomThemeID] = useState<string | null>(() => getStoredSavedThemeID(ACTIVE_SAVED_CUSTOM_THEME_STORAGE_KEY, getStoredSavedCustomThemes()))
  const [lightSavedCustomThemeID, setLightSavedCustomThemeID] = useState<string | null>(() => getStoredSavedThemeID(LIGHT_SAVED_CUSTOM_THEME_STORAGE_KEY, getStoredSavedCustomThemes()))
  const [darkSavedCustomThemeID, setDarkSavedCustomThemeID] = useState<string | null>(() => getStoredSavedThemeID(DARK_SAVED_CUSTOM_THEME_STORAGE_KEY, getStoredSavedCustomThemes()))
  const currentTheme = getBackgroundTheme(themeID, customColor, customGradientColorA, customGradientColorB)
  const activeSavedTheme = savedCustomThemes.find(item => item.id === activeSavedCustomThemeID)
  const theme = activeSavedTheme ? savedThemeAsBackgroundTheme(activeSavedTheme) : currentTheme
  const activeUsesMesh = activeSavedTheme?.kind === "gradient" ? activeSavedTheme.usesMesh : customGradientUsesMesh
  const lightSavedTheme = savedCustomThemes.find(item => item.id === lightSavedCustomThemeID)
  const darkSavedTheme = savedCustomThemes.find(item => item.id === darkSavedCustomThemeID)
  const backgroundFill: DynamicShapeStyle = {
    light: lightSavedTheme
      ? backgroundFillForSavedTheme(lightSavedTheme).light
      : backgroundStyleForScheme(theme, activeUsesMesh, "light"),
    dark: darkSavedTheme
      ? backgroundFillForSavedTheme(darkSavedTheme).dark
      : backgroundStyleForScheme(theme, activeUsesMesh, "dark"),
  }
  const clearActiveSavedTheme = (): void => {
    setActiveSavedCustomThemeID(null)
    Storage.remove(ACTIVE_SAVED_CUSTOM_THEME_STORAGE_KEY)
  }
  const setCustomColor = (color: Color): void => {
    clearActiveSavedTheme()
    setCustomColorState(color)
    setThemeID("custom")
    Storage.set(CUSTOM_BACKGROUND_COLOR_STORAGE_KEY, color)
    Storage.set(BACKGROUND_THEME_STORAGE_KEY, "custom")
  }
  const setCustomGradientColorA = (color: Color): void => {
    clearActiveSavedTheme()
    setCustomGradientColorAState(color)
    setThemeID("customGradient")
    Storage.set(CUSTOM_GRADIENT_COLOR_A_STORAGE_KEY, color)
    Storage.set(BACKGROUND_THEME_STORAGE_KEY, "customGradient")
  }
  const setCustomGradientColorB = (color: Color): void => {
    clearActiveSavedTheme()
    setCustomGradientColorBState(color)
    setThemeID("customGradient")
    Storage.set(CUSTOM_GRADIENT_COLOR_B_STORAGE_KEY, color)
    Storage.set(BACKGROUND_THEME_STORAGE_KEY, "customGradient")
  }
  const setCustomGradientUsesMesh = (enabled: boolean): void => {
    clearActiveSavedTheme()
    setCustomGradientUsesMeshState(enabled)
    setThemeID("customGradient")
    Storage.set(CUSTOM_GRADIENT_MESH_STORAGE_KEY, enabled)
    Storage.set(BACKGROUND_THEME_STORAGE_KEY, "customGradient")
  }
  const nextSavedThemeTitle = (): string => {
    const usedTitles = new Set(savedCustomThemes.map(item => item.title))
    for (let index = 0; index < 26; index += 1) {
      const title = `主题 ${String.fromCharCode(65 + index)}`
      if (!usedTitles.has(title)) return title
    }
    let index = 27
    while (usedTitles.has(`主题 ${index}`)) index += 1
    return `主题 ${index}`
  }
  const saveCustomTheme = (kind: "solid" | "gradient"): void => {
    const saved: SavedCustomTheme = kind === "solid"
      ? { id: `saved-${Date.now()}`, title: nextSavedThemeTitle(), kind, color: customColor, usesMesh: false, createdAt: Date.now() }
      : { id: `saved-${Date.now()}`, title: nextSavedThemeTitle(), kind, colorA: customGradientColorA, colorB: customGradientColorB, usesMesh: customGradientUsesMesh, createdAt: Date.now() }
    const next = [...savedCustomThemes, saved]
    setSavedCustomThemes(next)
    Storage.set(SAVED_CUSTOM_THEMES_STORAGE_KEY, next)
  }
  const applySavedCustomTheme = (id: string): void => {
    if (!savedCustomThemes.some(item => item.id === id)) return
    setActiveSavedCustomThemeID(id)
    Storage.set(ACTIVE_SAVED_CUSTOM_THEME_STORAGE_KEY, id)
  }
  const bindSavedCustomTheme = (id: string | null, scheme: ColorScheme): void => {
    if (id != null && !savedCustomThemes.some(item => item.id === id)) return
    const storageKey = scheme === "light" ? LIGHT_SAVED_CUSTOM_THEME_STORAGE_KEY : DARK_SAVED_CUSTOM_THEME_STORAGE_KEY
    if (scheme === "light") setLightSavedCustomThemeID(id)
    else setDarkSavedCustomThemeID(id)
    if (id == null) Storage.remove(storageKey)
    else Storage.set(storageKey, id)
  }
  const renameSavedCustomTheme = (id: string, title: string): boolean => {
    const normalizedTitle = title.trim()
    if (!normalizedTitle || savedCustomThemes.some(item => item.id !== id && item.title === normalizedTitle)) return false
    const index = savedCustomThemes.findIndex(item => item.id === id)
    if (index < 0) return false
    if (savedCustomThemes[index].title === normalizedTitle) return true
    const next = savedCustomThemes.map(item => item.id === id ? { ...item, title: normalizedTitle } : item)
    setSavedCustomThemes(next)
    Storage.set(SAVED_CUSTOM_THEMES_STORAGE_KEY, next)
    return true
  }
  const deleteSavedCustomTheme = (id: string): void => {
    const next = savedCustomThemes.filter(item => item.id !== id)
    setSavedCustomThemes(next)
    Storage.set(SAVED_CUSTOM_THEMES_STORAGE_KEY, next)
    if (activeSavedCustomThemeID === id) clearActiveSavedTheme()
    if (lightSavedCustomThemeID === id) {
      setLightSavedCustomThemeID(null)
      Storage.remove(LIGHT_SAVED_CUSTOM_THEME_STORAGE_KEY)
    }
    if (darkSavedCustomThemeID === id) {
      setDarkSavedCustomThemeID(null)
      Storage.remove(DARK_SAVED_CUSTOM_THEME_STORAGE_KEY)
    }
  }
  return (
    <BackgroundThemeContext.Provider value={{
      themeID,
      theme,
      customColor,
      customGradientColorA,
      customGradientColorB,
      customGradientUsesMesh,
      backgroundFill,
      savedCustomThemes,
      activeSavedCustomThemeID,
      lightSavedCustomThemeID,
      darkSavedCustomThemeID,
      setCustomColor,
      setCustomGradientColorA,
      setCustomGradientColorB,
      setCustomGradientUsesMesh,
      saveCustomTheme,
      applySavedCustomTheme,
      bindSavedCustomTheme,
      renameSavedCustomTheme,
      deleteSavedCustomTheme,
    }}>
      {children}
    </BackgroundThemeContext.Provider>
  )
}
export function useBackgroundTheme(): BackgroundThemeContextValue {
  return useContext(BackgroundThemeContext)
}
