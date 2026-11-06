import {
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeVerticalIcon,
  PlaylistIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import {useNavigate} from "@tanstack/react-router"
import * as React from "react"

import {createPlaylist} from "#lib/playlists"
import {useStore} from "#lib/store"

import {Button} from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export interface ModuleListActions {
  remove?: (id: number) => void
  moveUp?: (id: number) => void
  moveDown?: (id: number) => void
}

export default function ModuleMenu({
  id,
  name,
  actions,
}: {
  id: number
  name: string
  actions?: ModuleListActions
}) {
  const navigate = useNavigate()
  const playlists = useStore((state) => state.playlists)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Actions for ${name}`}
            className="rounded-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          />
        }
      >
        <DotsThreeVerticalIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PlaylistIcon />
              Add to playlist
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-w-64">
              <DropdownMenuGroup>
                {playlists
                  .map((playlist, index) => ({playlist, index}))
                  .toSorted(({playlist: a}, {playlist: b}) =>
                    a.name.localeCompare(b.name),
                  )
                  .map(({playlist, index}) => (
                    <DropdownMenuItem
                      key={index}
                      disabled={playlist.pl.includes(id)}
                      onClick={() => {
                        useStore.setState((draft) => {
                          const target = draft.playlists[index]
                          if (target && !target.pl.includes(id)) {
                            target.pl.push(id)
                          }
                        })
                      }}
                    >
                      <span className="truncate">{playlist.name}</span>
                      {playlist.pl.includes(id) && (
                        <span className="ml-auto shrink-0 text-xs">Added</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                {playlists.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => {
                    const index = createPlaylist([id])
                    void navigate({
                      to: "/playlists/$playlistIndex",
                      params: {playlistIndex: String(index)},
                    })
                  }}
                >
                  <PlusIcon />
                  New playlist
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {actions && <DropdownMenuSeparator />}
          {actions?.remove && (
            <DropdownMenuItem onClick={() => actions.remove?.(id)}>
              <TrashIcon />
              Remove
            </DropdownMenuItem>
          )}
          {actions?.moveUp && (
            <DropdownMenuItem onClick={() => actions.moveUp?.(id)}>
              <CaretUpIcon />
              Move up
            </DropdownMenuItem>
          )}
          {actions?.moveDown && (
            <DropdownMenuItem onClick={() => actions.moveDown?.(id)}>
              <CaretDownIcon />
              Move down
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
