import {err, ok, type Result} from "neverthrow"
import {create} from "zustand"

import {commands} from "../commands.gen"
import {AudioPlayback, PlaybackState} from "./audio-playback"
import {branchOff} from "./background"
import {renderModuleToWav} from "./libopenmpt"
import {getModule} from "./module"
import {getModuleInfo} from "./module-info"
import {RepeatMode, useStore} from "./store"

const _audio = new AudioPlayback(() =>
  branchOff(_handleEnded, "advance queue after song ended"),
)
let _loadedModuleId: number | null = null
const _preloadedWavs = new Map<number, Promise<Result<ArrayBuffer, Error>>>()
let _loadId = 0

export const usePlayerState = create<{loadingModuleId: number | null}>(() => ({
  loadingModuleId: null,
}))

_audio.setVolume(useStore.getState().volume)
_audio.setMix(useStore.getState().balance)

export const getTime = _audio.getTime.bind(_audio)
export const getDuration = _audio.getDuration.bind(_audio)
export const setVolume = _audio.setVolume.bind(_audio)
export const setMix = _audio.setMix

function _toError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value))
}

async function _renderSong(moduleId: number): Promise<Result<ArrayBuffer, Error>> {
  try {
    const module = await getModule(moduleId)
    if (module.isErr()) {
      return err(module.error)
    }
    return await renderModuleToWav(module.value)
  } catch (error) {
    return err(_toError(error))
  }
}

function _takeWav(moduleId: number): Promise<Result<ArrayBuffer, Error>> {
  const wav = _preloadedWavs.get(moduleId)
  if (wav) {
    _preloadedWavs.delete(moduleId)
    return wav
  }

  return _renderSong(moduleId)
}

function _preloadNextSong() {
  const store = useStore.getState()
  let next = store.queueHead + 1
  if (next >= store.queue.length) {
    if (store.repeatMode !== RepeatMode.ALL) return
    next = store.repeatHead
  }

  const moduleId = store.queue[next]
  if (_preloadedWavs.has(moduleId)) return
  _preloadedWavs.set(moduleId, _renderSong(moduleId))
}

export async function loadSong(): Promise<Result<boolean, Error>> {
  const store = useStore.getState()
  const moduleId = store.queue[store.queueHead]
  if (moduleId === undefined) {
    return ok(false)
  }

  const loadId = ++_loadId
  usePlayerState.setState({loadingModuleId: moduleId})

  try {
    const wav = await _takeWav(moduleId)
    if (wav.isErr()) {
      return err(wav.error)
    }

    const buffer = await _audio.context.decodeAudioData(wav.value)
    const latest = useStore.getState()
    if (loadId !== _loadId || latest.queue[latest.queueHead] !== moduleId) {
      return ok(false)
    }

    _audio.load(buffer)
    _loadedModuleId = moduleId
    _preloadNextSong()
    return ok(true)
  } catch (error) {
    return err(_toError(error))
  } finally {
    if (loadId === _loadId) {
      usePlayerState.setState({loadingModuleId: null})
    }
  }
}

export async function play() {
  if (await _audio.play()) {
    branchOff(_pushDiscordActivity, "_pushDiscordActivity from play()")
  }
}

export function pause() {
  if (_audio.pause()) {
    branchOff(_pushDiscordActivity, "_pushDiscordActivity from pause()")
  }
}

export function stop() {
  if (_audio.stop()) {
    branchOff(_pushDiscordActivity, "_pushDiscordActivity from stop()")
  }
}

export function setTime(time: number) {
  if (_audio.setTime(time)) {
    branchOff(_pushDiscordActivity, "_pushDiscordActivity from setTime()")
  }
}

export function isPaused() {
  return _audio.state === PlaybackState.PAUSED
}

export function isEnded() {
  return _audio.state === PlaybackState.STOPPED
}

export function isPlaying() {
  return _audio.state === PlaybackState.PLAYING
}

export function isLoaded() {
  const store = useStore.getState()
  return _loadedModuleId !== null && _loadedModuleId === store.queue[store.queueHead]
}

function _skip(delta: number) {
  const store = useStore.getState()
  if (store.queue.length < 1) {
    return false
  }

  let next = store.queueHead + delta
  if (next < 0) {
    return false
  }
  if (next >= store.queue.length) {
    if (store.repeatMode !== RepeatMode.ALL) {
      return false
    }
    next = store.repeatHead
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

async function _handleEnded() {
  if (useStore.getState().repeatMode === RepeatMode.ONE) {
    await play()
    return
  }
  if (skipForward()) {
    const loaded = await loadSong()
    if (loaded.isErr()) {
      console.error("Failed to load next song", loaded.error)
      await _pushDiscordActivity()
      return
    }
    if (loaded.value) {
      await play()
    }
  } else {
    await _pushDiscordActivity()
  }
}

async function _pushDiscordActivity() {
  if (!isPlaying()) {
    await commands.clearActivity()
    return
  }

  const store = useStore.getState()
  if (store.queue.length < 1) return
  const moduleInfo = await getModuleInfo(store.queue[store.queueHead])
  const title = moduleInfo.title.trim() || moduleInfo.filename.trim() || "Unknown"
  const now = Date.now() / 1000
  const start = now - getTime()
  await commands.setActivity({
    activityType: "listening",
    details: title,
    state:
      moduleInfo.artists.map((artist) => artist.name.trim()).join(", ") ||
      moduleInfo.filename,
    timestamps: {
      start: Math.floor(start),
      end: Math.ceil(start + getDuration()),
    },
    buttons: [
      {
        label: "View",
        url: `https://modarchive.org/index.php?request=view_by_moduleid&query=${moduleInfo.id}`,
      },
    ],
  })
}
