import {PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, SquareIcon} from "lucide-react"

import {useStore} from "../lib/store"
import {Button} from "./ui/button"

export default function PlayerControls() {
  const playing = useStore((store) => store.playing)
  return (
    <div>
      <Button size="icon">
        <SkipBackIcon />
      </Button>
      <Button size="icon">
        <PlayIcon />
      </Button>
      <Button size="icon">
        <PauseIcon />
      </Button>
      <Button size="icon">
        <SquareIcon />
      </Button>
      <Button size="icon">
        <SkipForwardIcon />
      </Button>
    </div>
  )
}
