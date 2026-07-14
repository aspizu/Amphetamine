import localforage from "localforage"
import {create} from "zustand"
import {createJSONStorage, persist} from "zustand/middleware"
import {immer} from "zustand/middleware/immer"

const _storage = localforage.createInstance({
  name: "amphetamine",
  storeName: "store",
})

interface State {
  queue: number[]
  queueHead: number
  repeatHead: number
}

export type Store = State

export const useStore = create<Store>()(
  persist(
    immer(() => ({
      queue: [60693],
      queueHead: 0,
      repeatHead: 0,
    })),
    {
      name: "app",
      storage: createJSONStorage(() => _storage),
      version: 1,
      migrate: (persistedState, version) => {
        const state = persistedState as Store
        if (version === 0 && state.queue.length === 0) {
          return {...state, queue: [60693], queueHead: 0}
        }
        return state
      },
    },
  ),
)
