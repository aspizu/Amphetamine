import localforage from "localforage"
import {create} from "zustand"
import {createJSONStorage, persist} from "zustand/middleware"
import {immer} from "zustand/middleware/immer"

export enum RepeatMode {
  OFF,
  ONE,
  ALL,
}

const _storage = localforage.createInstance({
  name: "amphetamine",
  storeName: "store",
})

interface State {
  queue: number[]
  queueHead: number
  repeatHead: number
  repeatMode: RepeatMode
  volume: number
  balance: number
  docked: boolean
}

export type Store = State

export const useStore = create<Store>()(
  persist(
    immer(() => ({
      queue: [60693],
      queueHead: 0,
      repeatHead: 0,
      repeatMode: RepeatMode.OFF,
      volume: 1,
      balance: 0.25,
      docked: false,
    })),
    {
      name: "app",
      storage: createJSONStorage(() => _storage),
      version: 2,
      migrate: (persistedState, version) => {
        let state = persistedState as Store
        if (version === 0 && state.queue.length === 0) {
          state = {...state, queue: [60693], queueHead: 0}
        }
        if (version < 2) state = {...state, balance: 0.25}
        return state
      },
    },
  ),
)
