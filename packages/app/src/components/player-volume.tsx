import {getItem, setItem} from "localforage"
import {useEffect, useState} from "react"

import {branchOff} from "#lib/background"
import * as player from "#lib/player"

import {Slider} from "./ui/slider"

export default function PlayerVolume() {
  const [volume, setVolume] = useState(100)

  useEffect(() => {
    let cancelled = false
    branchOff(async () => {
      const stored = await getItem<number>("player/volume")
      const restored =
        typeof stored === "number" && Number.isFinite(stored)
          ? Math.max(0, Math.min(100, stored))
          : 100
      if (cancelled) return
      setVolume(restored)
      player.setVolume(restored)
    }, "restore player volume")
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Slider
      value={volume}
      min={0}
      max={100}
      onValueChange={(value) => {
        if (typeof value !== "number") return
        setVolume(value)
        player.setVolume(value)
      }}
      onValueCommitted={(value) => {
        if (typeof value !== "number") return
        branchOff(() => setItem("player/volume", value), "save player volume")
      }}
    />
  )
}
