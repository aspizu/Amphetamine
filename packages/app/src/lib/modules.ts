import {BaseDirectory, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs"

import {branchOff} from "./background"
import Database from "./sql"

const db = Database.get("sqlite:cache.db")

async function _modarchiveModuleDownloader(id: number): Promise<Uint8Array> {
  const res = await fetch(`https://api.modarchive.org/downloads.php?moduleid=${id}`)
  if (!res.ok) {
    throw new Error(`failed to download module ${id} from api.modarchive.org`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

// THANKS: Composer 2.5 I WAS BLASTING MY HEAD as to why the hell
// was cached songs not loading because of a race condition between caching
// and rendering.

function _moduleBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes)
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
  const row = await db.select<{id: number}[]>`
    SELECT id FROM module WHERE id = ${id}
  `
  if (row.length > 0) {
    try {
      const bytes = await readFile(`modules/${id}.mod`, {
        baseDir: BaseDirectory.AppCache,
      })
      if (_looksLikeModule(bytes)) {
        branchOff(async () => {
          await db.execute`
            UPDATE module SET last_accessed_at = ${lastAccessedAt} WHERE id = ${id}
          `
        })
        return _moduleBytes(bytes)
      }
    } catch {
      // The SQLite row can outlive the cache file, so fall through and refresh it.
    }
  }
  const moduleBytes = await _modarchiveModuleDownloader(id)
  if (!_looksLikeModule(moduleBytes)) {
    throw new Error(`downloaded data for module ${id} does not look like a module`)
  }

  const cacheBytes = _moduleBytes(moduleBytes)
  branchOff(async () => {
    await mkdir("modules", {
      baseDir: BaseDirectory.AppCache,
      recursive: true,
    })
    await writeFile(`modules/${id}.mod`, cacheBytes, {
      baseDir: BaseDirectory.AppCache,
    })
    await db.execute`
      INSERT INTO module (id, last_accessed_at)
      VALUES (${id}, ${lastAccessedAt})
      ON CONFLICT(id) DO UPDATE SET
        last_accessed_at = excluded.last_accessed_at
    `
  })
  return _moduleBytes(moduleBytes)
}

// TODO: add a way to invalidate the cache, even if sql columns are missing
