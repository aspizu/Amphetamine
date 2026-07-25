import {branchOff} from "./background"
import * as player from "./player"
import {useStore} from "./store"

export function playPlaylist(modules: number[], selectedId: number) {
  const selectedIndex = modules.indexOf(selectedId)
  if (selectedIndex === -1) return

  useStore.setState((draft) => {
    const playlistModules = new Set(modules)
    draft.queue = draft.queue.filter((moduleId) => !playlistModules.has(moduleId))
    const playlistStart = draft.queue.length
    draft.queue.push(...modules)
    draft.queueHead = playlistStart + selectedIndex
    draft.repeatHead = playlistStart
  })

  branchOff(async () => {
    const result = await player.loadSong()
    if (result.isErr()) {
      console.error("Failed to load song", result.error)
      return
    }
    if (result.value) await player.play()
  }, "play playlist")
}
