import {useState} from "react"

import {branchOff} from "#lib/background"
import * as player from "#lib/player"
import {useStore} from "#lib/store"

import ModuleList from "./module-list"
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./ui/accordion"

function _removeQueueItem(id: number) {
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

function _moveQueueItemUp(id: number) {
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

function _moveQueueItemDown(id: number) {
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

function _selectQueueItem(id: number) {
  branchOff(async () => {
    let send = false
    useStore.setState((draft) => {
      const newQueueHead = draft.queue.indexOf(id)
      if (newQueueHead === draft.queueHead || newQueueHead === -1) return
      draft.queueHead = newQueueHead
      send = true
    })
    if (!send) return
    const res = await player.loadSong()
    if (res.isErr()) {
      console.error("Failed to load song", res.error)
      return
    }
    if (res.value) await player.play()
  })
}

const _queueActions = {
  remove: _removeQueueItem,
  moveUp: _moveQueueItemUp,
  moveDown: _moveQueueItemDown,
}

export default function Queue() {
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const queue = useStore((state) => state.queue)
  const queueHead = useStore((state) => state.queueHead)
  const playedIds = queue.slice(0, queueHead)
  return (
    <div className="divide-y">
      {playedIds.length > 0 && (
        <Accordion value={expandedSections} onValueChange={setExpandedSections}>
          <AccordionItem value="played">
            <AccordionTrigger className="h-6 items-center justify-center gap-1 rounded-none px-2 py-0 text-xs font-normal text-muted-foreground hover:bg-card hover:no-underline">
              Recently Played
            </AccordionTrigger>
            <AccordionContent>
              <ModuleList
                ids={playedIds}
                historyIds={new Set(playedIds)}
                onSelect={(id) => {
                  setExpandedSections([])
                  _selectQueueItem(id)
                }}
                actions={_queueActions}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <ModuleList
        ids={queue.slice(queueHead)}
        activeId={queue[queueHead]}
        onSelect={_selectQueueItem}
        actions={_queueActions}
      />
    </div>
  )
}
