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

self.addEventListener("message", (event: MessageEvent<RenderModuleToWavRequest>) => {
  const {moduleBytes, options} = event.data
  void ResultAsync.fromPromise(
    renderModuleToWavBuffer(moduleBytes, options),
    _errorMessage,
  ).match(
    (wavBytes) => {
      self.postMessage({ok: true, wavBytes} satisfies RenderModuleToWavResponse, {
        transfer: [wavBytes],
      })
    },
    (error) => {
      self.postMessage({ok: false, error} satisfies RenderModuleToWavResponse, {
        transfer: [],
      })
    },
  )
})
