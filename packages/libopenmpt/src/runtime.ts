import createLibopenmpt from "#libopenmpt"

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
  _openmpt_module_set_render_param(
    modulePtr: number,
    param: number,
    value: number,
  ): number
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

export async function loadLibopenmpt(
  options: LibopenmptModuleOptions = {},
): Promise<LibopenmptRuntime> {
  const wasmPath = new URL("../dist/libopenmpt.wasm", import.meta.url).href
  const wasmBinary = options.wasmBinary ?? (await _fetchWasmBinary(wasmPath))
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

async function _fetchWasmBinary(wasmPath: string): Promise<ArrayBuffer> {
  const response = await fetch(wasmPath)

  if (!response.ok) {
    throw new Error(`Could not load libopenmpt wasm: ${response.status}`)
  }

  return response.arrayBuffer()
}

export class StereoBuffers {
  leftPtr = 0
  rightPtr = 0
  private _frameCapacity = 0

  constructor(private readonly _runtime: LibopenmptRuntime) {}

  resize(frameCount: number): void {
    if (frameCount <= this._frameCapacity) return
    this.destroy()
    this.leftPtr = this._runtime._malloc(frameCount * Float32Array.BYTES_PER_ELEMENT)
    this.rightPtr = this._runtime._malloc(frameCount * Float32Array.BYTES_PER_ELEMENT)
    this._frameCapacity = frameCount
  }

  destroy(): void {
    if (this.leftPtr !== 0) {
      this._runtime._free(this.leftPtr)
      this.leftPtr = 0
    }
    if (this.rightPtr !== 0) {
      this._runtime._free(this.rightPtr)
      this.rightPtr = 0
    }
    this._frameCapacity = 0
  }
}
