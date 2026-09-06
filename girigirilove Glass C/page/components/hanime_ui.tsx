import { Button, HStack, Image, Text, VStack } from "scripting"
import { GIRIGIRI_GLASS_TOKENS, glassEffectFor, GlassSurface } from "../../design-glass"

export type HanimeHeroStat = {
  title: string
  value: string
  icon?: string
}

type HanimeHeroCardProps = {
  eyebrow?: string
  title: string
  subtitle: string
  stats?: HanimeHeroStat[]
  actions?: JSX.Element | JSX.Element[]
  tone?: "primary" | "soft"
}

export function HanimeHeroCard({
  eyebrow,
  title,
  subtitle,
  stats,
  actions,
  tone = "primary",
}: HanimeHeroCardProps) {
  return (
    <GlassSurface material="content">
      <VStack
        alignment="leading"
        spacing={GIRIGIRI_GLASS_TOKENS.spacing.regular}
        padding={18}
        frame={{ maxWidth: "infinity", alignment: "leading" }}
      >
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        {eyebrow ? (
          <Text font="caption" fontWeight="semibold" foregroundStyle="systemPink" lineLimit={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text font="title2" fontWeight="bold" lineLimit={2} multilineTextAlignment="leading">
          {title}
        </Text>
        <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={3} multilineTextAlignment="leading">
          {subtitle}
        </Text>
      </VStack>

      {stats && stats.length > 0 ? (
        <HStack spacing={0} frame={{ maxWidth: "infinity" }}> 
          {stats.map((item) => (
            <HanimeStatTile key={item.title} {...item} />
          ))}
        </HStack>
      ) : null}

      {actions ? (
        <HStack spacing={GIRIGIRI_GLASS_TOKENS.spacing.compact} frame={{ maxWidth: "infinity" }}> 
          {actions}
        </HStack>
      ) : null}
      </VStack>
    </GlassSurface>
  )
}

export function HanimeStatTile({ title, value, icon }: HanimeHeroStat) {
  return (
    <VStack
      alignment="center"
      spacing={icon ? 5 : 2}
      frame={{ maxWidth: "infinity", minHeight: 62, alignment: "center" }}
      padding={{ horizontal: 4, vertical: 8 }}
    >
      {icon ? <Image systemName={icon} font="caption" tint="systemPink" /> : null}
      <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{title}</Text>
      <Text font="headline" lineLimit={1}>{value}</Text>
    </VStack>
  )
}

type HanimeActionPillProps = {
  title: string
  systemImage: string
  action: () => void
  disabled?: boolean
  role?: "cancel" | "destructive"
  tone?: "primary" | "secondary" | "danger"
}

export function HanimeActionPill({
  title,
  systemImage,
  action,
  disabled = false,
  role,
  tone = "primary",
}: HanimeActionPillProps) {
  return (
    <Button
      action={action}
      disabled={disabled}
      role={role}
      buttonStyle="plain"
      frame={{ maxWidth: "infinity", minHeight: 44 }}
      contentShape="capsule"
      glassEffect={glassEffectFor("navigation", "capsule", true)}
      glassEffectTransition="materialize"
    >
      <HanimeActionPillContent title={title} systemImage={systemImage} tone={tone} />
    </Button>
  )
}

export function HanimeActionPillContent({
  title,
  systemImage,
  tone = "primary",
}: {
  title: string
  systemImage: string
  tone?: "primary" | "secondary" | "danger"
}) {
  const foregroundStyle = tone === "danger" ? "systemRed" : tone === "secondary" ? "label" : "systemPink"

  return (
    <HStack
      spacing={6}
      frame={{ maxWidth: "infinity", minHeight: 44, alignment: "center" }}
      padding={{ horizontal: 12, vertical: 9 }}
    >
      <Image systemName={systemImage} font="caption" foregroundStyle={foregroundStyle} />
      <Text font="subheadline" fontWeight="semibold" foregroundStyle={foregroundStyle} lineLimit={1}>
        {title}
      </Text>
    </HStack>
  )
}
