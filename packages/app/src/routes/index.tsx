import {createFileRoute} from "@tanstack/react-router"

import PlayerControls from "#components/player-controls.tsx"

function RouteComponent() {
  return <PlayerControls />
}

export const Route = createFileRoute("/")({component: RouteComponent})
