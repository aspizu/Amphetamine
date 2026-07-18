import PlayerControls from "./player-controls"
import PlayerDetails from "./player-details"
import PlayerProgress from "./player-progress"
import PlayerVolume from "./player-volume"

export default function Player() {
  return (
    <div className="flex h-dvh w-dvw flex-col justify-center p-2">
      <PlayerDetails />
      <PlayerProgress />
      <div className="flex items-center justify-center gap-2">
        <PlayerControls />
        <PlayerVolume />
      </div>
    </div>
  )
}
