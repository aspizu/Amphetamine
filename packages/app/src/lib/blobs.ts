import {encodeBase64} from "./utils"

let _opfsRoot: FileSystemDirectoryHandle | null = null

async function _getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return _opfsRoot ?? (_opfsRoot = await navigator.storage.getDirectory())
}

export async function getBlob(key: string) {
  const opfsRoot = await _getOpfsRoot()
  const fileHandle = await opfsRoot.getFileHandle(encodeBase64(key))
  const file = await fileHandle.getFile()
  return await file.bytes()
}

export async function putBlob(key: string, bytes: Uint8Array<ArrayBuffer>) {
  const opfsRoot = await _getOpfsRoot()
  const fileHandle = await opfsRoot.getFileHandle(encodeBase64(key), {create: true})
  const file = await fileHandle.createWritable({keepExistingData: false})
  await file.write({type: "write", data: bytes})
  await file.close()
}
