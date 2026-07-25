import PlayerControls from "./player-controls"
import PlayerDetails from "./player-details"
import PlayerProgress from "./player-progress"
import PlayerVolume from "./player-volume"

export default function Player() {
  return (
    <div className="mt-auto flex w-full max-w-md flex-col justify-center self-center p-2">
      <PlayerDetails />
      <PlayerProgress />
      <div className="flex items-center justify-center gap-2">
        <PlayerControls />
        <div className="grow" />
        <PlayerVolume />
      </div>
    </div>
  )
}
