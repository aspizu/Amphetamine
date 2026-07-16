import PlayerControls from "./player-controls"
import PlayerDetails from "./player-details"
import PlayerProgress from "./player-progress"
import PlayerVolume from "./player-volume"

export default function Player() {
  return (
    <div>
      <PlayerDetails />
      <PlayerProgress />
      <PlayerVolume />
      <PlayerControls />
    </div>
  )
}
