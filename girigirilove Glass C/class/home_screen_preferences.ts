const HOME_SCREEN_EXPANDED_TABS_STORAGE_KEY = "girigirilove_glass_c_home_screen_expanded_tabs_v1"

export function getHomeScreenExpandedTabs(): boolean {
  return Storage.get<boolean>(HOME_SCREEN_EXPANDED_TABS_STORAGE_KEY) === true
}

export function setHomeScreenExpandedTabs(enabled: boolean): void {
  Storage.set(HOME_SCREEN_EXPANDED_TABS_STORAGE_KEY, enabled)
}
