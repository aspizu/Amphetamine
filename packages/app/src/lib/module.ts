import {getItem, setItem} from "localforage"
import type {Result} from "neverthrow"
import {err, ok, ResultAsync} from "neverthrow"

import {branchOff} from "./background"
import {getBlob, putBlob} from "./blobs"

async function _modarchiveModuleDownloader(
  id: number,
): Promise<Result<Uint8Array<ArrayBuffer>, Error>> {
  const request = await ResultAsync.fromPromise(
    fetch(`https://api.modarchive.org/downloads.php?moduleid=${id}`),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )
  if (request.isErr()) {
    return err(request.error)
  }
  if (!request.value.ok) {
    return err(new Error(`failed to download module ${id} from api.modarchive.org`))
  }
  const body = await ResultAsync.fromPromise(request.value.arrayBuffer(), (error) =>
    error instanceof Error ? error : new Error(String(error)),
  )
  return body.map((bytes) => new Uint8Array(bytes))
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

export async function getModule(id: number): Promise<Result<Uint8Array<ArrayBuffer>, Error>> {
  const lastAccessedAt = new Date()
  const meta = await getItem<{lastAccessedAt: string}>(`module/${id}/blob-info`)
  if (meta === null) {
    try {
      const bytes = await getBlob(`module/${id}/blob`)
      if (_looksLikeModule(bytes)) {
        branchOff(async () => {
          await setItem(`module/${id}/blob`, {lastAccessedAt: lastAccessedAt.toISOString()})
        }, "update time for module blob cache")
        return ok(bytes)
      }
      // Cached module is corrupt, so fall through and refresh it.
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) {
        throw error
      }
      // The SQLite row can outlive the cache file, so fall through and refresh it.
    }
  }
  const moduleBytes = await _modarchiveModuleDownloader(id)
  if (moduleBytes.isErr()) {
    return err(moduleBytes.error)
  }
  if (!_looksLikeModule(moduleBytes.value)) {
    return err(new Error(`downloaded data for module ${id} does not look like a module`))
  }

  branchOff(async () => {
    await putBlob(`module/${id}/blob`, moduleBytes.value)
    await setItem(`module/${id}/blob-info`, {lastAccessedAt: lastAccessedAt.toISOString()})
  }, "store module blob in cache")
  return ok(moduleBytes.value)
}

// TODO: add a way to invalidate the cache, even if sql columns are missing
