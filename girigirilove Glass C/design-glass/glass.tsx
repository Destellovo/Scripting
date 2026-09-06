import {
  Button,
  Capsule,
  ColorPicker,
  GlassEffectContainer,
  Image,
  LazyVGrid,
  ZStack,
  Text,
  VStack,
  type Color,
  type DynamicShapeStyle,
} from "scripting"
import {
  glassShape,
  GIRIGIRI_GLASS_TOKENS,
  type GlassMaterial,
} from "./tokens"
import { useBackgroundTheme } from "./background-theme"

export type GlassSurfaceShape = "capsule" | {
  type: "rect"
  cornerRadius: number
  style: "continuous"
}

export function glassEffectFor(material: GlassMaterial, shape?: GlassSurfaceShape, interactive?: boolean) {
  const definition = GIRIGIRI_GLASS_TOKENS.material[material]
  const baseGlass = definition.glass === "clear" ? UIGlass.clear() : UIGlass.regular()
  return {
    glass: baseGlass.interactive(interactive ?? definition.interactive),
    shape: shape ?? glassShape(material),
  }
}

/** 原生 ColorPicker 自身持有 interactive Glass。 */
export function GlassColorPicker(props: {
  value: Color
  onChanged: (color: Color) => void
  children?: any
}) {
  return (
    <ColorPicker
      value={props.value}
      onChanged={props.onChanged}
      supportsOpacity={false}
      frame={{ maxWidth: "infinity" }}
      padding={{ horizontal: 20 }}
      glassEffect={glassEffectFor("navigation")}
      glassEffectTransition="materialize"
    >
      {props.children}
    </ColorPicker>
  )
}

export function GlassSurface(props: {
  material?: GlassMaterial
  showsShadow?: boolean
  shape?: GlassSurfaceShape
  children?: any
}) {
  const material = props.material ?? "content"

  const surfaceProps = props.showsShadow === false
    ? {}
    : { shadow: { color: GIRIGIRI_GLASS_TOKENS.material[material].shadow, radius: 12, y: 5 } }

  return (
    <ZStack
      frame={{ maxWidth: "infinity" }}
      glassEffect={glassEffectFor(material, props.shape, false)}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      {...surfaceProps}
    >
      {props.children}
    </ZStack>
  )
}

export const glassListRowStyleProps = {
  frame: { maxWidth: "infinity" as const, minHeight: 44, alignment: "leading" as const },
  padding: { horizontal: 12, vertical: 10 },
  contentShape: { type: "rect" as const, cornerRadius: 16, style: "continuous" as const },
  buttonStyle: "plain" as const,
  glassEffect: {
    glass: UIGlass.clear().interactive(false),
    shape: { type: "rect" as const, cornerRadius: 16, style: "continuous" as const },
  },
  listRowBackground: <></>,
  listRowSeparator: "hidden" as const,
  shadow: { color: "rgba(142,20,55,0.14)" as Color, radius: 10, y: 4 },
}

export const glassNoteRowStyleProps = {
  frame: { maxWidth: "infinity" as const, alignment: "leading" as const },
  padding: { horizontal: 12, vertical: 10 },
  glassEffect: {
    glass: UIGlass.clear().interactive(false),
    shape: { type: "rect" as const, cornerRadius: 16, style: "continuous" as const },
  },
  listRowBackground: <></>,
  listRowSeparator: "hidden" as const,
}

export function GlassListRow(props: {
  children?: any
}) {
  return <ZStack {...glassNoteRowStyleProps}>{props.children}</ZStack>
}

export const BACKGROUND_THEME_COLUMNS = [
  { size: { type: "flexible" as const, min: 0 }, spacing: 10 },
  { size: { type: "flexible" as const, min: 0 } },
]

export function themeFillOval(fill: DynamicShapeStyle, content: any, height?: number) {
  return (
    <Capsule
      fill={fill}
      frame={height === undefined ? { maxWidth: "infinity", minHeight: 92 } : { maxWidth: "infinity", height }}
      overlay={{ alignment: "center", content }}
    />
  )
}

export function GlassSectionHeader(props: {
  title: string
  subtitle?: string
}) {
  const { backgroundFill } = useBackgroundTheme()

  return (
    <LazyVGrid
      columns={BACKGROUND_THEME_COLUMNS}
      alignment="leading"
      spacing={10}
      frame={{ maxWidth: "infinity" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <ZStack
        frame={{ maxWidth: "infinity" }}
        glassEffect={glassEffectFor("navigation", "capsule", false)}
        listRowBackground={<></>}
        listRowSeparator="hidden"
      >
        {themeFillOval(
          backgroundFill,
          <VStack spacing={props.subtitle ? 4 : 0} frame={{ maxWidth: "infinity", alignment: "center" }} padding={{ horizontal: 14, vertical: 12 }}>
            <Text
              font="subheadline"
              fontWeight="semibold"
              foregroundStyle="white"
              lineLimit={2}
              multilineTextAlignment="center"
              shadow={{ color: "black", radius: 3, x: 0, y: 1 }}
            >
              {props.title}
            </Text>
            {props.subtitle ? (
              <Text
                font="caption2"
                foregroundStyle="white"
                multilineTextAlignment="center"
                lineLimit={3}
                shadow={{ color: "black", radius: 3, x: 0, y: 1 }}
              >
                {props.subtitle}
              </Text>
            ) : null}
          </VStack>,
        )}
      </ZStack>
    </LazyVGrid>
  )
}

export function GlassGridCell(props: {
  width?: number
  height: number
  fillWidth?: boolean
  children?: any
}) {
  return (
    <ZStack
      frame={props.fillWidth
        ? { maxWidth: "infinity", height: props.height }
        : { width: props.width, height: props.height }}
      padding={{ horizontal: 6, vertical: 6 }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      {props.children}
    </ZStack>
  )
}

export function GlassStatusSurface(props: {
  children?: any
}) {
  return (
    <GlassSurface material="content">
      {props.children}
    </GlassSurface>
  )
}

export function GlassIconButton(props: {
  title: string
  systemName: string
  material?: GlassMaterial
  tint?: "systemPink" | "systemBlue" | "systemGreen" | "systemOrange" | "systemRed"
  action: () => void
}) {
  return (
    <Button
      action={props.action}
      buttonStyle="plain"
      accessibilityLabel={props.title}
      frame={{ minWidth: 44, minHeight: 44 }}
      glassEffect={glassEffectFor(props.material ?? "navigation", undefined, true)}
      glassEffectTransition="materialize"
    >
      <Image
        systemName={props.systemName}
        font="headline"
        foregroundStyle={props.tint ?? GIRIGIRI_GLASS_TOKENS.accent}
      />
    </Button>
  )
}

export function GlassGroup(props: {
  spacing?: number
  children?: any
}) {
  return (
    <GlassEffectContainer spacing={props.spacing ?? GIRIGIRI_GLASS_TOKENS.spacing.compact}>
      {props.children}
    </GlassEffectContainer>
  )
}
