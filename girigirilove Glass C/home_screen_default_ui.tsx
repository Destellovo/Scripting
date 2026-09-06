import { NavigationStack } from "scripting"
import { BackgroundThemeProvider } from "./design-glass"
import { HomeScreenView } from "./page/home-screen"

export default function HomeScreenDefaultUI() {
  return (
    <BackgroundThemeProvider>
      <NavigationStack>
        <HomeScreenView />
      </NavigationStack>
    </BackgroundThemeProvider>
  )
}
