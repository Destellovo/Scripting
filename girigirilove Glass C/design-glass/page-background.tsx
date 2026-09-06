import { Rectangle } from "scripting"
import { useBackgroundTheme } from "./background-theme"

export function PageBackground() {
  const { backgroundFill } = useBackgroundTheme()

  return (
    <Rectangle
      fill={backgroundFill}
      ignoresSafeArea={true}
      allowsHitTesting={false}
    />
  )
}
