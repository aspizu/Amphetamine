export interface LibopenmptModuleOptions {
  locateFile?: (path: string, scriptDirectory: string) => string
  wasmBinary?: ArrayBuffer | Uint8Array
  print?: (text: string) => void
  printErr?: (text: string) => void
}

export interface LibopenmptRuntime {
  HEAPU8: Uint8Array
  HEAPF32: Float32Array
  _malloc(size: number): number
  _free(ptr: number): void
  _openmpt_get_library_version(): number
  _openmpt_get_core_version(): number
  _openmpt_get_string(keyPtr: number): number
  _openmpt_free_string(ptr: number): void
  _openmpt_module_create_from_memory(
    dataPtr: number,
    dataSize: number,
    logFunc: number,
    logUser: number,
    initialCtls: number,
  ): number
  _openmpt_module_destroy(modulePtr: number): void
  _openmpt_module_read_float_stereo(
    modulePtr: number,
    sampleRate: number,
    frameCount: number,
    leftPtr: number,
    rightPtr: number,
  ): number
  _openmpt_module_get_duration_seconds(modulePtr: number): number
  _openmpt_module_get_position_seconds(modulePtr: number): number
  _openmpt_module_set_position_seconds(modulePtr: number, seconds: number): number
  _openmpt_module_set_repeat_count(modulePtr: number, repeatCount: number): void
  _openmpt_module_set_render_param(modulePtr: number, param: number, value: number): number
  _openmpt_module_get_metadata_keys(modulePtr: number): number
  _openmpt_module_get_metadata(modulePtr: number, keyPtr: number): number
  _openmpt_module_get_current_row(modulePtr: number): number
  _openmpt_module_get_current_pattern(modulePtr: number): number
  _openmpt_module_get_current_order(modulePtr: number): number
  _openmpt_module_get_num_orders(modulePtr: number): number
  _openmpt_module_get_num_patterns(modulePtr: number): number
  _openmpt_module_get_num_channels(modulePtr: number): number
  _openmpt_module_ctl_set(modulePtr: number, ctlPtr: number, valuePtr: number): number
}

type CreateLibopenmpt = (options?: LibopenmptModuleOptions) => Promise<LibopenmptRuntime>

const OPENMPT_MODULE_RENDER_STEREOSEPARATION_PERCENT = 2
const OPENMPT_MODULE_RENDER_INTERPOLATIONFILTER_LENGTH = 3

export interface ModuleRenderOptions {
  repeatCount?: number
  stereoSeparation?: number
  interpolationFilter?: number
}

export interface StereoChunk {
  frames: number
  left: Float32Array
  right: Float32Array
  ended: boolean
}

export interface WavRenderOptions {
  repeatCount?: number
  stereoSeparation?: number
  interpolationFilter?: number
  sampleRate?: number
  chunkFrames?: number
}

export interface RenderModuleToWavBlobOptions extends WavRenderOptions {
  runtimeOptions?: LibopenmptModuleOptions
}

export async function loadLibopenmpt(
  options: LibopenmptModuleOptions = {},
): Promise<LibopenmptRuntime> {
  const modulePath = new URL("./libopenmpt.js", import.meta.url).href
  const wasmPath = new URL("./libopenmpt.wasm", import.meta.url).href
  const {default: createLibopenmpt} = (await import(modulePath)) as {
    default: CreateLibopenmpt
  }

  const wasmBinary = options.wasmBinary ?? (await fetchWasmBinary(wasmPath))
  const locateFile =
    options.locateFile ??
    ((path: string) => {
      if (path.endsWith(".wasm")) {
        return wasmPath
      }

      return path
    })

  return createLibopenmpt({
    ...options,
    locateFile,
    wasmBinary,
  })
}

async function fetchWasmBinary(wasmPath: string): Promise<ArrayBuffer> {
  const response = await fetch(wasmPath)

  if (!response.ok) {
    throw new Error(`Could not load libopenmpt wasm: ${response.status}`)
  }

  return response.arrayBuffer()
}

