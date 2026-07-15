import type {Result} from "neverthrow"
import {err, ok} from "neverthrow"

import {branchOff} from "./background"
import {renderModuleToWav} from "./libopenmpt"
import {getModule} from "./module"
import {useStore} from "./store"

export const player = new Audio()

export function setQueue(queue: number[], queueHead = 0, repeatHead = 0) {
  useStore.setState((state) => {
    state.queue = [...queue]
    if (queue.length === 0) {
      state.queueHead = 0
      state.repeatHead = 0
      return
    }
    state.queueHead = Math.min(Math.max(queueHead, 0), queue.length - 1)
    state.repeatHead = Math.min(Math.max(repeatHead, 0), queue.length - 1)
  })
}

export function addToQueue(...ids: number[]) {
  useStore.setState((state) => {
    state.queue.push(...ids)
  })
}

export function playNext(...ids: number[]) {
  if (ids.length === 0) return
  useStore.setState((state) => {
    const index = Math.min(state.queueHead + 1, state.queue.length)
    state.queue.splice(index, 0, ...ids)
    if (state.queue.length > ids.length && state.repeatHead >= index) {
      state.repeatHead += ids.length
    }
  })
}

export function removeFromQueue(index: number) {
  useStore.setState((state) => {
    if (index < 0 || index >= state.queue.length) return
    state.queue.splice(index, 1)
    if (state.queue.length === 0) {
      state.queueHead = 0
      state.repeatHead = 0
      return
    }
    if (index < state.queueHead) state.queueHead--
    if (index < state.repeatHead) state.repeatHead--
    state.queueHead = Math.min(state.queueHead, state.queue.length - 1)
    state.repeatHead = Math.min(state.repeatHead, state.queue.length - 1)
  })
}

export function moveQueueItem(from: number, to: number) {
  useStore.setState((state) => {
    if (
      from < 0 ||
      from >= state.queue.length ||
      to < 0 ||
      to >= state.queue.length ||
      from === to
    ) {
      return
    }
    const [id] = state.queue.splice(from, 1)
    state.queue.splice(to, 0, id!)
    if (state.queueHead === from) {
      state.queueHead = to
    } else if (from < state.queueHead && state.queueHead <= to) {
      state.queueHead--
    } else if (to <= state.queueHead && state.queueHead < from) {
      state.queueHead++
    }
    if (state.repeatHead === from) {
      state.repeatHead = to
    } else if (from < state.repeatHead && state.repeatHead <= to) {
      state.repeatHead--
    } else if (to <= state.repeatHead && state.repeatHead < from) {
      state.repeatHead++
    }
  })
}

export function clearQueue() {
  useStore.setState((state) => {
    state.queue = []
    state.queueHead = 0
    state.repeatHead = 0
  })
}

export function setQueueHead(index: number) {
  useStore.setState((state) => {
    state.queueHead =
      state.queue.length === 0 ? 0 : Math.min(Math.max(index, 0), state.queue.length - 1)
  })
}

export function setRepeatHead(index: number) {
  useStore.setState((state) => {
    state.repeatHead =
      state.queue.length === 0 ? 0 : Math.min(Math.max(index, 0), state.queue.length - 1)
  })
}

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
  const state = useStore.getState()
  if (state.queue.length === 0) return
  const next = state.queueHead + delta
  if (next < 0 || next === state.queueHead) return
  useStore.setState((draft) => {
    if (next < draft.queue.length) {
      draft.queueHead = next
      return
    }
    const repeatLength = draft.queue.length - draft.repeatHead
    draft.queueHead = draft.repeatHead + ((next - draft.repeatHead) % repeatLength)
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

async function pushState() {}
