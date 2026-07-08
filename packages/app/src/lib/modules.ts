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
      branchOff(async () => {
        await db.execute`
          UPDATE module SET last_accessed_at = ${lastAccessedAt} WHERE id = ${id}
        `
      })
      return bytes
    } catch {
      // The SQLite row can outlive the cache file, so fall through and refresh it.
    }
  }
  const moduleBytes = await _modarchiveModuleDownloader(id)
  branchOff(async () => {
    await mkdir("modules", {
      baseDir: BaseDirectory.AppCache,
      recursive: true,
    })
    await writeFile(`modules/${id}.mod`, moduleBytes, {
      baseDir: BaseDirectory.AppCache,
    })
    await db.execute`
      INSERT INTO module (id, last_accessed_at)
      VALUES (${id}, ${lastAccessedAt})
      ON CONFLICT(id) DO UPDATE SET
        last_accessed_at = excluded.last_accessed_at
    `
  })
  return moduleBytes
}

// TODO: add a way to invalidate the cache, even if sql columns are missing
