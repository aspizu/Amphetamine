export interface EmscriptenModuleOptions {
  locateFile?: (path: string, scriptDirectory: string) => string
  wasmBinary?: ArrayBuffer | Uint8Array
  print?: (text: string) => void
  printErr?: (text: string) => void
}

export interface LibopenmptEmscriptenModule {
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

export default function createLibopenmpt(
  options?: EmscriptenModuleOptions,
): Promise<LibopenmptEmscriptenModule>
