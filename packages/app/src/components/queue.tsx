import {DotsThreeVerticalIcon, PlayIcon} from "@phosphor-icons/react"
import {useSuspenseQuery} from "@tanstack/react-query"

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

function removeQueueItem(id: number) {
  let send = false
  useStore.setState((draft) => {
    const index = draft.queue.indexOf(id)
    if (index === -1) return
    if (index === draft.queueHead) {
      send = true
    }
    draft.queue = draft.queue.filter((x) => x !== id)
  })
  if (send) {
    branchOff(async () => {
      player.stop()
      const res = await player.loadSong()
      if (res.isErr()) {
        console.error("Failed to load song", res.error)
        return
      }
      if (res.value) {
        await player.play()
      }
    }, "remove queue item")
  }
}

function moveQueueItemUp(id: number) {
  useStore.setState((draft) => {
    if (draft.queue.length === 1) return
    const index = draft.queue.indexOf(id)
    if (index === -1 || index === 0) return
    if (index === draft.queueHead) {
      draft.queueHead--
    } else if (index - 1 === draft.queueHead) {
      draft.queueHead++
    }
    draft.queue[index] = draft.queue[index - 1]
    draft.queue[index - 1] = id
  })
}

function moveQueueItemDown(id: number) {
  useStore.setState((draft) => {
    if (draft.queue.length === 1) return
    const index = draft.queue.indexOf(id)
    if (index === -1 || index === draft.queue.length - 1) return
    if (index === draft.queueHead) {
      draft.queueHead++
    } else if (index + 1 === draft.queueHead) {
      draft.queueHead--
    }
    draft.queue[index] = draft.queue[index + 1]
    draft.queue[index + 1] = id
  })
}

function QueueItem({id}: {id: number}) {
  const isActive = useStore((state) => state.queue[state.queueHead] === id)
  const isHistory = useStore((state) => state.queue.indexOf(id) < state.queueHead)
  const moduleInfo = useSuspenseQuery({
    queryKey: ["module", id, "info"],
    queryFn: async () => {
      return await getModuleInfo(id)
    },
  })
  return (
    <div className="group flex items-center transition-colors hover:bg-card">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
          <PlayIcon key="playing" className="ml-2 size-4" />
        ) : (
          <PlayIcon
            key="not-playing"
            className="ml-2 size-4 opacity-0 transition-opacity group-hover:opacity-75"
          />
        )}
        <span className={isActive ? "font-medium" : isHistory ? "text-primary/80" : ""}>
          {moduleInfo.data.title || "~"} -{" "}
          {moduleInfo.data.artists.map((a) => a.name).join(", ") || "~"}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon-sm" variant="ghost" className="mr-2" />}
        >
          <DotsThreeVerticalIcon weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => removeQueueItem(id)}>Remove</DropdownMenuItem>
            <DropdownMenuItem onClick={() => moveQueueItemUp(id)}>Move up</DropdownMenuItem>
            <DropdownMenuItem onClick={() => moveQueueItemDown(id)}>Move down</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function Queue() {
  const queue = useStore((state) => state.queue)
  return (
    <div className="flex flex-col divide-y overflow-y-scroll p-2">
      {queue.map((id) => (
        <QueueItem key={id} id={id} />
      ))}
    </div>
  )
}
