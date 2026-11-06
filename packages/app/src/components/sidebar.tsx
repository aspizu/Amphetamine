import {
  ChartLineUpIcon,
  DotsThreeVerticalIcon,
  HeartIcon,
  PencilSimpleIcon,
  PlaylistIcon,
  PlusIcon,
  QueueIcon,
  TrashIcon,
  TrophyIcon,
} from "@phosphor-icons/react"
import {Link, useNavigate} from "@tanstack/react-router"
import * as React from "react"
import {useRef, useState} from "react"

import {createPlaylist} from "#lib/playlists"
import {useStore} from "#lib/store"

import DeletePlaylistDialog from "./delete-playlist-dialog"
import {Button} from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

const _linkClass =
  "flex h-7 w-full min-w-0 shrink-0 items-center gap-2 px-2 text-left text-sm text-foreground/80 transition-colors hover:bg-card"
const _activeLinkClass = "bg-card font-medium text-primary"

export default function Sidebar() {
  const navigate = useNavigate()
  const playlists = useStore((store) => store.playlists)
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const renameInput = useRef<HTMLInputElement>(null)

  return (
    <aside className="flex min-h-0 flex-col gap-1 overflow-y-auto border-r">
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
        <span className="truncate">Top Favourites</span>
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
        .toSorted(({playlist: a}, {playlist: b}) => a.name.localeCompare(b.name))
        .map(({playlist, index}) => (
          <div
            key={index}
            className="group relative flex h-7 shrink-0 items-center hover:bg-card"
          >
            {renamingIndex === index ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 pr-7 pl-2">
                <PlaylistIcon className="size-4 shrink-0" />
                <input
                  ref={renameInput}
                  aria-label="Playlist name"
                  defaultValue={playlist.name}
                  className="h-6 min-w-0 flex-1 rounded border bg-background px-1 text-sm outline-none focus:border-ring"
                  onFocus={(event) => event.currentTarget.select()}
                  onBlur={(event) => {
                    const name = event.currentTarget.value.trim()
                    if (name) {
                      useStore.setState((draft) => {
                        const target = draft.playlists[index]
                        if (target) {
                          target.name = name
                        }
                      })
                    }
                    setRenamingIndex(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return
                    if (event.key === "Enter") {
                      event.preventDefault()
                      event.currentTarget.blur()
                    } else if (event.key === "Escape") {
                      event.preventDefault()
                      event.currentTarget.value = playlist.name
                      event.currentTarget.blur()
                    }
                  }}
                />
              </div>
            ) : (
              <Link
                to="/playlists/$playlistIndex"
                params={{playlistIndex: String(index)}}
                className={`${_linkClass} pr-7`}
                activeProps={{className: _activeLinkClass}}
              >
                <PlaylistIcon className="size-4 shrink-0" />
                <span className="truncate">{playlist.name}</span>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Actions for ${playlist.name}`}
                    className="absolute top-0 right-0 rounded-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                  />
                }
              >
                <DotsThreeVerticalIcon weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                finalFocus={() =>
                  deletingIndex === index ? false : (renameInput.current ?? true)
                }
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setRenamingIndex(index)}>
                    <PencilSimpleIcon />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeletingIndex(index)}
                  >
                    <TrashIcon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      <button
        type="button"
        className="flex h-6 w-full shrink-0 items-center justify-center gap-1 px-2 text-xs text-muted-foreground transition-colors hover:bg-card"
        onClick={() => {
          const index = createPlaylist()
          void navigate({
            to: "/playlists/$playlistIndex",
            params: {playlistIndex: String(index)},
          })
        }}
      >
        <PlusIcon className="size-3 shrink-0" />
        <span className="truncate">Add playlist</span>
      </button>
      {deletingIndex !== null && (
        <DeletePlaylistDialog
          index={deletingIndex}
          onClose={() => setDeletingIndex(null)}
        />
      )}
    </aside>
  )
}
