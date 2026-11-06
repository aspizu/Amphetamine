import {
  ChartLineUpIcon,
  HeartIcon,
  PlaylistIcon,
  QueueIcon,
  TrophyIcon,
} from "@phosphor-icons/react"
import {Link} from "@tanstack/react-router"

import {useStore} from "#lib/store"

const _linkClass =
  "flex h-7 w-full min-w-0 items-center gap-2 px-2 text-left text-sm text-foreground/80 transition-colors hover:bg-card"
const _activeLinkClass = "bg-card font-medium text-primary"

export default function Sidebar() {
  const playlists = useStore((store) => store.playlists)

  return (
    <aside className="flex flex-col gap-1 border-r">
      <Link
        to="/"
        activeOptions={{exact: true}}
        className={_linkClass}
        activeProps={{className: _activeLinkClass}}
      >
        <QueueIcon className="size-4 shrink-0" />
        <span className="truncate">Queue</span>
      </Link>
      <Link
        to="/charts/$chart"
        params={{chart: "favourites"}}
        className={_linkClass}
        activeProps={{className: _activeLinkClass}}
      >
        <HeartIcon className="size-4 shrink-0" />
        <span className="truncate">Favourites</span>
      </Link>
      <Link
        to="/charts/$chart"
        params={{chart: "top-hits"}}
        className={_linkClass}
        activeProps={{className: _activeLinkClass}}
      >
        <ChartLineUpIcon className="size-4 shrink-0" />
        <span className="truncate">Top Hits</span>
      </Link>
      <Link
        to="/charts/$chart"
        params={{chart: "top-score"}}
        className={_linkClass}
        activeProps={{className: _activeLinkClass}}
      >
        <TrophyIcon className="size-4 shrink-0" />
        <span className="truncate">Top Score</span>
      </Link>
      {playlists
        .map((playlist, index) => ({playlist, index}))
        .sort(({playlist: a}, {playlist: b}) => a.name.localeCompare(b.name))
        .map(({playlist, index}) => (
          <Link
            key={index}
            to="/playlists/$playlistIndex"
            params={{playlistIndex: String(index)}}
            className={_linkClass}
            activeProps={{className: _activeLinkClass}}
          >
            <PlaylistIcon className="size-4 shrink-0" />
            <span className="truncate">{playlist.name}</span>
          </Link>
        ))}
    </aside>
  )
}
