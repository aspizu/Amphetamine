import {StereoBuffers} from "./runtime.js"
import type {LibopenmptRuntime} from "./runtime.js"

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
}

export class OpenMptModule {
  private readonly _buffers: StereoBuffers

  private constructor(
    private readonly _runtime: LibopenmptRuntime,
    private _modulePtr: number,
  ) {
    this._buffers = new StereoBuffers(_runtime)
  }

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
      mod._applyRenderOptions(options)
      return mod
    } finally {
      runtime._free(dataPtr)
    }
  }

  destroy(): void {
    if (this._modulePtr !== 0) {
      this._runtime._openmpt_module_destroy(this._modulePtr)
      this._modulePtr = 0
    }

    this._buffers.destroy()
  }

  readStereo(sampleRate: number, frameCount: number): StereoChunk {
    this._assertAlive()
    this._buffers.resize(frameCount)

    const frames = this._runtime._openmpt_module_read_float_stereo(
      this._modulePtr,
      sampleRate,
      frameCount,
      this._buffers.leftPtr,
      this._buffers.rightPtr,
    )

    const leftOffset = this._buffers.leftPtr / Float32Array.BYTES_PER_ELEMENT
    const rightOffset = this._buffers.rightPtr / Float32Array.BYTES_PER_ELEMENT
    const left = this._runtime.HEAPF32.subarray(leftOffset, leftOffset + frames)
    const right = this._runtime.HEAPF32.subarray(rightOffset, rightOffset + frames)

    return {
      frames,
      left,
      right,
    }
  }

  duration(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_duration_seconds(this._modulePtr)
  }

  position(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_position_seconds(this._modulePtr)
  }

  seek(seconds: number): number {
    this._assertAlive()
    return this._runtime._openmpt_module_set_position_seconds(this._modulePtr, seconds)
  }

  metadata(): Record<string, string> {
    this._assertAlive()

    const keysPtr = this._runtime._openmpt_module_get_metadata_keys(this._modulePtr)
    let keys: string[]
    try {
      keys = this._readString(keysPtr).split(";").filter(Boolean)
    } finally {
      if (keysPtr !== 0) {
        this._runtime._openmpt_free_string(keysPtr)
      }
    }

    const data: Record<string, string> = {}
    for (const key of keys) {
      const keyPtr = this._writeString(key)
      const valuePtr = this._runtime._openmpt_module_get_metadata(
        this._modulePtr,
        keyPtr,
      )
      try {
        data[key] = this._readString(valuePtr)
      } finally {
        if (valuePtr !== 0) {
          this._runtime._openmpt_free_string(valuePtr)
        }
        this._runtime._free(keyPtr)
      }
    }

    return data
  }

  getCurrentRow(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_current_row(this._modulePtr)
  }

  getCurrentPattern(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_current_pattern(this._modulePtr)
  }

  getCurrentOrder(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_current_order(this._modulePtr)
  }

  getNumOrders(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_num_orders(this._modulePtr)
  }

  getNumPatterns(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_num_patterns(this._modulePtr)
  }

  getNumChannels(): number {
    this._assertAlive()
    return this._runtime._openmpt_module_get_num_channels(this._modulePtr)
  }

  ctlSet(ctl: string, value: string): boolean {
    this._assertAlive()

    const ctlPtr = this._writeString(ctl)
    const valuePtr = this._writeString(value)
    try {
      return (
        this._runtime._openmpt_module_ctl_set(this._modulePtr, ctlPtr, valuePtr) === 1
      )
    } finally {
      this._runtime._free(valuePtr)
      this._runtime._free(ctlPtr)
    }
  }

  private _applyRenderOptions(options: ModuleRenderOptions): void {
    if (options.repeatCount !== undefined) {
      this._runtime._openmpt_module_set_repeat_count(
        this._modulePtr,
        options.repeatCount,
      )
    }

    if (options.stereoSeparation !== undefined) {
      this._runtime._openmpt_module_set_render_param(
        this._modulePtr,
        OPENMPT_MODULE_RENDER_STEREOSEPARATION_PERCENT,
        options.stereoSeparation,
      )
    }

    if (options.interpolationFilter !== undefined) {
      this._runtime._openmpt_module_set_render_param(
        this._modulePtr,
        OPENMPT_MODULE_RENDER_INTERPOLATIONFILTER_LENGTH,
        options.interpolationFilter,
      )
    }
  }

  private _writeString(value: string): number {
    const encoded = new TextEncoder().encode(`${value}\0`)
    const ptr = this._runtime._malloc(encoded.byteLength)
    this._runtime.HEAPU8.set(encoded, ptr)
    return ptr
  }

  private _readString(ptr: number): string {
    if (ptr === 0) {
      return ""
    }

    let end = ptr
    while (this._runtime.HEAPU8[end] !== 0) {
      end += 1
    }

    return new TextDecoder().decode(this._runtime.HEAPU8.subarray(ptr, end))
  }

  private _assertAlive(): void {
    if (this._modulePtr === 0) {
      throw new Error("OpenMptModule has been destroyed")
    }
  }
}
