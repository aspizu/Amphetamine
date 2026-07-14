import {PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, SquareIcon} from "lucide-react"

import {branchOff} from "#lib/background"
import {loadCurrentSong, player, skipSong} from "#lib/player"

import {Button} from "./ui/button"

async function _onPlay() {
  // already playing
  if (!player.paused && !player.ended) {
    return
  }
  // not playing anything, load current song
  if (player.srcObject === null) {
    const res = await loadCurrentSong()
    if (res.isErr()) {
      console.error(res.error)
      return
    }
  }
  await player.play()
}

export default function PlayerControls() {
  return (
    <div>
      <Button size="icon" onClick={() => branchOff(() => skipSong(-1))}>
        <SkipBackIcon />
      </Button>
      <Button size="icon" onClick={() => branchOff(_onPlay)}>
        <PlayIcon />
      </Button>
      <Button size="icon" onClick={() => player.pause()}>
        <PauseIcon />
      </Button>
      <Button
        size="icon"
        onClick={() => {
          player.pause()
          player.currentTime = 0
        }}
      >
        <SquareIcon />
      </Button>
      <Button size="icon" onClick={() => branchOff(() => skipSong(1))}>
        <SkipForwardIcon />
      </Button>
    </div>
  )
}
