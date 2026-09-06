import {
  Button,
  Capsule,
  Group,
  HStack,
  Image,
  Menu,
  Spacer,
  Text,
  Toggle,
  useState,
  VStack,
} from "scripting"
import type { Color } from "scripting"
import {
  backgroundFillForTheme,
  getBackgroundTheme,
  glassEffectFor,
  GlassColorPicker,
  GlassSurface,
  ShelfHeader,
  type SavedCustomTheme,
  useBackgroundTheme,
} from "../../design-glass"
import { ColorSpaceModeControl, ColorSpaceSliders, type ColorSpaceMode } from "./color-space-picker"

const SOLID_MODE_KEY = "girigiri_glass_solid_color_mode_v1"
const GRADIENT_MODE_KEY = "girigiri_glass_gradient_color_mode_v1"
const SOLID_KEYS: Record<ColorSpaceMode, string> = {
  rgb: "girigiri_glass_solid_rgb_v1",
  hsl: "girigiri_glass_solid_hsl_v1",
  hsv: "girigiri_glass_solid_hsv_v1",
}
const GRADIENT_A_KEYS: Record<ColorSpaceMode, string> = {
  rgb: "girigiri_glass_gradient_rgb_a_v1",
  hsl: "girigiri_glass_gradient_hsl_a_v1",
  hsv: "girigiri_glass_gradient_hsv_a_v1",
}
const GRADIENT_B_KEYS: Record<ColorSpaceMode, string> = {
  rgb: "girigiri_glass_gradient_rgb_b_v1",
  hsl: "girigiri_glass_gradient_hsl_b_v1",
  hsv: "girigiri_glass_gradient_hsv_b_v1",
}
const isMode = (value: unknown): value is ColorSpaceMode => value === "rgb" || value === "hsl" || value === "hsv"
const storedMode = (key: string): ColorSpaceMode => {
  const value = Storage.get<string>(key)
  return isMode(value) ? value : "rgb"
}
const loadColors = (keys: Record<ColorSpaceMode, string>, fallback: Color): Record<ColorSpaceMode, Color> => ({
  rgb: Storage.get<Color>(keys.rgb) ?? fallback,
  hsl: Storage.get<Color>(keys.hsl) ?? fallback,
  hsv: Storage.get<Color>(keys.hsv) ?? fallback,
})

const ADAPTIVE_EDITOR_GLASS_SHAPE = {
  type: "rect" as const,
  cornerRadius: 44,
  style: "continuous" as const,
}

