// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from "vitest"

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  getBlob: vi.fn(),
  putBlob: vi.fn(),
  backgroundTasks: [] as Promise<unknown>[],
}))

vi.mock("localforage", () => ({
  getItem: mocks.getItem,
  setItem: mocks.setItem,
}))

vi.mock("./blobs", () => ({
  getBlob: mocks.getBlob,
  putBlob: mocks.putBlob,
}))

vi.mock("./background", () => ({
  branchOff: (task: () => Promise<unknown>) => {
    mocks.backgroundTasks.push(task())
  },
}))

import {getModule} from "./module"

describe("getModule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.backgroundTasks.length = 0
  })

  it("returns a valid cached module without downloading it", async () => {
    const bytes = new Uint8Array(20).fill(1)
    mocks.getItem.mockResolvedValue(null)
    mocks.getBlob.mockResolvedValue(bytes)
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await getModule(42)
    await Promise.all(mocks.backgroundTasks)

    expect(result.isOk() && result.value).toBe(bytes)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mocks.setItem).toHaveBeenCalledWith("module/42/blob", {
      lastAccessedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
  })

  it("downloads and caches a module when no cache lookup is needed", async () => {
    const bytes = new Uint8Array(20).fill(2)
    mocks.getItem.mockResolvedValue({lastAccessedAt: new Date().toISOString()})
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bytes))

    const result = await getModule(73)
    await Promise.all(mocks.backgroundTasks)

    expect(result.isOk() && result.value).toEqual(bytes)
    expect(fetch).toHaveBeenCalledWith("https://api.modarchive.org/downloads.php?moduleid=73")
    expect(mocks.putBlob).toHaveBeenCalledWith("module/73/blob", bytes)
    expect(mocks.setItem).toHaveBeenCalledWith("module/73/blob-info", {
      lastAccessedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
  })

  it("returns an error for an HTML response returned as a successful download", async () => {
    mocks.getItem.mockResolvedValue({lastAccessedAt: new Date().toISOString()})
    const html = new TextEncoder().encode("<html>not a module</html>")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(html))

    const result = await getModule(99)

    expect(result.isErr() && result.error.message).toBe(
      "downloaded data for module 99 does not look like a module",
    )
    expect(mocks.putBlob).not.toHaveBeenCalled()
  })

  it("returns a download error instead of rejecting", async () => {
    mocks.getItem.mockResolvedValue({lastAccessedAt: new Date().toISOString()})
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"))

    const result = await getModule(100)

    expect(result.isErr() && result.error.message).toBe("network down")
  })

  it("does not turn a cache code fault into an error result", async () => {
    mocks.getItem.mockRejectedValue(new TypeError("bad cache call"))

    await expect(getModule(101)).rejects.toThrow("bad cache call")
  })

  it("does not hide an unexpected blob store fault", async () => {
    mocks.getItem.mockResolvedValue(null)
    mocks.getBlob.mockRejectedValue(new TypeError("bad blob call"))

    await expect(getModule(102)).rejects.toThrow("bad blob call")
  })
})
