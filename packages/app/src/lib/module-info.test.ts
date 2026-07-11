// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from "vitest"

const cache = new Map<string, unknown>()

vi.mock("localforage", () => ({
  getItem: vi.fn(async (key: string) => cache.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: unknown) => cache.set(key, value)),
}))

import {getModuleInfo} from "./module-info"

describe("getModuleInfo", () => {
  beforeEach(() => cache.clear())

  it("scrapes live player metadata and caches it", async () => {
    const expected = {
      id: 212083,
      title: "UnreaL ][ / PM",
      filename: "2nd_pm.s3m",
      artists: [{id: 69185, name: "Purple Motion"}],
      format: "S3M",
      channels: 8,
      genre: null,
      addedAt: new Date(2000, 11, 24),
    }

    const first = await getModuleInfo(212083)
    expect(first).toEqual(expected)
    await expect(getModuleInfo(212083)).resolves.toBe(first)
  })
})