export function BackgroundAppearanceEditor() {
  const {
    themeID,
    customColor,
    customGradientColorA,
    customGradientColorB,
    customGradientUsesMesh,
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
  } = useBackgroundTheme()
  const [solidColorMode, setSolidColorMode] = useState<ColorSpaceMode>(() => storedMode(SOLID_MODE_KEY))
  const [gradientColorMode, setGradientColorMode] = useState<ColorSpaceMode>(() => storedMode(GRADIENT_MODE_KEY))
  const [solidModeColors, setSolidModeColors] = useState<Record<ColorSpaceMode, Color>>(() => loadColors(SOLID_KEYS, customColor))
  const [gradientModeColorsA, setGradientModeColorsA] = useState<Record<ColorSpaceMode, Color>>(() => loadColors(GRADIENT_A_KEYS, customGradientColorA))
  const [gradientModeColorsB, setGradientModeColorsB] = useState<Record<ColorSpaceMode, Color>>(() => loadColors(GRADIENT_B_KEYS, customGradientColorB))
  const activeSolidColor = solidModeColors[solidColorMode]
  const activeGradientColorA = gradientModeColorsA[gradientColorMode]
  const activeGradientColorB = gradientModeColorsB[gradientColorMode]

  const updateSolidModeColor = (color: Color): void => {
    setSolidModeColors({ ...solidModeColors, [solidColorMode]: color })
    Storage.set(SOLID_KEYS[solidColorMode], color)
    setCustomColor(color)
  }
  const updateGradientModeColorA = (color: Color): void => {
    setGradientModeColorsA({ ...gradientModeColorsA, [gradientColorMode]: color })
    Storage.set(GRADIENT_A_KEYS[gradientColorMode], color)
    setCustomGradientColorA(color)
  }
  const updateGradientModeColorB = (color: Color): void => {
    setGradientModeColorsB({ ...gradientModeColorsB, [gradientColorMode]: color })
    Storage.set(GRADIENT_B_KEYS[gradientColorMode], color)
    setCustomGradientColorB(color)
  }

  return (
    <VStack spacing={14} frame={{ maxWidth: "infinity" }}>
      <ShelfHeader title="外观" caption="自定义纯色、渐变与个人主题" />

      <GlassSurface material="content" showsShadow={false} shape={ADAPTIVE_EDITOR_GLASS_SHAPE}>
        <VStack spacing={12} frame={{ maxWidth: "infinity" }} fixedSize={{ horizontal: false, vertical: true }} padding={{ horizontal: 42, top: 18, bottom: 22 }}>
          <ColorSpaceModeControl
            mode={solidColorMode}
            selectedFill={activeSolidColor}
            fills={solidModeColors}
            onChanged={(mode) => {
              setSolidColorMode(mode)
              Storage.set(SOLID_MODE_KEY, mode)
              setCustomColor(solidModeColors[mode])
            }}
            onActivate={() => {}}
          />
          {solidColorMode === "rgb" ? (
            <GlassColorPicker value={activeSolidColor} onChanged={updateSolidModeColor}>
              <VStack spacing={5} frame={{ maxWidth: "infinity", minHeight: 64, alignment: "center" }} padding={{ vertical: 6 }}>
                <HStack spacing={7} frame={{ alignment: "center" }}>
                  <Capsule fill={activeSolidColor} frame={{ width: 34, height: 22 }} />
                  {themeID === "custom" && activeSavedCustomThemeID == null ? <Image systemName="checkmark.circle.fill" font="caption" foregroundStyle="#a72c5f" /> : null}
                  <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">自定义纯色</Text>
                </HStack>
                <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="center" frame={{ maxWidth: "infinity", alignment: "center" }}>使用系统 RGB 取色器选择环境色。</Text>
              </VStack>
            </GlassColorPicker>
          ) : (
            <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
              <HStack spacing={7} frame={{ alignment: "center" }}>
                <Capsule fill={activeSolidColor} frame={{ width: 34, height: 22 }} />
                {themeID === "custom" && activeSavedCustomThemeID == null ? <Image systemName="checkmark.circle.fill" font="caption" foregroundStyle="#a72c5f" /> : null}
                <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">{`${solidColorMode.toUpperCase()} 自定义纯色`}</Text>
              </HStack>
              <ColorSpaceSliders mode={solidColorMode} color={activeSolidColor} onChanged={updateSolidModeColor} />
            </VStack>
          )}
        </VStack>
      </GlassSurface>

      <GlassSurface material="content" showsShadow={false} shape={ADAPTIVE_EDITOR_GLASS_SHAPE}>
        <VStack spacing={14} frame={{ maxWidth: "infinity" }} fixedSize={{ horizontal: false, vertical: true }} padding={{ top: 26, bottom: 30 }}>
          <VStack spacing={5} frame={{ maxWidth: "infinity", alignment: "center" }} padding={{ horizontal: 42 }}>
            <HStack spacing={7} frame={{ alignment: "center" }}>
              {themeID === "customGradient" && activeSavedCustomThemeID == null ? <Image systemName="checkmark.circle.fill" font="caption" foregroundStyle="#a72c5f" /> : null}
              <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">自定义渐变</Text>
            </HStack>
            <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="center" frame={{ maxWidth: "infinity", alignment: "center" }}>
              {customGradientUsesMesh ? "以二维网格柔和混合颜色 A 与颜色 B。" : "从左上到右下线性混合起点与终点颜色。"}
            </Text>
          </VStack>
          <VStack spacing={12} frame={{ maxWidth: "infinity" }} padding={{ horizontal: 42 }}>
            <Toggle
              value={customGradientUsesMesh}
              onChanged={setCustomGradientUsesMesh}
              accessibilityLabel={customGradientUsesMesh ? "网格渐变，已开启" : "线性渐变，已开启"}
            >
              <InsetSmallGlassBadge
                title={customGradientUsesMesh ? "网格渐变" : "线性渐变"}
                active={customGradientUsesMesh}
                width={84}
                controlSized={true}
              />
            </Toggle>
            <ColorSpaceModeControl
              mode={gradientColorMode}
              selectedFill={backgroundFillForTheme(getBackgroundTheme("customGradient", activeSolidColor, activeGradientColorA, activeGradientColorB), customGradientUsesMesh)}
              fills={{
                rgb: backgroundFillForTheme(getBackgroundTheme("customGradient", activeSolidColor, gradientModeColorsA.rgb, gradientModeColorsB.rgb), customGradientUsesMesh),
                hsl: backgroundFillForTheme(getBackgroundTheme("customGradient", activeSolidColor, gradientModeColorsA.hsl, gradientModeColorsB.hsl), customGradientUsesMesh),
                hsv: backgroundFillForTheme(getBackgroundTheme("customGradient", activeSolidColor, gradientModeColorsA.hsv, gradientModeColorsB.hsv), customGradientUsesMesh),
              }}
              onChanged={(mode) => {
                setGradientColorMode(mode)
                Storage.set(GRADIENT_MODE_KEY, mode)
                setCustomGradientColorA(gradientModeColorsA[mode])
                setCustomGradientColorB(gradientModeColorsB[mode])
              }}
              onActivate={() => {}}
            />
            <GradientColorEditor
              title={customGradientUsesMesh ? "颜色 A" : "起点颜色"}
              subtitle={customGradientUsesMesh ? "5 个网格锚点" : "左上"}
              mode={gradientColorMode}
              color={activeGradientColorA}
              onChanged={updateGradientModeColorA}
            />
            <GradientColorEditor
              title={customGradientUsesMesh ? "颜色 B" : "终点颜色"}
              subtitle={customGradientUsesMesh ? "4 个网格锚点" : "右下"}
              mode={gradientColorMode}
              color={activeGradientColorB}
              onChanged={updateGradientModeColorB}
            />
          </VStack>
          <HStack frame={{ maxWidth: "infinity" }} padding={{ horizontal: 42 }}>
            <GlassSurface material="content" showsShadow={false} shape="capsule">
              <Capsule
                fill={backgroundFillForTheme(getBackgroundTheme("customGradient", activeSolidColor, activeGradientColorA, activeGradientColorB), customGradientUsesMesh)}
                frame={{ maxWidth: "infinity", height: 38 }}
                overlay={{
                  alignment: "center",
                  content: <Text font="caption2" fontWeight="semibold" foregroundStyle="white" shadow={{ color: "black", radius: 2, x: 0, y: 1 }}>渐变预览</Text>,
                }}
              />
            </GlassSurface>
          </HStack>
        </VStack>
      </GlassSurface>

      <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
        <SaveCurrentThemeMenu onSave={saveCustomTheme} />
        {savedCustomThemes.map(savedTheme => (
          <SavedThemeMenu
            key={savedTheme.id}
            theme={savedTheme}
            active={activeSavedCustomThemeID === savedTheme.id}
            usedForLight={lightSavedCustomThemeID === savedTheme.id}
            usedForDark={darkSavedCustomThemeID === savedTheme.id}
            onApply={() => { applySavedCustomTheme(savedTheme.id) }}
            onUseForLight={() => { bindSavedCustomTheme(lightSavedCustomThemeID === savedTheme.id ? null : savedTheme.id, "light") }}
            onUseForDark={() => { bindSavedCustomTheme(darkSavedCustomThemeID === savedTheme.id ? null : savedTheme.id, "dark") }}
            onRename={async () => {
              const title = await Dialog.prompt({
                title: "重命名主题",
                message: "请输入新的主题名称",
                defaultValue: savedTheme.title,
                selectAll: true,
                confirmLabel: "确定",
                cancelLabel: "取消",
              })
              if (title == null || title.trim() === "" || title.trim() === savedTheme.title) return
              if (!renameSavedCustomTheme(savedTheme.id, title)) {
                await Dialog.alert({ title: "重命名失败", message: "已存在同名主题" })
              }
            }}
            onDelete={() => { deleteSavedCustomTheme(savedTheme.id) }}
          />
        ))}
      </VStack>
    </VStack>
  )
}

