import type {Result} from "neverthrow"
import {err, ok} from "neverthrow"

import {branchOff} from "./background"
import {renderModuleToWav} from "./libopenmpt"
import {getModule} from "./module"
import {useStore} from "./store"

export const player = new Audio()

export async function loadCurrentSong(): Promise<Result<void, Error>> {
  const state = useStore.getState()
  const id = state.queue[state.queueHead]
  if (id === undefined) {
    return err(new Error("the play queue is empty"))
  }
  const module = await getModule(id)
  if (module.isErr()) {
    return err(module.error)
  }
  const res = await renderModuleToWav(module.value)
  if (res.isErr()) {
    return err(res.error)
  }
  const wav = new Blob([res.value], {type: "audio/wav"})
  player.srcObject = wav
  return ok()
}

export async function skipSong(delta: number) {
  const newQueueHead = useStore.getState().queueHead + delta
  if (newQueueHead < 0) {
    return
  }
  if (newQueueHead >= useStore.getState().queue.length) {
    // TODO: add support for repeat modes
    return
  }
  useStore.setState((state) => {
    state.queueHead = newQueueHead
  })
  const res = await loadCurrentSong()
  if (res.isErr()) {
    console.error(res.error)
    return
  }
  await player.play()
}

player.addEventListener("ended", () => {
  branchOff(() => skipSong(1))
})