export async function renderModuleToWavBlob(
  moduleBlob: Blob,
  options: RenderModuleToWavBlobOptions = {},
): Promise<Blob> {
  const {runtimeOptions, ...renderOptions} = options
  const runtime = await loadLibopenmpt(runtimeOptions)
  const moduleBytes = new Uint8Array(await moduleBlob.arrayBuffer())
  const wavBuffer = renderModuleBytesToWavBuffer(runtime, moduleBytes, renderOptions)

  return new Blob([wavBuffer], {type: "audio/wav"})
}

export class OpenMptModule {
  private leftPtr = 0
  private rightPtr = 0
  private frameCapacity = 0

  private constructor(
    private readonly runtime: LibopenmptRuntime,
    private modulePtr: number,
  ) {}

  static fromBytes(
    runtime: LibopenmptRuntime,
    bytes: Uint8Array,
    options: ModuleRenderOptions = {},
  ): OpenMptModule {
    const dataPtr = runtime._malloc(bytes.byteLength)
    runtime.HEAPU8.set(bytes, dataPtr)

    try {
      const modulePtr = runtime._openmpt_module_create_from_memory(
        dataPtr,
        bytes.byteLength,
        0,
        0,
        0,
      )

      if (modulePtr === 0) {
        throw new Error("libopenmpt could not load this module")
      }

      const mod = new OpenMptModule(runtime, modulePtr)
      mod.applyRenderOptions(options)
      return mod
    } finally {
      runtime._free(dataPtr)
    }
  }

  destroy(): void {
    if (this.modulePtr !== 0) {
      this.runtime._openmpt_module_destroy(this.modulePtr)
      this.modulePtr = 0
    }

    if (this.leftPtr !== 0) {
      this.runtime._free(this.leftPtr)
      this.leftPtr = 0
    }

    if (this.rightPtr !== 0) {
      this.runtime._free(this.rightPtr)
      this.rightPtr = 0
    }

    this.frameCapacity = 0
  }

  readStereo(sampleRate: number, frameCount: number): StereoChunk {
    this.assertAlive()
    this.ensureAudioBuffers(frameCount)

    const frames = this.runtime._openmpt_module_read_float_stereo(
      this.modulePtr,
      sampleRate,
      frameCount,
      this.leftPtr,
      this.rightPtr,
    )

    const leftOffset = this.leftPtr / Float32Array.BYTES_PER_ELEMENT
    const rightOffset = this.rightPtr / Float32Array.BYTES_PER_ELEMENT
    const left = this.runtime.HEAPF32.slice(leftOffset, leftOffset + frames)
    const right = this.runtime.HEAPF32.slice(rightOffset, rightOffset + frames)

    return {
      frames,
      left,
      right,
      ended: frames === 0,
    }
  }

  duration(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_duration_seconds(this.modulePtr)
  }

  position(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_position_seconds(this.modulePtr)
  }

  seek(seconds: number): number {
    this.assertAlive()
    return this.runtime._openmpt_module_set_position_seconds(this.modulePtr, seconds)
  }

  metadata(): Record<string, string> {
    this.assertAlive()

    const keysPtr = this.runtime._openmpt_module_get_metadata_keys(this.modulePtr)
    let keys: string[]
    try {
      keys = this.readString(keysPtr).split(";").filter(Boolean)
    } finally {
      if (keysPtr !== 0) {
        this.runtime._openmpt_free_string(keysPtr)
      }
    }

    const data: Record<string, string> = {}
    for (const key of keys) {
      const keyPtr = this.writeString(key)
      const valuePtr = this.runtime._openmpt_module_get_metadata(this.modulePtr, keyPtr)
      try {
        data[key] = this.readString(valuePtr)
      } finally {
        if (valuePtr !== 0) {
          this.runtime._openmpt_free_string(valuePtr)
        }
        this.runtime._free(keyPtr)
      }
    }

    return data
  }

  getCurrentRow(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_current_row(this.modulePtr)
  }

  getCurrentPattern(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_current_pattern(this.modulePtr)
  }

  getCurrentOrder(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_current_order(this.modulePtr)
  }

  getNumOrders(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_num_orders(this.modulePtr)
  }

  getNumPatterns(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_num_patterns(this.modulePtr)
  }

  getNumChannels(): number {
    this.assertAlive()
    return this.runtime._openmpt_module_get_num_channels(this.modulePtr)
  }

