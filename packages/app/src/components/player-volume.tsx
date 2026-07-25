import {
  FadersIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerXIcon,
} from "@phosphor-icons/react"

import * as player from "#lib/player"
import {useStore} from "#lib/store"

import {Slider} from "./ui/slider"

function getVolumeIcon(volume: number) {
  if (volume === 0) return SpeakerXIcon
  if (volume < 0.33) return SpeakerNoneIcon
  if (volume < 0.66) return SpeakerLowIcon
  return SpeakerHighIcon
}

export default function PlayerVolume() {
  const volume = useStore((state) => state.volume)
  const balance = useStore((state) => state.balance)
  const VolumeIcon = getVolumeIcon(volume)

  return (
    <div className="flex w-24 flex-col justify-center">
      <div className="flex items-center gap-1">
        <VolumeIcon className="size-5" />
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
      </div>
      <div className="flex items-center gap-1">
        <FadersIcon className="size-5" />
        <Slider
          value={balance}
          min={0}
          max={0.5}
          step={0.01}
          onValueChange={(value) => {
            if (typeof value !== "number") return
            useStore.setState((draft) => {
              draft.balance = value
            })
            player.setMix(value)
          }}
        />
      </div>
    </div>
  )
}
