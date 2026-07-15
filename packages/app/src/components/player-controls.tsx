import {
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  RepeatOffIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SquareIcon,
} from "lucide-react"

import {branchOff} from "#lib/background"
import * as player from "#lib/player"
import {RepeatMode, useStore} from "#lib/store"

import {Button} from "./ui/button"

export default function PlayerControls() {
  const repeatMode = useStore((state) => state.repeatMode)
  return (
    <div>
      <Button
        size="icon"
        onClick={() =>
          branchOff(async () => {
            if (player.skipBack()) {
              const res = await player.loadSong()
              if (res.isErr()) {
                console.error(res.error)
              }
              await player.play()
            }
          }, "skip back btn")
        }
      >
        <SkipBackIcon />
      </Button>
      <Button
        size="icon"
        onClick={() =>
          branchOff(async () => {
            if (!player.isLoaded()) {
              const res = await player.loadSong()
              if (res.isErr()) {
                console.error(res.error)
              }
            }
            await player.play()
          }, "play btn")
        }
      >
        <PlayIcon />
      </Button>
      <Button size="icon" onClick={() => player.pause()}>
        <PauseIcon />
      </Button>
      <Button size="icon" onClick={() => player.stop()}>
        <SquareIcon />
      </Button>
      <Button
        size="icon"
        onClick={() =>
          branchOff(async () => {
            if (player.skipForward()) {
              const res = await player.loadSong()
              if (res.isErr()) {
                console.error(res.error)
              }
              await player.play()
            }
          }, "skip fwd btn")
        }
      >
        <SkipForwardIcon />
      </Button>
      <Button
        size="icon"
        onClick={() => {
          useStore.setState((draft) => {
            draft.repeatMode = {
              [RepeatMode.OFF]: RepeatMode.ALL,
              [RepeatMode.ALL]: RepeatMode.ONE,
              [RepeatMode.ONE]: RepeatMode.OFF,
            }[draft.repeatMode]
          })
        }}
      >
        {repeatMode === RepeatMode.OFF ? (
          <RepeatOffIcon />
        ) : repeatMode === RepeatMode.ALL ? (
          <RepeatIcon />
        ) : repeatMode === RepeatMode.ONE ? (
          <Repeat1Icon />
        ) : null}
      </Button>
    </div>
  )
}
