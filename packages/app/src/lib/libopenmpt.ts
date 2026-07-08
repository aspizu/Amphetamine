import {err, ok, ResultAsync} from "neverthrow"

import type {RenderModuleToWavRequest, RenderModuleToWavResponse} from "../workers/libopenmpt"
import LibopenmptWorker from "../workers/libopenmpt?worker"

let _worker: Worker | undefined
let _queue = Promise.resolve()

function _getWorker(): Worker {
  return _worker ?? (_worker = new LibopenmptWorker())
}

function _renderModuleToWavNow(moduleBytes: Uint8Array): ResultAsync<ArrayBuffer, Error> {
  return _sendToWorker({moduleBytes}).andThen((response) =>
    response.ok ? ok(response.wavBytes) : err(new Error(response.error)),
  )
}

function _sendToWorker(
  request: RenderModuleToWavRequest,
): ResultAsync<RenderModuleToWavResponse, Error> {
  return ResultAsync.fromPromise(
    new Promise<RenderModuleToWavResponse>((resolve, reject) => {
      const worker = _getWorker()
      worker.onmessage = (event: MessageEvent<RenderModuleToWavResponse>) => {
        resolve(event.data)
      }
      worker.onerror = (event) => {
        _worker?.terminate()
        _worker = undefined
        reject(new Error(event.message))
      }
      worker.postMessage(request, [request.moduleBytes.buffer])
    }),
    _toError,
  )
}

function _toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export function renderModuleToWav(moduleBytes: Uint8Array): ResultAsync<ArrayBuffer, Error> {
  const job = ResultAsync.fromPromise(_queue, _toError).andThen(() =>
    _renderModuleToWavNow(moduleBytes),
  )
  _queue = job.match(
    () => undefined,
    () => undefined,
  )
  return job
}
