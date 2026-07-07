const MODARCHIVE_DOWNLOAD_URL = "https://api.modarchive.org/downloads.php"

export interface ModArchiveDownload {
  moduleId: number
  blob: Blob
}

export interface DownloadModOptions {
  signal?: AbortSignal
}

export async function downloadModFromModArchive(
  moduleId: number,
  options: DownloadModOptions = {},
): Promise<ModArchiveDownload> {
  const url = new URL(MODARCHIVE_DOWNLOAD_URL)
  url.searchParams.set("moduleid", String(moduleId))

  const response = await fetch(url, {
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`Could not download module ${moduleId}: ${response.status}`)
  }

  return {
    moduleId,
    blob: await response.blob(),
  }
}
