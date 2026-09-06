import { Button, HStack, Image, Spacer, VStack } from "scripting"
import { usePlayerState } from "../../class/player_state"
import { player } from "../../class/player"
import { PlayerInfo } from "./player_info"

export function MiniPlayer() {
  const { isPlaying, queue, currentIndex, playMode } = usePlayerState()
  const loops = playMode === "repeat-all" || playMode === "shuffle"
  const hasNext = loops || currentIndex < queue.length - 1

  return (
    <HStack
      spacing={14}
      padding={{ horizontal: 14, vertical: 10 }}
      background="secondarySystemBackground"
      clipShape={{ type: "rect", cornerRadius: 18 }}
      shadow={{ color: "rgba(0,0,0,0.10)", radius: 10, y: 4 }}
    >
      <PlayerInfo />
      <Spacer minLength={0} />
      <HStack spacing={10}>
        <Button accessibilityLabel={isPlaying ? "暂停" : "播放"} action={() => {
          if (isPlaying) {
            player.pause()
          } else {
            player.play()
          }
        }}>
          <Image systemName={isPlaying ? "pause.circle.fill" : "play.circle.fill"} font={30} tint="systemPink" />
        </Button>
        <Button action={() => player.next()} disabled={!hasNext} accessibilityLabel="下一首" accessibilityValue={hasNext ? "可用" : "队列中没有下一首"}>
          <Image systemName="forward.fill" foregroundStyle={hasNext ? "label" : "tertiaryLabel"} font="headline" />
        </Button>
      </HStack>
    </HStack>
  )
}
