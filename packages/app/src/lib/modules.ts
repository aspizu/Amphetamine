import {BaseDirectory, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs"

import Database from "./sql"

const db = Database.get("sqlite:cache.db")

async function _modarchiveModuleDownloader(id: number): Promise<Blob> {
  const res = await fetch(`https://api.modarchive.org/downloads.php?moduleid=${id}`)
  if (!res.ok) {
    throw new Error(`failed to download module ${id} from api.modarchive.org`)
  }
  const blob = await res.blob()
  return blob
}

const moduleDownloader = _modarchiveModuleDownloader

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
      await db.execute`
        UPDATE module SET last_accessed_at = ${lastAccessedAt} WHERE id = ${id}
      `
      return new Blob([bytes])
    } catch {
      // The SQLite row can outlive the cache file, so fall through and refresh it.
    }
  }

  const blob = await moduleDownloader(id)
  await mkdir("modules", {
    baseDir: BaseDirectory.AppCache,
    recursive: true,
  })
  await writeFile(`modules/${id}.mod`, new Uint8Array(await blob.arrayBuffer()), {
    baseDir: BaseDirectory.AppCache,
  })
  await db.execute`
    INSERT INTO module (id, last_accessed_at)
    VALUES (${id}, ${lastAccessedAt})
    ON CONFLICT(id) DO UPDATE SET
      last_accessed_at = excluded.last_accessed_at
  `
  return blob
}

// TODO: add a way to invalidate the cache, even if sql columns are missing
