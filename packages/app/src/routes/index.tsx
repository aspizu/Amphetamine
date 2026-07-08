import {createFileRoute} from "@tanstack/react-router"
import {use, useEffect} from "react"

import {renderModuleToWav} from "#lib/libopenmpt"
import {getModule} from "#lib/modules"

const wavPromise = getModule(167157).then(renderModuleToWav)

function RouteComponent() {
  const wav = use(wavPromise)
  useEffect(() => {
    if (wav.isErr()) return
    const audio = new Audio()
    const wavUrl = URL.createObjectURL(new Blob([wav.value], {type: "audio/wav"}))
    audio.src = wavUrl
    audio.play().catch(() => {})
    return () => {
      audio.pause()
      URL.revokeObjectURL(wavUrl)
    }
  }, [wav])
  if (wav.isErr()) {
    return <p>Error: {wav.error.message}</p>
  }
  return <p>playing</p>
}

export const Route = createFileRoute("/")({component: RouteComponent})
