import {parse} from "date-fns"
import {getItem, setItem} from "localforage"

import {branchOff} from "./background"

export interface ModuleInfo {
  id: number
  title: string
  filename: string
  artists: {id: number; name: string}[]
  format: string
  channels: number
  genre: string | null
  addedAt: Date | null
}

async function _proxiedModuleInfoFetcher(id: number): Promise<ModuleInfo> {
  const res = await fetch(
    `https://proxy.aspiz.uk/https://modarchive.org/index.php?request=view_by_moduleid&query=${id}&cors-origin=${location.origin}`,
  )
  if (!res.ok) {
    throw new Error(`failed to fetch module ${id} from modarchive.org (${res.status})`)
  }
  const doc = new DOMParser().parseFromString(await res.text(), "text/html")
  const heading = doc.querySelector("h1")
  const filename = heading
    ?.querySelector(".module-sub-header")
    ?.textContent?.trim()
    .replace(/^\(|\)$/g, "")
  const title = heading?.textContent?.trim().replace(/\s*\([^()]+\)\s*$/, "")
  const values = new Map<string, string>()
  for (const item of doc.querySelectorAll(".mod-page-archive-info li.stats")) {
    const match = item.textContent?.trim().match(/^([^:]+):\s*(.+)$/)
    if (match) values.set(match[1].trim(), match[2].trim())
  }
  const format = values.get("Format")
  const channels = Number(values.get("Channels"))
  if (!title || !filename || !format || !Number.isInteger(channels)) {
    throw new Error(`module ${id} has no usable metadata on modarchive.org`)
  }
  const genre = values.get("Genre")
  const summary = doc.querySelector(".mod-page-archive-info li.stats")?.textContent ?? ""
  const addedAtText = summary.match(/\bsince\s+(.+?)(?:\s+:D)?\s*$/)?.[1]
  const addedAt = addedAtText ? parse(addedAtText, "EEE do MMM yyyy", new Date(0)) : null
  return {
    id,
    title,
    filename,
    artists: Array.from(
      doc.querySelectorAll<HTMLAnchorElement>('.mod-page-archive-info a[href^="member.php?"]'),
    )
      .map((artist) => ({
        id: Number(artist.getAttribute("href")?.match(/\?(\d+)$/)?.[1]),
        name: artist.textContent.trim(),
      }))
      .filter((artist) => Number.isInteger(artist.id) && artist.name),
    format,
    channels,
    genre: genre && genre !== "n/a" ? genre : null,
    addedAt,
  }
}

export async function getModuleInfo(id: number): Promise<ModuleInfo> {
  const lastAccessedAt = new Date().toISOString()
  const cached = await getItem<{info: ModuleInfo; lastAccessedAt: string}>(`module/${id}/info`)
  if (cached !== null) {
    branchOff(async () => {
      await setItem(`module/${id}/info`, {...cached, lastAccessedAt})
    }, "update cache time for module info cache")
    return cached.info
  }
  const info = await _proxiedModuleInfoFetcher(id)
  branchOff(async () => {
    await setItem(`module/${id}/info`, {info, lastAccessedAt})
  }, "set cache data for module info cache")
  return info
}
