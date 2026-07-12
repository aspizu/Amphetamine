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
  playing: boolean
}

interface Actions {}

export const useStore = create<State & Actions>()(
  persist(
    immer((set) => ({
      queue: [],
      queueHead: 0,
      repeatHead: 0,
      playing: false,
    })),
    {
      name: "app",
      storage: createJSONStorage(() => _storage),
    },
  ),
)
