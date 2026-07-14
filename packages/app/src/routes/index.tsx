import {createFileRoute} from "@tanstack/react-router"

import PlayerControls from "#components/player-controls.tsx"
import PlayerDetails from "#components/player-details.tsx"

function RouteComponent() {
  return (
    <div>
      <PlayerDetails />
      <PlayerControls />
    </div>
  )
}

export const Route = createFileRoute("/")({component: RouteComponent})
