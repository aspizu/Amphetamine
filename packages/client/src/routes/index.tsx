import {renderModuleToWavBlob} from "@amphetamine/libopenmpt"
import {createFileRoute} from "@tanstack/react-router"
import {AlertCircle, LoaderCircle, Music2} from "lucide-react"
import {useEffect, useState} from "react"

import {downloadModFromModArchive} from "#lib/modarchive"

const DEMO_MODULE_ID = 40475
const DEMO_MODULE_NAME = "ELYSIUM.MOD"

type DemoState =
  | {status: "loading"}
  | {status: "ready"; audioUrl: string; size: number}
  | {status: "error"; message: string}

function RouteComponent() {
  const [demoState, setDemoState] = useState<DemoState>({status: "loading"})

  useEffect(() => {
    const abortController = new AbortController()
    let audioUrl: string | undefined

    async function loadDemoModule() {
      try {
        const mod = await downloadModFromModArchive(DEMO_MODULE_ID, {
          signal: abortController.signal,
        })
        const wavBlob = await renderModuleToWavBlob(mod.blob, {repeatCount: 0})

        if (abortController.signal.aborted) {
          return
        }

        audioUrl = URL.createObjectURL(wavBlob)
        setDemoState({
          status: "ready",
          audioUrl,
          size: mod.blob.size,
        })
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        setDemoState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load the demo module",
        })
      }
    }

    void loadDemoModule()

    return () => {
      abortController.abort()
      if (audioUrl !== undefined) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium text-muted-foreground">Amphetamine</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">ModArchive demo</h1>
        </header>

        <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Music2 className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold">{DEMO_MODULE_NAME}</h2>
                <p className="text-sm text-muted-foreground">Module #{DEMO_MODULE_ID}</p>
              </div>

              {demoState.status === "loading" ? (
                <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Downloading and rendering
                </div>
              ) : null}

              {demoState.status === "ready" ? (
                <div className="mt-5 flex flex-col gap-3">
                  <audio className="w-full" controls src={demoState.audioUrl}>
                    <a href={demoState.audioUrl}>Download rendered audio</a>
                  </audio>
                  <p className="text-sm text-muted-foreground">
                    Loaded from ModArchive, {Math.round(demoState.size / 1024)} KB
                  </p>
                </div>
              ) : null}

              {demoState.status === "error" ? (
                <div className="mt-5 flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>{demoState.message}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export const Route = createFileRoute("/")({component: RouteComponent})
