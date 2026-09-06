import { ProgressView, Text, VStack } from "scripting"
import { GlassStatusSurface } from "../../design-glass"

type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <GlassStatusSurface>
      <VStack spacing={14} padding={{ horizontal: 24, vertical: 26 }} frame={{ maxWidth: "infinity", minHeight: 160 }}>
        <ProgressView />
        <Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
          {message || "加载中…"}
        </Text>
      </VStack>
    </GlassStatusSurface>
  )
}