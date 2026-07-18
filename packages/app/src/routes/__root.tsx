import {Outlet, createRootRoute} from "@tanstack/react-router"

import Player from "#components/player.tsx"

function RootComponent() {
  return (
    <>
      <Outlet />
      <Player />
    </>
  )
}

export const Route = createRootRoute({component: RootComponent})
