import {getItem, setItem} from "localforage"

import {branchOff} from "./background"
import {getBlob, putBlob} from "./blobs"

async function _modarchiveModuleDownloader(id: number) {
  const res = await fetch(`https://api.modarchive.org/downloads.php?moduleid=${id}`)
  if (!res.ok) {
    throw new Error(`failed to download module ${id} from api.modarchive.org`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

// NOTE: this only rules out cached HTML error pages (e.g. a 200 response
// with an HTML body from modarchive). It does NOT validate the file is a
// well-formed module. truncated/corrupt downloads CAN STILL PASS this check.

function _looksLikeModule(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 20) {
    return false
  }
  return bytes[0] !== 0x3c
}

export async function getModule(id: number) {
  const lastAccessedAt = new Date()
  const meta = await getItem<{lastAccessedAt: string}>(`module/${id}/blob-info`)
  if (meta === null) {
    try {
      const bytes = await getBlob(`module/${id}/blob`)
      if (_looksLikeModule(bytes)) {
        branchOff(async () => {
          await setItem(`module/${id}/blob`, {lastAccessedAt: lastAccessedAt.toISOString()})
        })
        return bytes
      }
      // Cached module is corrupt, so fall through and refresh it.
    } catch {
      // The SQLite row can outlive the cache file, so fall through and refresh it.
    }
  }
  const moduleBytes = await _modarchiveModuleDownloader(id)
  if (!_looksLikeModule(moduleBytes)) {
    throw new Error(`downloaded data for module ${id} does not look like a module`)
  }

  branchOff(async () => {
    await putBlob(`module/${id}/blob`, moduleBytes)
    await setItem(`module/${id}/blob-info`, {lastAccessedAt: lastAccessedAt.toISOString()})
  })
  return moduleBytes
}

// TODO: add a way to invalidate the cache, even if sql columns are missing
