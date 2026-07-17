import * as player from "#lib/player"
import {useStore} from "#lib/store"

import {Slider} from "./ui/slider"

export default function PlayerVolume() {
  const volume = useStore((state) => state.volume)
  const balance = useStore((state) => state.balance)

  return (
    <div>
      <Slider
        value={volume}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(value) => {
          if (typeof value !== "number") return
          useStore.setState((draft) => {
            draft.volume = value
          })
          player.setVolume(value)
        }}
      />
      <Slider
        value={balance}
        min={-1}
        max={1}
        step={0.01}
        onValueChange={(value) => {
          if (typeof value !== "number") return
          useStore.setState((draft) => {
            draft.balance = value
          })
          player.setBalance(value)
        }}
      />
    </div>
  )
}
