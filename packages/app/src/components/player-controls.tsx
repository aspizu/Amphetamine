import {
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RepeatOnceIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SquareIcon,
} from "@phosphor-icons/react"

import {branchOff} from "#lib/background"
import * as player from "#lib/player"
import {RepeatMode, useStore} from "#lib/store"

import {Button} from "./ui/button"

function _handleSkipBack() {
  branchOff(async () => {
    if (player.skipBack()) {
      const res = await player.loadSong()
      if (res.isErr()) {
        console.error("Failed to load song", res.error)
        return
      }
      if (res.value) await player.play()
    }
  }, "skip back btn")
}

function _handlePlay() {
  branchOff(async () => {
    if (!player.isLoaded()) {
      const res = await player.loadSong()
      if (res.isErr()) {
        console.error("Failed to load song", res.error)
        return
      }
      if (!res.value) return
    }
    await player.play()
  }, "play btn")
}

function _handleSkipForward() {
  branchOff(async () => {
    if (player.skipForward()) {
      const res = await player.loadSong()
      if (res.isErr()) {
        console.error("Failed to load song", res.error)
        return
      }
      if (res.value) await player.play()
    }
  }, "skip fwd btn")
}

function _handleRepeat() {
  useStore.setState((draft) => {
    draft.repeatMode = {
      [RepeatMode.OFF]: RepeatMode.ALL,
      [RepeatMode.ALL]: RepeatMode.ONE,
      [RepeatMode.ONE]: RepeatMode.OFF,
    }[draft.repeatMode]
  })
}

export default function PlayerControls() {
  const repeatMode = useStore((state) => state.repeatMode)
  const RepeatModeIcon = {
    [RepeatMode.OFF]: RepeatIcon,
    [RepeatMode.ALL]: RepeatIcon,
    [RepeatMode.ONE]: RepeatOnceIcon,
  }[repeatMode]
  return (
    <div className="flex">
      <Button size="icon" onClick={_handleSkipBack} variant="ghost">
        <SkipBackIcon />
      </Button>
      <Button size="icon" onClick={_handlePlay} variant="default">
        <PlayIcon />
      </Button>
      <Button size="icon" onClick={player.pause} variant="ghost">
        <PauseIcon />
      </Button>
      <Button size="icon" onClick={player.stop} variant="ghost">
        <SquareIcon />
      </Button>
      <Button size="icon" onClick={_handleSkipForward} variant="ghost">
        <SkipForwardIcon />
      </Button>
      <Button size="icon" onClick={_handleRepeat} variant="ghost">
        <RepeatModeIcon />
      </Button>
    </div>
  )
}
