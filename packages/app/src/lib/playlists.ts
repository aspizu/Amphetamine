import {branchOff} from "./background"
import * as player from "./player"
import {useStore} from "./store"

export function createPlaylist(modules: number[] = []) {
  const playlists = useStore.getState().playlists
  const names = new Set(playlists.map((playlist) => playlist.name))
  let name = "Untitled playlist"
  for (let number = 2; names.has(name); number++) {
    name = `Untitled playlist ${number}`
  }
  const index = playlists.length
  useStore.setState((draft) => {
    draft.playlists.push({name, pl: [...modules]})
  })
  return index
}

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
    if (result.value) {
      await player.play()
    }
  }, "play playlist")
}
