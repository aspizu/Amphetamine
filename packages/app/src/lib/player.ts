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
const _panner = _context.createStereoPanner()
const _fadeDuration = 0.25

let _source: AudioBufferSourceNode | null = null
let _fadingSource: AudioBufferSourceNode | null = null
let _buffer: AudioBuffer | null = null
let _state = _State.STOPPED
let _startedAt = 0
let _offset = 0

_gain.connect(_fade).connect(_panner).connect(_context.destination)
setVolume(useStore.getState().volume)
setBalance(useStore.getState().balance)

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

export async function loadSong(): Promise<Result<boolean, Error>> {
  const store = useStore.getState()
  if (store.queue.length < 1) return ok(false)

  const module = await getModule(store.queue[store.queueHead])
  if (module.isErr()) return err(module.error)

  const wav = await renderModuleToWav(module.value)
  if (wav.isErr()) return err(wav.error)

  try {
    const buffer = await _context.decodeAudioData(wav.value)
    _stopSource()
    if (_fadingSource) {
      _stopSource(_fadingSource)
      _fadingSource = null
    }
    _buffer = buffer
    _offset = 0
    _state = _State.STOPPED
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

export function setBalance(balance: number) {
  _panner.pan.value = Math.max(-1, Math.min(balance, 1))
}
