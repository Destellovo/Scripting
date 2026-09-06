import {
  Button,
  HStack,
  Image,
  List,
  Section,
  Text,
  VStack,
  useState,
} from "scripting"
import {
  EXTERNAL_PLAYERS,
  ExternalPlayerID,
  getDefaultExternalPlayerID,
  setDefaultExternalPlayerID,
} from "../../class/external_player"
import {
  glassListRowStyleProps,
  GlassListRow,
  PageBackground,
  ShelfHeader,
} from "../../design-glass"

export function PlayerSettingsView() {
  const [selectedPlayerID, setSelectedPlayerID] = useState<ExternalPlayerID>(() => getDefaultExternalPlayerID())

  function selectPlayer(id: ExternalPlayerID) {
    setDefaultExternalPlayerID(id)
    setSelectedPlayerID(id)
  }

  return (
    <List
      listStyle="inset"
      scrollContentBackground="hidden"
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle="默认播放器"
      navigationBarTitleDisplayMode="inline"
      background={<PageBackground />}
    >
      <Section>
        <ShelfHeader title="播放方式" caption="选择详情页默认使用的播放器" />
        {EXTERNAL_PLAYERS.map((player) => {
          const selected = selectedPlayerID === player.id
          return (
            <Button
              key={player.id}
              {...glassListRowStyleProps}
              action={() => selectPlayer(player.id)}
              accessibilityLabel={`${player.title}${selected ? "，当前默认播放器" : ""}`}
            >
              <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ vertical: 4 }}>
                <Image systemName={player.systemImage} font="title3" foregroundStyle="secondaryLabel" frame={{ width: 32, maxHeight: "infinity", alignment: "center" }} />
                <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">{player.title}</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2} multilineTextAlignment="leading">
                    {player.id === "system" ? "使用系统播放界面，支持全屏与画中画。" : `通过 URL Scheme 跳转到 ${player.title}，需要已安装对应 App。`}
                  </Text>
                </VStack>
                <Image
                  systemName={selected ? "checkmark.circle.fill" : "circle"}
                  font="title3"
                  foregroundStyle={selected ? "systemPink" : "tertiaryLabel"}
                  accessibilityHidden
                />
              </HStack>
            </Button>
          )
        })}
      </Section>

      <Section>
        <ShelfHeader title="使用说明" />
        <GlassListRow>
          <HStack alignment="center" spacing={14} frame={{ maxWidth: "infinity", alignment: "leading" }} padding={{ vertical: 6 }}>
            <Image systemName="arrow.up.forward.app" font="title3" foregroundStyle="secondaryLabel" frame={{ width: 32, maxHeight: "infinity", alignment: "center" }} />
            <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={6} multilineTextAlignment="leading">
              详情页仍会先让你选择播放话数。选择后，系统播放器直接打开媒体；第三方播放器会跳转到对应 App。若目标 App 未安装或无法接收链接，可返回这里切换为系统播放器。
            </Text>
          </HStack>
        </GlassListRow>
      </Section>
    </List>
  )
}