  ctlSet(ctl: string, value: string): boolean {
    this.assertAlive()

    const ctlPtr = this.writeString(ctl)
    const valuePtr = this.writeString(value)
    try {
      return this.runtime._openmpt_module_ctl_set(this.modulePtr, ctlPtr, valuePtr) === 1
    } finally {
      this.runtime._free(valuePtr)
      this.runtime._free(ctlPtr)
    }
  }

  private applyRenderOptions(options: ModuleRenderOptions): void {
    if (options.repeatCount !== undefined) {
      this.runtime._openmpt_module_set_repeat_count(this.modulePtr, options.repeatCount)
    }

    if (options.stereoSeparation !== undefined) {
      this.runtime._openmpt_module_set_render_param(
        this.modulePtr,
        OPENMPT_MODULE_RENDER_STEREOSEPARATION_PERCENT,
        options.stereoSeparation,
      )
    }

    if (options.interpolationFilter !== undefined) {
      this.runtime._openmpt_module_set_render_param(
        this.modulePtr,
        OPENMPT_MODULE_RENDER_INTERPOLATIONFILTER_LENGTH,
        options.interpolationFilter,
      )
    }
  }

  private ensureAudioBuffers(frameCount: number): void {
    if (frameCount <= this.frameCapacity) {
      return
    }

    if (this.leftPtr !== 0) {
      this.runtime._free(this.leftPtr)
    }

    if (this.rightPtr !== 0) {
      this.runtime._free(this.rightPtr)
    }

    this.leftPtr = this.runtime._malloc(frameCount * 4)
    this.rightPtr = this.runtime._malloc(frameCount * 4)
    this.frameCapacity = frameCount
  }

  private writeString(value: string): number {
    const encoded = new TextEncoder().encode(`${value}\0`)
    const ptr = this.runtime._malloc(encoded.byteLength)
    this.runtime.HEAPU8.set(encoded, ptr)
    return ptr
  }

  private readString(ptr: number): string {
    if (ptr === 0) {
      return ""
    }

    let end = ptr
    while (this.runtime.HEAPU8[end] !== 0) {
      end += 1
    }

    return new TextDecoder().decode(this.runtime.HEAPU8.subarray(ptr, end))
  }

  private assertAlive(): void {
    if (this.modulePtr === 0) {
      throw new Error("OpenMptModule has been destroyed")
    }
  }
}

export function renderModuleBytesToWavBuffer(
  runtime: LibopenmptRuntime,
  moduleBytes: Uint8Array,
  options: WavRenderOptions = {},
): ArrayBuffer {
  const sampleRate = options.sampleRate ?? 48000
  const chunkFrames = options.chunkFrames ?? 4096
  const mod = OpenMptModule.fromBytes(runtime, moduleBytes, options)
  const chunks: Float32Array[] = []
  let sampleCount = 0

  try {
    while (true) {
      const chunk = mod.readStereo(sampleRate, chunkFrames)
      if (chunk.ended) {
        break
      }

      const interleaved = new Float32Array(chunk.frames * 2)
      for (let frame = 0; frame < chunk.frames; frame += 1) {
        interleaved[frame * 2] = chunk.left[frame]
        interleaved[frame * 2 + 1] = chunk.right[frame]
      }

      sampleCount += interleaved.length
      chunks.push(interleaved)
    }
  } finally {
    mod.destroy()
  }

  return encodeWavPcm16(chunks, sampleCount, sampleRate)
}

function encodeWavPcm16(
  chunks: Float32Array[],
  sampleCount: number,
  sampleRate: number,
): ArrayBuffer {
  const bytesPerSample = 2
  const channelCount = 2
  const dataBytes = sampleCount * bytesPerSample

  if (dataBytes > 0xffffffff - 44) {
    throw new Error("Rendered audio is too large for a WAV file")
  }

  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)

  writeAscii(view, 0, "RIFF")
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(view, 8, "WAVE")
  writeAscii(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true)
  view.setUint16(32, channelCount * bytesPerSample, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeAscii(view, 36, "data")
  view.setUint32(40, dataBytes, true)

  let offset = 44
  for (const chunk of chunks) {
    for (const sample of chunk) {
      const clamped = Math.max(-1, Math.min(1, sample))
      const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
      view.setInt16(offset, pcm, true)
      offset += bytesPerSample
    }
  }

  return buffer
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}
