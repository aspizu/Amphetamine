import {
  FadersIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerXIcon,
} from "@phosphor-icons/react"
import * as React from "react"

import * as player from "#lib/player"
import {useStore} from "#lib/store"

import {Slider} from "./ui/slider"

export default function PlayerVolume() {
  const volume = useStore((state) => state.volume)
  const balance = useStore((state) => state.balance)
  let volumeIcon = <SpeakerHighIcon className="size-5" />
  if (volume === 0) {
    volumeIcon = <SpeakerXIcon className="size-5" />
  } else if (volume < 0.33) {
    volumeIcon = <SpeakerNoneIcon className="size-5" />
  } else if (volume < 0.66) {
    volumeIcon = <SpeakerLowIcon className="size-5" />
  }

  return (
    <div className="flex w-24 flex-col justify-center">
      <div className="flex items-center gap-1">
        {volumeIcon}
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
