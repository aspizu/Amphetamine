import {createFileRoute} from "@tanstack/react-router"
import * as React from "react"

import ModuleList from "#components/module-list.tsx"
import {playPlaylist} from "#lib/playlists"
import {useStore} from "#lib/store"

function _RouteComponent() {
  const {playlistIndex} = Route.useParams()
  const index = Number(playlistIndex)
  const playlist = useStore((store) => store.playlists[index])
  const activeId = useStore((state) => state.queue[state.queueHead])

  if (!playlist) {
    return <div className="p-2 text-primary/80">Playlist not found.</div>
  }

  return (
    <ModuleList
      ids={playlist.pl}
      activeId={activeId}
      onSelect={(moduleId) => playPlaylist(playlist.pl, moduleId)}
      actions={{
        remove: (id) => {
          useStore.setState((draft) => {
            const target = draft.playlists[index]
            if (target) {
              target.pl = target.pl.filter((moduleId) => moduleId !== id)
            }
          })
        },
        moveUp: (id) => {
          useStore.setState((draft) => {
            const modules = draft.playlists[index]?.pl
            if (!modules) return
            const position = modules.indexOf(id)
            if (position <= 0) return
            modules[position] = modules[position - 1]
            modules[position - 1] = id
          })
        },
        moveDown: (id) => {
          useStore.setState((draft) => {
            const modules = draft.playlists[index]?.pl
            if (!modules) return
            const position = modules.indexOf(id)
            if (position === -1 || position === modules.length - 1) return
            modules[position] = modules[position + 1]
            modules[position + 1] = id
          })
        },
      }}
    />
  )
}

export const Route = createFileRoute("/playlists/$playlistIndex")({
  component: _RouteComponent,
})
