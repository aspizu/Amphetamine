import {createFileRoute} from "@tanstack/react-router"
import {useEffect, useState} from "react"

import {renderModuleToWav} from "#lib/libopenmpt"
import {getModuleMetadata, type ModMetadata} from "#lib/metadata"
import {getModule} from "#lib/modules"

function RouteComponent() {
  const [idInput, setIdInput] = useState("40475")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<ModMetadata | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  useEffect(() => {
    return () => {
      if (audioUrl !== null) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])
  async function lookupModule(id: number) {
    setLoading(true)
    setError(null)
    setMeta(null)
    if (audioUrl !== null) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    try {
      const [fetchedMeta, moduleBytes] = await Promise.all([
        getModuleMetadata(id),
        getModule(id),
      ])
      const wav = await renderModuleToWav(moduleBytes)
      if (wav.isErr()) {
        throw wav.error
      }
      setMeta(fetchedMeta)
      setAudioUrl(URL.createObjectURL(new Blob([wav.value], {type: "audio/wav"})))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }
  function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const id = Number(idInput)
    if (!Number.isInteger(id) || id <= 0) {
      setError("invalid module id")
      return
    }
    void lookupModule(id)
  }
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <form className="mx-auto flex w-full max-w-md gap-2" onSubmit={onSubmit}>
        <input
          className="flex-1 rounded-md border bg-card px-3 py-2 text-card-foreground"
          inputMode="numeric"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
          placeholder="modarchive module id"
        />
        <button
          className="rounded-md border bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          lookup
        </button>
      </form>
      {loading ? (
        <p className="mx-auto mt-4 w-full max-w-md text-muted-foreground">loading…</p>
      ) : null}
      {error ? <p className="mx-auto mt-4 w-full max-w-md text-destructive">{error}</p> : null}
      {meta ? (
        <section className="mx-auto mt-6 flex w-full max-w-md flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground">
          <div>
            <h1 className="text-xl font-semibold">{meta.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {meta.filename} · {meta.format} · {meta.channels}ch · {meta.genre}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {meta.downloads.toLocaleString()} downloads · {meta.size}
            </p>
          </div>
          {audioUrl ? (
            <audio className="w-full" controls autoPlay src={audioUrl}>
              <a href={audioUrl}>Download rendered audio</a>
            </audio>
          ) : null}
          <pre className="max-h-48 overflow-auto text-xs whitespace-pre-wrap">
            {meta.instrumentText}
          </pre>
        </section>
      ) : null}
    </main>
  )
}

export const Route = createFileRoute("/")({component: RouteComponent})
