import {createRootRoute, Outlet} from "@tanstack/react-router"

import Player from "#components/player.tsx"
import Sidebar from "#components/sidebar.tsx"

function RootComponent() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr] overflow-y-hidden">
        <Sidebar />
        <Outlet />
      </div>
      <div className="flex justify-center border-t">
        <Player />
      </div>
    </div>
  )
}

export const Route = createRootRoute({component: RootComponent})
