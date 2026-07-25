import {createRootRoute, Outlet} from "@tanstack/react-router"

import Player from "#components/player.tsx"

function RootComponent() {
  return (
    <div className="flex h-dvh flex-col">
      <Outlet />
      <Player />
    </div>
  )
}

export const Route = createRootRoute({component: RootComponent})
