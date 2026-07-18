import {createFileRoute} from "@tanstack/react-router"

import Queue from "#components/queue.tsx"
import {useStore} from "#lib/store"

function RouteComponent() {
  const docked = useStore((state) => state.docked)
  if (docked) {
    return null
  }
  return <Queue />
}

export const Route = createFileRoute("/")({component: RouteComponent})
