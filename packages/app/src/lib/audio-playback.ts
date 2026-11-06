import {createStereoCrossmix} from "./stereo-crossmix"

export enum PlaybackState {
  STOPPED,
  PLAYING,
  PAUSED,
}

export class AudioPlayback {
  readonly context = new AudioContext()
  state = PlaybackState.STOPPED
  private readonly _gain = this.context.createGain()
  private readonly _fade = this.context.createGain()
  private readonly _crossmix = createStereoCrossmix(this.context, this._fade)
  private readonly _fadeDuration = 0.25
  private _source: AudioBufferSourceNode | null = null
  private _fadingSource: AudioBufferSourceNode | null = null
  private _buffer: AudioBuffer | null = null
  private _startedAt = 0
  private _offset = 0

  constructor(private readonly _onEnded: () => void) {
    this._gain.connect(this._fade)
    this._crossmix.output.connect(this.context.destination)
  }

  load(buffer: AudioBuffer) {
    this._stopSource()
    if (this._fadingSource) {
      this._stopSource(this._fadingSource)
      this._fadingSource = null
    }
    this._buffer = buffer
    this._offset = 0
    this.state = PlaybackState.STOPPED
  }

  async play() {
    if (this.state === PlaybackState.PLAYING || !this._buffer) {
      return false
    }
    await this.context.resume()
    return this._startSource()
  }

  pause() {
    if (this.state !== PlaybackState.PLAYING) {
      return false
    }
    this._offset = this.getTime()
    this.state = PlaybackState.PAUSED
    this._fadeOutSource()
    return true
  }

  stop() {
    if (this.state === PlaybackState.STOPPED && this._offset === 0) {
      return false
    }
    this.state = PlaybackState.STOPPED
    this._offset = 0
    this._fadeOutSource()
    return true
  }

  getTime() {
    if (this.state !== PlaybackState.PLAYING) {
      return this._offset
    }
    return Math.min(
      this._offset + this.context.currentTime - this._startedAt,
      this.getDuration(),
    )
  }

  getDuration() {
    const duration = this._buffer?.duration ?? 0
    return Number.isFinite(duration) ? duration : 0
  }

  setTime(time: number) {
    const duration = this.getDuration()
    this._offset = Math.max(0, Math.min(time, duration))
    if (this.state !== PlaybackState.PLAYING) {
      return false
    }
    this._stopSource()
    if (this._offset < duration) {
      this._startSource()
    } else {
      this.state = PlaybackState.STOPPED
    }
    return true
  }

  setVolume(volume: number) {
    const normalized = Math.max(0, Math.min(volume, 1))
    this._gain.gain.value = normalized ** 2
  }

  setMix = this._crossmix.setMix

  private _stopSource(source = this._source) {
    if (!source) return
    source.stop()
    source.disconnect()
    if (this._source === source) {
      this._source = null
    }
  }

  private _fadeOutSource() {
    if (!this._source) return
    const source = this._source
    const now = this.context.currentTime
    this._source = null
    this._fadingSource = source
    source.addEventListener(
      "ended",
      () => {
        source.disconnect()
        if (this._fadingSource === source) {
          this._fadingSource = null
        }
      },
      {once: true},
    )
    this._fade.gain.cancelAndHoldAtTime(now)
    this._fade.gain.linearRampToValueAtTime(0, now + this._fadeDuration)
    source.stop(now + this._fadeDuration)
  }

  private _startSource() {
    if (!this._buffer) {
      return false
    }
    if (this._fadingSource) {
      this._stopSource(this._fadingSource)
      this._fadingSource = null
    }
    const source = this.context.createBufferSource()
    source.buffer = this._buffer
    source.connect(this._gain)
    source.addEventListener(
      "ended",
      () => {
        if (this._source !== source) return
        source.disconnect()
        this._source = null
        this._offset = 0
        this.state = PlaybackState.STOPPED
        this._onEnded()
      },
      {once: true},
    )
    const now = this.context.currentTime
    this._fade.gain.cancelAndHoldAtTime(now)
    this._fade.gain.setValueAtTime(0, now)
    this._fade.gain.linearRampToValueAtTime(1, now + this._fadeDuration)
    source.start(0, this._offset)
    this._source = source
    this._startedAt = this.context.currentTime
    this.state = PlaybackState.PLAYING
    return true
  }
}
