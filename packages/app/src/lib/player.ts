import {err, ok, type Result} from "neverthrow"

import {commands} from "../commands.gen"
import {branchOff} from "./background"
import {renderModuleToWav} from "./libopenmpt"
import {getModule} from "./module"
import {getModuleInfo} from "./module-info"
import {RepeatMode, useStore} from "./store"

enum _State {
  STOPPED,
  PLAYING,
  PAUSED,
}

const _context = new AudioContext()
const _gain = _context.createGain()
const _fade = _context.createGain()
const _crossmix = _createStereoCrossmix(_context, _fade)
const _fadeDuration = 0.25

let _source: AudioBufferSourceNode | null = null
let _fadingSource: AudioBufferSourceNode | null = null
let _buffer: AudioBuffer | null = null
const _preloadedWavs = new Map<number, Promise<Result<ArrayBuffer, Error>>>()
let _state = _State.STOPPED
let _startedAt = 0
let _offset = 0

_gain.connect(_fade)
_crossmix.output.connect(_context.destination)
setVolume(useStore.getState().volume)
_crossmix.setMix(useStore.getState().balance)

function _createStereoCrossmix(context: AudioContext, source: AudioNode, initialMix = 0.25) {
  const splitter = context.createChannelSplitter(2)
  const merger = context.createChannelMerger(2)

  const leftToLeft = context.createGain()
  const rightToLeft = context.createGain()
  const leftToRight = context.createGain()
  const rightToRight = context.createGain()

  source.connect(splitter)

  splitter.connect(leftToLeft, 0)
  splitter.connect(leftToRight, 0)
  splitter.connect(rightToLeft, 1)
  splitter.connect(rightToRight, 1)

  leftToLeft.connect(merger, 0, 0)
  rightToLeft.connect(merger, 0, 0)
  leftToRight.connect(merger, 0, 1)
  rightToRight.connect(merger, 0, 1)

  function _setMix(mix: number, smoothing = 0.02) {
    mix = Math.max(0, Math.min(0.5, mix))

    const direct = 1 - mix
    const now = context.currentTime

    leftToLeft.gain.setTargetAtTime(direct, now, smoothing)
    rightToRight.gain.setTargetAtTime(direct, now, smoothing)

    rightToLeft.gain.setTargetAtTime(mix, now, smoothing)
    leftToRight.gain.setTargetAtTime(mix, now, smoothing)
  }

  _setMix(initialMix)

  return {
    output: merger,
    setMix: _setMix,
  }
}

function _toError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value))
}

function _stopSource(source = _source) {
  if (!source) return
  source.onended = null
  source.stop()
  source.disconnect()
  if (_source === source) _source = null
}

function _fadeOutSource() {
  if (!_source) return

  const source = _source
  const now = _context.currentTime
  _source = null
  _fadingSource = source
  source.onended = () => {
    source.disconnect()
    if (_fadingSource === source) _fadingSource = null
  }
  _fade.gain.cancelAndHoldAtTime(now)
  _fade.gain.linearRampToValueAtTime(0, now + _fadeDuration)
  source.stop(now + _fadeDuration)
}

function _startSource() {
  if (!_buffer) return false

  if (_fadingSource) {
    _stopSource(_fadingSource)
    _fadingSource = null
  }

  const source = _context.createBufferSource()
  source.buffer = _buffer
  source.connect(_gain)
  source.onended = () => branchOff(() => _handleEnded(source), "advance queue after song ended")
  const now = _context.currentTime
  _fade.gain.cancelAndHoldAtTime(now)
  _fade.gain.setValueAtTime(0, now)
  _fade.gain.linearRampToValueAtTime(1, now + _fadeDuration)
  source.start(0, _offset)
  _source = source
  _startedAt = _context.currentTime
  _state = _State.PLAYING
  return true
}

async function _renderSong(moduleId: number): Promise<Result<ArrayBuffer, Error>> {
  try {
    const module = await getModule(moduleId)
    if (module.isErr()) return err(module.error)
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
  if (store.queue.length < 1) return ok(false)

  const moduleId = store.queue[store.queueHead]
  const wav = await _takeWav(moduleId)
  if (wav.isErr()) return err(wav.error)

  try {
    const buffer = await _context.decodeAudioData(wav.value)
    const latest = useStore.getState()
    if (latest.queue[latest.queueHead] !== moduleId) return ok(false)

    _stopSource()
    if (_fadingSource) {
      _stopSource(_fadingSource)
      _fadingSource = null
    }
    _buffer = buffer
    _offset = 0
    _state = _State.STOPPED
    _preloadNextSong()
    return ok(true)
  } catch (error) {
    return err(_toError(error))
  }
}

export async function play() {
  if (_state === _State.PLAYING || !_buffer) return
  await _context.resume()
  if (_startSource()) {
    branchOff(_pushDiscordActivity, "_pushDiscordActivity from play()")
  }
}

export function pause() {
  if (_state !== _State.PLAYING) return
  _offset = getTime()
  _state = _State.PAUSED
  _fadeOutSource()
  branchOff(_pushDiscordActivity, "_pushDiscordActivity from pause()")
}

export function stop() {
  if (_state === _State.STOPPED && _offset === 0) return
  _state = _State.STOPPED
  _offset = 0
  _fadeOutSource()
  branchOff(_pushDiscordActivity, "_pushDiscordActivity from stop()")
}

export function isPaused() {
  return _state === _State.PAUSED
}

export function isEnded() {
  return _state === _State.STOPPED
}

export function isPlaying() {
  return _state === _State.PLAYING
}

export function isLoaded() {
  return _buffer !== null
}

function _skip(delta: number) {
  const store = useStore.getState()
  if (store.queue.length < 1) return false

  let next = store.queueHead + delta
  if (next < 0) return false
  if (next >= store.queue.length) {
    if (store.repeatMode !== RepeatMode.ALL) return false
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

async function _handleEnded(source: AudioBufferSourceNode) {
  if (_source !== source) return

  source.disconnect()
  _source = null
  _offset = 0
  _state = _State.STOPPED

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
    if (loaded.value) await play()
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
    state: moduleInfo.artists.map((artist) => artist.name.trim()).join(", ") || undefined,
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

export function getTime() {
  if (_state !== _State.PLAYING) return _offset
  return Math.min(_offset + _context.currentTime - _startedAt, getDuration())
}

export function getDuration() {
  const duration = _buffer?.duration ?? 0
  return Number.isFinite(duration) ? duration : 0
}

export function setTime(time: number) {
  const duration = getDuration()
  _offset = Math.max(0, Math.min(time, duration))
  if (_state !== _State.PLAYING) return

  _stopSource()
  if (_offset < duration) {
    _startSource()
  } else {
    _state = _State.STOPPED
  }
  branchOff(_pushDiscordActivity, "_pushDiscordActivity from setTime()")
}

export function setVolume(volume: number) {
  const normalized = Math.max(0, Math.min(volume, 1))
  _gain.gain.value = normalized ** 2
}

export const setMix = _crossmix.setMix
