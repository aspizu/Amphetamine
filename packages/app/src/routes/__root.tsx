import {createRootRoute, Outlet} from "@tanstack/react-router"
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window"
import {useEffect} from "react"

import Player from "#components/player.tsx"
import {branchOff} from "#lib/background"
import {useStore} from "#lib/store"

function Docker() {
  const docked = useStore((state) => state.docked)
  useEffect(
    () =>
      branchOff(async () => {
        const window = getCurrentWindow()
        if (docked) {
          await window.setSize(new LogicalSize(420, 140))
          await window.setResizable(false)
        } else {
          await window.setSize(new LogicalSize(800, 600))
          await window.setResizable(true)
        }
      }),
    [docked],
  )
  return null
}

function RootComponent() {
  return (
    <div className="flex h-dvh flex-col">
      <Docker />
      <Outlet />
      <Player />
    </div>
  )
}

export const Route = createRootRoute({component: RootComponent})
