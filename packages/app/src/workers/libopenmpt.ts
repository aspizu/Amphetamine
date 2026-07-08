import {
  renderModuleToWavBuffer,
  type RenderModuleToWavBufferOptions,
} from "@amphetamine/libopenmpt"
import {ResultAsync} from "neverthrow"

export interface RenderModuleToWavRequest {
  moduleBytes: Uint8Array
  options?: RenderModuleToWavBufferOptions
}

export type RenderModuleToWavResponse =
  | {ok: true; wavBytes: ArrayBuffer}
  | {ok: false; error: string}

function _errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

self.onmessage = async (event: MessageEvent<RenderModuleToWavRequest>) => {
  const {moduleBytes, options} = event.data
  const result = await ResultAsync.fromPromise(
    renderModuleToWavBuffer(moduleBytes, options),
    _errorMessage,
  ).match(
    (wavBytes) => ({ok: true, wavBytes}) satisfies RenderModuleToWavResponse,
    (error) => ({ok: false, error}) satisfies RenderModuleToWavResponse,
  )

  if (result.ok) {
    self.postMessage(result, {transfer: [result.wavBytes]})
  } else {
    self.postMessage(result)
  }
}
