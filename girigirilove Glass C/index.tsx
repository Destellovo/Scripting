import { Navigation, Script } from "scripting"
import { hanimeDatabase } from "./class/hanime_database"
import { hanimeDownloadManager } from "./class/hanime_download_manager"
import { HomePage } from "./page/index"
import { BackgroundThemeProvider } from "./design-glass"

async function main() {
  try {
    await hanimeDatabase.init()
    await hanimeDownloadManager.restorePendingTasks()
    const result = await Navigation.present<"close" | undefined>({
      element: (
        <BackgroundThemeProvider>
          <HomePage />
        </BackgroundThemeProvider>
      ),
      modalPresentationStyle: "overFullScreen"
    })
    if (result === "close") {
      Script.exit()
    }
  } catch (e) {
    console.present().then(Script.exit)
    console.error(e)
  }
}

main()
