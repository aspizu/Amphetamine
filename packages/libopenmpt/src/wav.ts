import {OpenMptModule} from "./module.js"
import {loadLibopenmpt} from "./runtime.js"
import type {LibopenmptModuleOptions, LibopenmptRuntime} from "./runtime.js"

const WAV_CHANNEL_COUNT = 2
const WAV_BYTES_PER_SAMPLE = 2
const WAV_HEADER_BYTES = 44

export interface WavRenderOptions {
  repeatCount?: number
  stereoSeparation?: number
  interpolationFilter?: number
  sampleRate?: number
  chunkFrames?: number
}

export interface RenderModuleToWavBufferOptions extends WavRenderOptions {
  runtimeOptions?: LibopenmptModuleOptions
}

export async function renderModuleToWavBuffer(
  moduleBytes: Uint8Array,
  options: RenderModuleToWavBufferOptions = {},
): Promise<ArrayBuffer> {
  const {runtimeOptions, ...renderOptions} = options
  const runtime = await loadLibopenmpt(runtimeOptions)
  return renderModuleBytesToWavBuffer(runtime, moduleBytes, renderOptions)
}

export function renderModuleBytesToWavBuffer(
  runtime: LibopenmptRuntime,
  moduleBytes: Uint8Array,
  options: WavRenderOptions = {},
): ArrayBuffer {
  const sampleRate = options.sampleRate ?? 48000
  const chunkFrames = options.chunkFrames ?? 4096
  const frameCount = _countRenderedFrames(
    runtime,
    moduleBytes,
    options,
    sampleRate,
    chunkFrames,
  )
  const sampleCount = frameCount * WAV_CHANNEL_COUNT
  const buffer = _createWavBuffer(sampleCount, sampleRate)
  const view = new DataView(buffer)
  const mod = OpenMptModule.fromBytes(runtime, moduleBytes, options)
  let offset = WAV_HEADER_BYTES

  try {
    for (;;) {
      const chunk = mod.readStereo(sampleRate, chunkFrames)
      if (chunk.frames === 0) break

      for (let frame = 0; frame < chunk.frames; frame += 1) {
        const left = Math.max(-1, Math.min(1, chunk.left[frame]))
        view.setInt16(offset, left < 0 ? left * 0x8000 : left * 0x7fff, true)
        offset += WAV_BYTES_PER_SAMPLE
        const right = Math.max(-1, Math.min(1, chunk.right[frame]))
        view.setInt16(offset, right < 0 ? right * 0x8000 : right * 0x7fff, true)
        offset += WAV_BYTES_PER_SAMPLE
      }
    }
  } finally {
    mod.destroy()
  }

  return buffer
}

function _countRenderedFrames(
  runtime: LibopenmptRuntime,
  moduleBytes: Uint8Array,
  options: WavRenderOptions,
  sampleRate: number,
  chunkFrames: number,
): number {
  const mod = OpenMptModule.fromBytes(runtime, moduleBytes, options)
  let frameCount = 0

  try {
    for (;;) {
      const chunk = mod.readStereo(sampleRate, chunkFrames)
      if (chunk.frames === 0) {
        return frameCount
      }

      frameCount += chunk.frames
    }
  } finally {
    mod.destroy()
  }
}

function _createWavBuffer(sampleCount: number, sampleRate: number): ArrayBuffer {
  const dataBytes = sampleCount * WAV_BYTES_PER_SAMPLE

  if (dataBytes > 0xffffffff - WAV_HEADER_BYTES) {
    throw new Error("Rendered audio is too large for a WAV file")
  }

  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes)
  const view = new DataView(buffer)

  _writeAscii(view, 0, "RIFF")
  view.setUint32(4, 36 + dataBytes, true)
  _writeAscii(view, 8, "WAVE")
  _writeAscii(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, WAV_CHANNEL_COUNT, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * WAV_CHANNEL_COUNT * WAV_BYTES_PER_SAMPLE, true)
  view.setUint16(32, WAV_CHANNEL_COUNT * WAV_BYTES_PER_SAMPLE, true)
  view.setUint16(34, WAV_BYTES_PER_SAMPLE * 8, true)
  _writeAscii(view, 36, "data")
  view.setUint32(40, dataBytes, true)

  return buffer
}
function _writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}