function InsetSmallGlassBadge(props: { title: string; active?: boolean; width?: number; controlSized?: boolean }) {
  return (
    <Text
      font={props.controlSized ? "subheadline" : "caption2"}
      fontWeight={props.controlSized ? "semibold" : "bold"}
      foregroundStyle={props.active ? "#a72c5f" : "secondaryLabel"}
      frame={{ width: props.width, height: props.controlSized ? 36 : undefined, alignment: "center" }}
      fixedSize={{ horizontal: props.width == null, vertical: false }}
      padding={props.controlSized ? undefined : { horizontal: 6, vertical: 3 }}
      background={{ style: { light: "rgba(255,255,255,0.30)", dark: "rgba(28,28,30,0.40)" }, shape: "capsule" }}
      glassEffect={glassEffectFor("content", "capsule", false)}
      glassEffectTransition="materialize"
      shadow={{ color: "rgba(72,88,120,0.12)" as Color, radius: 6, y: 2 }}
    >{props.title}</Text>
  )
}

function SaveCurrentThemeMenu(props: { onSave: (kind: "solid" | "gradient") => void }) {
  return (
    <Menu
      label={(
        <HStack spacing={12} frame={{ maxWidth: "infinity", minHeight: 52 }} contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}>
          <Image systemName="plus.circle" frame={{ width: 22 }} foregroundStyle="secondaryLabel" />
          <VStack spacing={2} alignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="body" fontWeight="medium">保存自定义设置</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">保存下方纯色或渐变编辑值。</Text>
          </VStack>
          <Spacer />
          <Image systemName="chevron.up.chevron.down" font="caption2" foregroundStyle="tertiaryLabel" />
        </HStack>
      )}
      frame={{ maxWidth: "infinity", minHeight: 52, alignment: "leading" }}
      padding={{ horizontal: 16, vertical: 10 }}
      contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}
      accessibilityLabel="保存自定义设置，展开保存选项"
      menuIndicator="hidden"
      menuStyle="button"
      buttonStyle="plain"
      glassEffect={glassEffectFor("navigation", { type: "rect", cornerRadius: 16, style: "continuous" }, true)}
      glassEffectTransition="materialize"
    >
      <Button title="保存自定义纯色" systemImage="circle.fill" action={() => { props.onSave("solid") }} />
      <Button title="保存自定义渐变" systemImage="circle.lefthalf.filled" action={() => { props.onSave("gradient") }} />
      <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
    </Menu>
  )
}

