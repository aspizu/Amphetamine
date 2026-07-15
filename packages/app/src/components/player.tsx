import PlayerControls from "./player-controls"
import PlayerDetails from "./player-details"
import PlayerProgress from "./player-progress"

export default function Player() {
  return (
    <div>
      <PlayerDetails />
      <PlayerProgress />
      <PlayerControls />
    </div>
  )
}
