import {createFileRoute} from "@tanstack/react-router"

import ModuleList from "#components/module-list.tsx"
import {playPlaylist} from "#lib/playlists"
import {useStore} from "#lib/store"

function _RouteComponent() {
  const {playlistIndex} = Route.useParams()
  const playlist = useStore((store) => store.playlists[Number(playlistIndex)])
  const activeId = useStore((state) => state.queue[state.queueHead])

  if (!playlist) {
    return <div className="p-2 text-primary/80">Playlist not found.</div>
  }

  return (
    <ModuleList
      ids={playlist.pl}
      activeId={activeId}
      onSelect={(moduleId) => playPlaylist(playlist.pl, moduleId)}
    />
  )
}

export const Route = createFileRoute("/playlists/$playlistIndex")({component: _RouteComponent})