function SavedThemeMenu(props: {
  theme: SavedCustomTheme
  active: boolean
  usedForLight: boolean
  usedForDark: boolean
  onApply: () => void
  onUseForLight: () => void
  onUseForDark: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const typeLabel = props.theme.kind === "solid" ? "纯色" : props.theme.usesMesh ? "网格渐变" : "线性渐变"
  const previewFill = props.theme.kind === "solid"
    ? props.theme.color!
    : backgroundFillForTheme(getBackgroundTheme("customGradient", undefined, props.theme.colorA, props.theme.colorB), props.theme.usesMesh)
  const status = [props.active ? "当前" : "", props.usedForLight ? "浅色" : "", props.usedForDark ? "深色" : ""].filter(Boolean).join(" · ") || "未绑定"
  return (
    <Menu
      label={(
        <HStack spacing={12} frame={{ maxWidth: "infinity", minHeight: 54 }} contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}>
          <Capsule fill={previewFill} frame={{ width: 42, height: 28 }} />
          <VStack spacing={3} alignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <HStack spacing={6}>
              {props.active ? <Image systemName="checkmark.circle.fill" font="caption" foregroundStyle="systemPink" /> : undefined}
              <Text font="body" fontWeight="medium">{props.theme.title}</Text>
            </HStack>
            <Text font="caption" foregroundStyle="secondaryLabel">{`${typeLabel} · ${status}`}</Text>
          </VStack>
          <Spacer />
          <Image systemName="chevron.up.chevron.down" font="caption2" foregroundStyle="tertiaryLabel" />
        </HStack>
      )}
      frame={{ maxWidth: "infinity", minHeight: 54, alignment: "leading" }}
      padding={{ horizontal: 16, vertical: 10 }}
      contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}
      accessibilityLabel={`${props.theme.title}，${typeLabel}，${status}，展开主题选项`}
      menuIndicator="hidden"
      menuStyle="button"
      buttonStyle="plain"
      glassEffect={glassEffectFor("navigation", { type: "rect", cornerRadius: 16, style: "continuous" }, true)}
      glassEffectTransition="materialize"
    >
      <Group>
        <Button title="立即使用" systemImage={props.active ? "checkmark" : "paintbrush"} action={props.onApply} />
        <Button title={props.usedForLight ? "取消浅色模式绑定" : "用于浅色模式"} systemImage={props.usedForLight ? "xmark.circle" : "sun.max.fill"} action={props.onUseForLight} />
        <Button title={props.usedForDark ? "取消深色模式绑定" : "用于深色模式"} systemImage={props.usedForDark ? "xmark.circle" : "moon.stars.fill"} action={props.onUseForDark} />
        <Button title="重命名主题" systemImage="pencil" action={props.onRename} />
      </Group>
      <Button title="删除主题" systemImage="trash" role="destructive" action={props.onDelete} />
      <Button title="取消" systemImage="xmark" role="cancel" action={() => {}} />
    </Menu>
  )
}

