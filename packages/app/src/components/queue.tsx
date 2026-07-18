import {useSuspenseQuery} from "@tanstack/react-query"
import {EllipsisVerticalIcon, MusicIcon, PlayIcon} from "lucide-react"

import {branchOff} from "#lib/background"
import {getModuleInfo} from "#lib/module-info"
import * as player from "#lib/player"
import {useStore} from "#lib/store"

import {Button} from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

function QueueItem({id}: {id: number}) {
  const isActive = useStore((state) => state.queue[state.queueHead] === id)
  const moduleInfo = useSuspenseQuery({
    queryKey: ["module", id, "info"],
    queryFn: async () => {
      return await getModuleInfo(id)
    },
  })
  return (
    <div className="group flex items-center rounded-md transition-[scale,background-color] hover:bg-card active:scale-[0.995]">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center text-left"
        onClick={() =>
          branchOff(async () => {
            let send = false
            useStore.setState((draft) => {
              const newQueueHead = draft.queue.indexOf(id)
              if (newQueueHead === draft.queueHead || newQueueHead === -1) {
                return
              }
              draft.queueHead = newQueueHead
              send = true
            })
            if (send) {
              const res = await player.loadSong()
              if (res.isErr()) {
                console.error("Failed to load song", res.error)
                return
              }
              if (res.value) {
                await player.play()
              }
            }
          })
        }
      >
        {isActive ? (
          <MusicIcon className="ml-2 size-4" />
        ) : (
          <PlayIcon className="ml-2 size-4 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
        <div className="mr-auto flex flex-col items-start p-2">
          <div className="leading-none">{moduleInfo.data.title || "~"}</div>
          <div className="text-sm leading-tight text-muted-foreground">
            {moduleInfo.data.artists.map((a) => a.name).join(", ") || "~"}
          </div>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="mr-2" />}>
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                let send = false
                useStore.setState((draft) => {
                  const currentIndex = draft.queue.indexOf(id)
                  if (currentIndex === -1) {
                    return
                  }
                  draft.queue = draft.queue.filter((id) => id !== moduleInfo.data.id)
                  if (draft.queueHead === currentIndex) {
                    send = true
                    if (draft.queueHead >= draft.queue.length) {
                      draft.queueHead = draft.queue.length - 1
                    }
                  }
                })
                if (send) {
                  branchOff(async () => {
                    const res = await player.loadSong()
                    if (res.isErr()) {
                      console.error("Failed to load song", res.error)
                      return
                    }
                    await player.play()
                  })
                }
              }}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function Queue() {
  const queue = useStore((state) => state.queue)
  return (
    <div className="flex flex-col overflow-y-scroll p-2">
      {queue.map((id) => (
        <QueueItem key={id} id={id} />
      ))}
    </div>
  )
}
