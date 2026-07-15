import {Outlet, createRootRoute} from "@tanstack/react-router"

import Player from "#components/player.tsx"

function RootComponent() {
  return (
    <div>
      <Outlet />
      <Player />
    </div>
  )
}

export const Route = createRootRoute({component: RootComponent})
