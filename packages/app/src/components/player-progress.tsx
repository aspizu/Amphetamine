import {useCallback, useEffect, useState} from "react"

import * as player from "#lib/player"
import {useStore} from "#lib/store"

import {Slider} from "./ui/slider"

function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secondsLeft = totalSeconds % 60
  const mm = minutes.toString().padStart(hours > 0 ? 2 : 1, "0")
  const ss = secondsLeft.toString().padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

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
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <div className="w-10">{formatTime(time)}</div>
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
      <div className="w-10">{formatTime(duration)}</div>
    </div>
  )
}
