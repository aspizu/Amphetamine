import {err, ok, ResultAsync} from "neverthrow"

import type {
  RenderModuleToWavRequest,
  RenderModuleToWavResponse,
} from "../workers/libopenmpt"

let _worker: Worker | undefined
let _queue = Promise.resolve()

function _toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export function renderModuleToWav(
  moduleBytes: Uint8Array,
): ResultAsync<ArrayBuffer, Error> {
  const job = ResultAsync.fromPromise(_queue, _toError)
    .andThen(() =>
      ResultAsync.fromPromise(
        new Promise<RenderModuleToWavResponse>((resolve, reject) => {
          const worker = (_worker ??= new Worker(
            new URL("../workers/libopenmpt.ts", import.meta.url),
            {type: "module"},
          ))
          const controller = new AbortController()
          worker.addEventListener(
            "message",
            (event: MessageEvent<RenderModuleToWavResponse>) => {
              controller.abort()
              resolve(event.data)
            },
            {once: true, signal: controller.signal},
          )
          worker.addEventListener(
            "error",
            (event) => {
              controller.abort()
              worker.terminate()
              _worker = undefined
              reject(new Error(event.message))
            },
            {once: true, signal: controller.signal},
          )
          const bytes = moduleBytes.slice()
          worker.postMessage({moduleBytes: bytes} satisfies RenderModuleToWavRequest, {
            transfer: [bytes.buffer],
          })
        }),
        _toError,
      ),
    )
    .andThen((response) =>
      response.ok ? ok(response.wavBytes) : err(new Error(response.error)),
    )
  _queue = job.match(
    () => undefined,
    () => undefined,
  )
  return job
}
