import {useCallback, useEffect, useState} from "react"

import * as player from "#lib/player"
import {useStore} from "#lib/store"

import {Slider} from "./ui/slider"

export default function PlayerProgress() {
  const moduleID = useStore((state) =>
    state.queue.length > 0 ? state.queue[state.queueHead] : null,
  )
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [sliderTime, setSliderTime] = useState(0)
  const [isSliderDragging, setIsSliderDragging] = useState<number | null>(null)
  const update = useCallback(() => {
    setTime(player.getTime())
    setDuration(player.getDuration())
    if (isSliderDragging === null) {
      setSliderTime(player.getTime())
    }
  }, [isSliderDragging])
  useEffect(() => {
    const interval = setInterval(update, 500)
    return () => {
      clearInterval(interval)
    }
  }, [update])
  return (
    <div>
      {(time / 60).toFixed(0)}:{(time % 60).toFixed(0)}/{(duration / 60).toFixed(0)}:
      {(duration % 60).toFixed(0)}
      <Slider
        value={duration === 0 ? 0 : (sliderTime / duration) * 100}
        min={0}
        max={100}
        onValueChange={(value) => {
          if (typeof value !== "number") return
          setSliderTime((value / 100) * duration)
        }}
        onPointerDown={() => {
          setIsSliderDragging(moduleID)
        }}
        onValueCommitted={(value) => {
          if (typeof value !== "number") return
          setIsSliderDragging(null)
          if (isSliderDragging === moduleID) {
            player.setTime((value / 100) * duration)
          }
        }}
      />
    </div>
  )
}
