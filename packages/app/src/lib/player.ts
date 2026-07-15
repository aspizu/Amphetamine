import {err, ok, type Result} from "neverthrow"

import {commands} from "../commands.gen"
import {branchOff} from "./background"
import {renderModuleToWav} from "./libopenmpt"
import {getModule} from "./module"
import {getModuleInfo} from "./module-info"
import {RepeatMode, useStore} from "./store"

const _audio = new Audio()

export async function loadSong(): Promise<Result<boolean, Error>> {
  const state = useStore.getState()
  if (state.queue.length < 1) {
    return ok(false)
  }
  const module = await getModule(state.queue[state.queueHead])
  if (module.isErr()) {
    return err(module.error)
  }
  const wav = await renderModuleToWav(module.value)
  if (wav.isErr()) {
    return err(wav.error)
  }
  _audio.srcObject = wav.value
  return ok(true)
}

export function play() {
  branchOff(_pushDiscordActivity, "_pushDiscordActivity from play()")
  return _audio.play()
}

export function pause() {
  _audio.pause()
}

export function stop() {
  _audio.pause()
  _audio.currentTime = 0
  branchOff(_pushDiscordActivity, "_pushDiscordActivity from stop()")
}

export function isPaused() {
  return _audio.paused
}

export function isEnded() {
  return _audio.ended
}

export function isPlaying() {
  return !_audio.paused && !_audio.ended
}

export function isLoaded() {
  return !!_audio.srcObject
}

function _skip(delta: number) {
  const state = useStore.getState()
  // no songs in queue
  if (state.queue.length < 1) {
    return false
  }
  let next = state.queueHead + delta
  // skipped towards the end of the queue
  if (next < 0) {
    return true
  }
  // skipped towards the end of the queue, and repeat is off
  if (next == state.queue.length && state.repeatMode !== RepeatMode.ALL) {
    return false
  }
  if (next == state.queue.length && state.repeatMode === RepeatMode.ALL) {
    next = state.repeatHead
  }
  useStore.setState((draft) => {
    draft.queueHead = next
  })
  return true
}

export function skipForward() {
  return _skip(1)
}

export function skipBack() {
  return _skip(-1)
}

_audio.addEventListener("ended", () =>
  branchOff(async () => {
    if (useStore.getState().repeatMode === RepeatMode.ONE) {
      _audio.currentTime = 0
      return
    }
    if (skipForward()) {
      await loadSong()
      await play()
    }
  }),
)

async function _pushDiscordActivity() {
  if (isEnded()) {
    await commands.clearActivity()
    return
  }
  const state = useStore.getState()
  if (state.queue.length < 1) return
  const moduleInfo = await getModuleInfo(state.queue[state.queueHead])
  await commands.setActivity({
    activityType: "listening",
    name: "Amphetamine",
    details: moduleInfo.title,
    state: moduleInfo.artists.map((a) => a.name).join(", "),
    buttons: [
      {
        label: "View at modarchive.org",
        url: `https://modarchive.org/index.php?request=view_by_moduleid&query=${moduleInfo.id}`,
      },
    ],
  })
}
