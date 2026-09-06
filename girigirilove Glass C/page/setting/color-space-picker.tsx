import { Button, HStack, Image, Slider, Text, useEffect, useState, VStack } from "scripting"
import type { Color, DynamicShapeStyle, ShapeStyle } from "scripting"
import { GlassGroup, glassEffectFor } from "../../design-glass"

export type ColorSpaceMode = "rgb" | "hsl" | "hsv"

type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }
type HSV = { h: number; s: number; v: number }

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value))
const byteHex = (value: number): string => Math.round(clamp(value) * 255).toString(16).padStart(2, "0")

function colorToRGB(color: Color): RGB {
  const value = String(color).trim()
  const shortHex = value.match(/^#([\da-f])([\da-f])([\da-f])$/i)
  if (shortHex) return {
    r: parseInt(shortHex[1] + shortHex[1], 16) / 255,
    g: parseInt(shortHex[2] + shortHex[2], 16) / 255,
    b: parseInt(shortHex[3] + shortHex[3], 16) / 255,
  }
  const hex = value.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i)
  if (hex) return { r: parseInt(hex[1], 16) / 255, g: parseInt(hex[2], 16) / 255, b: parseInt(hex[3], 16) / 255 }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (rgb) return { r: clamp(Number(rgb[1]) / 255), g: clamp(Number(rgb[2]) / 255), b: clamp(Number(rgb[3]) / 255) }
  return { r: 0.85, g: 0.71, b: 0.77 }
}

const rgbToHex = ({ r, g, b }: RGB): Color => `#${byteHex(r)}${byteHex(g)}${byteHex(b)}` as Color

function rgbToHSL({ r, g, b }: RGB): HSL {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  const rawHue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return { h: (rawHue * 60 + 360) % 360, s, l }
}

function hslToRGB({ h, s, l }: HSL): RGB {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const segment = ((h % 360) + 360) % 360 / 60
  const x = chroma * (1 - Math.abs(segment % 2 - 1))
  const [r1, g1, b1] = segment < 1 ? [chroma, x, 0] : segment < 2 ? [x, chroma, 0] : segment < 3 ? [0, chroma, x] : segment < 4 ? [0, x, chroma] : segment < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const m = l - chroma / 2
  return { r: r1 + m, g: g1 + m, b: b1 + m }
}

function rgbToHSV({ r, g, b }: RGB): HSV {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, v: max }
  const rawHue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return { h: (rawHue * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max }
}

function hsvToRGB({ h, s, v }: HSV): RGB {
  const chroma = v * s
  const segment = ((h % 360) + 360) % 360 / 60
  const x = chroma * (1 - Math.abs(segment % 2 - 1))
  const [r1, g1, b1] = segment < 1 ? [chroma, x, 0] : segment < 2 ? [x, chroma, 0] : segment < 3 ? [0, chroma, x] : segment < 4 ? [0, x, chroma] : segment < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const m = v - chroma
  return { r: r1 + m, g: g1 + m, b: b1 + m }
}

export function ColorSpaceModeControl(props: {
  mode: ColorSpaceMode
  selectedFill: ShapeStyle | DynamicShapeStyle
  fills?: Partial<Record<ColorSpaceMode, ShapeStyle | DynamicShapeStyle>>
  onChanged: (mode: ColorSpaceMode) => void
  onActivate: () => void
}) {
  const modes: { id: ColorSpaceMode; title: string }[] = [{ id: "rgb", title: "RGB" }, { id: "hsl", title: "HSL" }, { id: "hsv", title: "HSV" }]
  return (
    <GlassGroup spacing={8}>
      <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
        {modes.map(item => (
        <Button
          key={item.id}
          action={() => {
            props.onActivate()
            props.onChanged(item.id)
          }}
          buttonStyle="plain"
          frame={{ maxWidth: "infinity" }}
          accessibilityLabel={props.mode === item.id ? `${item.title}，当前模式` : item.title}
          glassEffect={glassEffectFor("navigation")}
          glassEffectTransition="materialize"
        >
          <HStack
            spacing={5}
            frame={{ maxWidth: "infinity", minHeight: 36, alignment: "center" }}
            background={{ style: props.fills?.[item.id] ?? (props.mode === item.id ? props.selectedFill : "rgba(255,255,255,0.001)"), shape: "capsule" }}
          >
            {props.mode === item.id ? <Image systemName="checkmark" font="caption2" foregroundStyle="#a72c5f" /> : null}
            <Text font="subheadline" fontWeight="semibold" foregroundStyle={props.mode === item.id ? "#a72c5f" : "secondaryLabel"}>{item.title}</Text>
          </HStack>
        </Button>
        ))}
      </HStack>
    </GlassGroup>
  )
}

export function ColorSpaceSliders(props: { mode: "hsl" | "hsv"; color: Color; onChanged: (color: Color) => void }) {
  const rgb = colorToRGB(props.color)
  const values = props.mode === "hsl" ? rgbToHSL(rgb) : rgbToHSV(rgb)
  const thirdValue = props.mode === "hsl" ? rgbToHSL(rgb).l : rgbToHSV(rgb).v
  const update = (channel: "h" | "s" | "third", value: number): void => {
    const next = { h: values.h, s: values.s, third: thirdValue }
    next[channel] = channel === "h" ? value : value / 100
    const nextRGB = props.mode === "hsl"
      ? hslToRGB({ h: next.h, s: next.s, l: next.third })
      : hsvToRGB({ h: next.h, s: next.s, v: next.third })
    props.onChanged(rgbToHex(nextRGB))
  }
  return (
    <VStack spacing={8} frame={{ maxWidth: "infinity" }}>
      <ColorChannelSlider title="H" value={values.h} max={360} suffix="°" onChanged={value => update("h", value)} />
      <ColorChannelSlider title="S" value={values.s * 100} max={100} suffix="%" onChanged={value => update("s", value)} />
      <ColorChannelSlider title={props.mode === "hsl" ? "L" : "V"} value={thirdValue * 100} max={100} suffix="%" onChanged={value => update("third", value)} />
    </VStack>
  )
}

function ColorChannelSlider(props: {
  title: string
  value: number
  max: number
  suffix: string
  onChanged: (value: number) => void
}) {
  const [draftValue, setDraftValue] = useState(props.value)
  const [isEditing, setIsEditing] = useState(false)
  useEffect(() => {
    if (!isEditing) setDraftValue(props.value)
  }, [props.value, props.title, isEditing])
  const handleChanged = (value: number): void => {
    setDraftValue(value)
    props.onChanged(value)
  }
  return (
    <HStack spacing={8} frame={{ maxWidth: "infinity", minHeight: 38 }}>
      <Text font="caption" fontWeight="bold" foregroundStyle="secondaryLabel" frame={{ width: 18 }}>{props.title}</Text>
      <Slider
        value={draftValue}
        min={0}
        max={props.max}
        ticks={[]}
        onChanged={handleChanged}
        onEditingChanged={setIsEditing}
        label={<Text>{`${props.title} 色彩通道`}</Text>}
        accessibilityLabel={`${props.title} 色彩通道`}
        sensoryFeedback={{ trigger: Math.round(draftValue), feedback: "selection" }}
      />
      <Text font="caption2" fontWeight="medium" foregroundStyle="secondaryLabel" multilineTextAlignment="trailing" frame={{ width: 42, alignment: "trailing" }}>{`${Math.round(draftValue)}${props.suffix}`}</Text>
    </HStack>
  )
}