function GradientColorEditor(props: {
  title: string
  subtitle: string
  mode: ColorSpaceMode
  color: Color
  onChanged: (color: Color) => void
}) {
  if (props.mode === "rgb") return <GradientColorPicker {...props} />
  return (
    <VStack spacing={8} frame={{ maxWidth: "infinity" }} padding={{ vertical: 5 }}>
      <HStack spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Capsule fill={props.color} frame={{ width: 48, height: 32 }} />
        <VStack spacing={2} alignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">{props.title}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">{`${props.subtitle} · ${props.mode.toUpperCase()}`}</Text>
        </VStack>
      </HStack>
      <ColorSpaceSliders mode={props.mode} color={props.color} onChanged={props.onChanged} />
    </VStack>
  )
}

function GradientColorPicker(props: {
  title: string
  subtitle: string
  color: Color
  onChanged: (color: Color) => void
}) {
  return (
    <GlassColorPicker value={props.color} onChanged={props.onChanged}>
      <HStack spacing={11} frame={{ maxWidth: "infinity", minHeight: 52 }} padding={{ vertical: 7 }}>
        <Capsule fill={props.color} frame={{ width: 48, height: 32 }} />
        <VStack spacing={2} alignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="subheadline" fontWeight="semibold" foregroundStyle="label" lineLimit={1}>{props.title}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{props.subtitle}</Text>
        </VStack>
      </HStack>
    </GlassColorPicker>
  )
}

