import {createFileRoute} from "@tanstack/react-router"

import Queue from "#components/queue.tsx"

function RouteComponent() {
  return <Queue />
}

export const Route = createFileRoute("/")({component: RouteComponent})
