import {beforeEach, describe, expect, it, vi} from "vitest"

const playback = vi.hoisted(() => ({
  audio: {
    srcObject: null as Blob | null,
    play: vi.fn(async () => {}),
    addEventListener: vi.fn(),
  },
  getModule: vi.fn(async () => ({isErr: () => false, value: new Uint8Array()})),
  renderModuleToWav: vi.fn(async () => ({isErr: () => false, value: new Uint8Array()})),
}))

vi.stubGlobal(
  "Audio",
  vi.fn(function () {
    return playback.audio
  }),
)

vi.mock("localforage", () => ({
  default: {
    createInstance: () => {
      const values = new Map<string, string>()
      return {
        getItem: async (key: string) => values.get(key) ?? null,
        setItem: async (key: string, value: string) => {
          values.set(key, value)
          return value
        },
        removeItem: async (key: string) => {
          values.delete(key)
        },
      }
    },
  },
}))

vi.mock("./module", () => ({getModule: playback.getModule}))
vi.mock("./libopenmpt", () => ({renderModuleToWav: playback.renderModuleToWav}))

const {
  addToQueue,
  clearQueue,
  moveQueueItem,
  playNext,
  removeFromQueue,
  setQueue,
  setQueueHead,
  setRepeatHead,
  skipSong,
} = await import("./player")
import {useStore} from "./store"

describe("player queue", () => {
  beforeEach(() => {
    setQueue([10, 20, 30, 40])
    playback.audio.play.mockClear()
  })

  it("adds songs at the tail or just after the current song", () => {
    setQueueHead(1)
    setRepeatHead(2)
    addToQueue(50, 60)
    playNext(25, 26)

    expect(useStore.getState()).toMatchObject({
      queue: [10, 20, 25, 26, 30, 40, 50, 60],
      queueHead: 1,
      repeatHead: 4,
    })
  })

  it("keeps the current and repeat songs when an item is removed", () => {
    setQueueHead(2)
    setRepeatHead(3)
    removeFromQueue(1)

    expect(useStore.getState()).toMatchObject({
      queue: [10, 30, 40],
      queueHead: 1,
      repeatHead: 2,
    })

    removeFromQueue(1)
    expect(useStore.getState()).toMatchObject({queue: [10, 40], queueHead: 1, repeatHead: 1})
  })

  it("keeps the current and repeat songs when an item moves", () => {
    setQueueHead(1)
    setRepeatHead(3)
    moveQueueItem(0, 2)

    expect(useStore.getState()).toMatchObject({
      queue: [20, 30, 10, 40],
      queueHead: 0,
      repeatHead: 3,
    })

    moveQueueItem(3, 1)
    expect(useStore.getState()).toMatchObject({
      queue: [20, 40, 30, 10],
      queueHead: 0,
      repeatHead: 1,
    })
  })

  it("repeats from repeatHead after reaching the queue tail", async () => {
    setQueueHead(3)
    setRepeatHead(1)

    await skipSong(1)
    expect(useStore.getState().queueHead).toBe(1)
    await skipSong(5)
    expect(useStore.getState().queueHead).toBe(3)
    expect(playback.audio.play).toHaveBeenCalledTimes(2)
  })

  it("does not skip before the queue head or through an empty queue", async () => {
    await skipSong(-1)
    expect(useStore.getState().queueHead).toBe(0)

    clearQueue()
    await skipSong(1)
    expect(useStore.getState()).toMatchObject({queue: [], queueHead: 0, repeatHead: 0})
    expect(playback.audio.play).not.toHaveBeenCalled()
  })

  it("clamps heads when a new queue is set", () => {
    setQueue([10, 20], 20, -4)
    expect(useStore.getState()).toMatchObject({queueHead: 1, repeatHead: 0})
  })
})
