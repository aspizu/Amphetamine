import {invoke} from "@tauri-apps/api/core"

export interface ModMetadata {
  id: number
  filename: string
  title: string
  format: string
  size: string
  md5: string
  channels: number
  genre: string
  downloads: number
  favourites: number
  instrumentText: string
  downloadUrl: string
}

export function getModuleMetadata(id: number): Promise<ModMetadata> {
  return invoke<ModMetadata>("get_module_metadata", {id})
}
