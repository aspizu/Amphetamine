// @vitest-environment jsdom

import {describe, expect, it} from "vitest"

import {getModuleInfo} from "./module-info"

describe("getModuleInfo", () => {
  it("scrapes live player metadata and artist IDs", async () => {
    await expect(getModuleInfo(212083)).resolves.toEqual({
      id: 212083,
      title: "UnreaL ][ / PM",
      filename: "2nd_pm.s3m",
      artists: [{id: 69185, name: "Purple Motion"}],
      format: "S3M",
      channels: 8,
      genre: null,
      addedAt: new Date("2000-12-24T00:00:00.000Z"),
    })
  })
})
