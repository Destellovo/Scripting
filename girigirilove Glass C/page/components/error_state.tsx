import { Button, HStack, Image, Text, VStack } from "scripting"
import { GlassStatusSurface } from "../../design-glass"

type ErrorStateProps = {
  message: string
  onRetry: () => void
  title?: string
  hint?: string
  retryTitle?: string
}

export function ErrorState({
  message,
  onRetry,
  title = "暂时无法载入内容",
  hint = "请求未能完成。请检查当前网络或服务状态，然后重试。",
  retryTitle = "重新载入",
}: ErrorStateProps) {
  return (
    <GlassStatusSurface>
      <VStack spacing={14} padding={{ horizontal: 24, vertical: 24 }} frame={{ maxWidth: "infinity", minHeight: 176 }}>
        <Image systemName="exclamationmark.triangle" font={30} foregroundStyle="secondaryLabel" />
        <VStack spacing={4}>
          <Text font="subheadline" fontWeight="semibold" multilineTextAlignment="center">{title}</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
            {hint}
          </Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel" multilineTextAlignment="center">
            {message}
          </Text>
        </VStack>
        <Button action={onRetry} buttonStyle="plain" frame={{ minHeight: 44 }}>
          <HStack spacing={6} padding={{ horizontal: 16, vertical: 11 }} frame={{ minHeight: 44 }}>
            <Image systemName="arrow.clockwise" font="caption" foregroundStyle="label" />
            <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">{retryTitle}</Text>
          </HStack>
        </Button>
      </VStack>
    </GlassStatusSurface>
  )
}
