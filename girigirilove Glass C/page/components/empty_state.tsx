import { Button, HStack, Image, Text, VStack } from "scripting"
import { GlassStatusSurface } from "../../design-glass"

type EmptyStateProps = {
  icon: string
  title: string
  message: string
  actionTitle?: string
  action?: () => void
}

export function EmptyState({ icon, title, message, actionTitle, action }: EmptyStateProps) {
  return (
    <GlassStatusSurface>
      <VStack spacing={14} padding={{ horizontal: 24, vertical: 24 }} frame={{ maxWidth: "infinity", minHeight: 176 }}>
        <Image systemName={icon} font={30} foregroundStyle="tertiaryLabel" frame={{ width: 48, height: 48 }} />
        <VStack spacing={4}>
          <Text font="subheadline" fontWeight="semibold" multilineTextAlignment="center">{title}</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
            {message}
          </Text>
        </VStack>
        {action && actionTitle ? (
          <Button action={action} buttonStyle="plain" frame={{ minHeight: 44 }}>
            <HStack spacing={6} padding={{ horizontal: 16, vertical: 11 }} frame={{ minHeight: 44 }}>
              <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">{actionTitle}</Text>
            </HStack>
          </Button>
        ) : null}
      </VStack>
    </GlassStatusSurface>
  )
}
