import {Maximize2Icon, Minimize2Icon} from "lucide-react"

import {useStore} from "#lib/store"

import PlayerControls from "./player-controls"
import PlayerDetails from "./player-details"
import PlayerProgress from "./player-progress"
import PlayerVolume from "./player-volume"
import {Button} from "./ui/button"

function DockButton() {
  const docked = useStore((state) => state.docked)
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        useStore.setState((draft) => {
          draft.docked = !draft.docked
        })
      }}
    >
      {!docked ? <Minimize2Icon /> : <Maximize2Icon />}
    </Button>
  )
}

export default function Player() {
  return (
    <div className="mt-auto flex h-[110px] w-[420px] flex-col justify-center self-center p-2">
      <PlayerDetails />
      <PlayerProgress />
      <div className="flex items-center justify-center gap-2">
        <PlayerControls />
        <div className="grow" />
        <PlayerVolume />
        <DockButton />
      </div>
    </div>
  )
}
