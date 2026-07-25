import {
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeVerticalIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import {useSuspenseQuery} from "@tanstack/react-query"

import {getModuleInfo, type ModuleInfo} from "#lib/module-info"
import {cn} from "#lib/utils"

import {Button} from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

interface ModuleListActions {
  remove?: (id: number) => void
  moveUp?: (id: number) => void
  moveDown?: (id: number) => void
}

interface ModuleListProps {
  ids: number[]
  activeId?: number
  historyIds?: Set<number>
  onSelect?: (id: number) => void
  actions?: ModuleListActions
}

function _getModuleFullName(module: ModuleInfo) {
  const title = module.title || "~"
  const artists = module.artists.map((artist) => artist.name).join(", ") || "~"
  return `${title} - ${artists}`
}

function _ModuleListItem({
  id,
  isActive,
  isHistory,
  onSelect,
  actions,
}: {
  id: number
  isActive: boolean
  isHistory: boolean
  onSelect?: (id: number) => void
  actions?: ModuleListActions
}) {
  const moduleInfo = useSuspenseQuery({
    queryKey: ["module", id, "info"],
    queryFn: async () => await getModuleInfo(id),
  })
  const name = (
    <span className={cn("truncate", isActive && "font-medium", isHistory && "text-primary/80")}>
      {_getModuleFullName(moduleInfo.data)}
    </span>
  )

  return (
    <div className="group flex h-7 shrink-0 items-center transition-colors hover:bg-card">
      {onSelect ? (
        <button
          type="button"
          className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(id)}
        >
          <PlayIcon
            className={cn(
              "ml-2 size-4",
              !isActive && "opacity-0 transition-opacity group-hover:opacity-75",
            )}
          />
          {name}
        </button>
      ) : (
        <div className="flex h-full min-w-0 flex-1 items-center px-2">{name}</div>
      )}
      {actions && (actions.remove || actions.moveUp || actions.moveDown) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon-sm" variant="ghost" className="mr-2" />}
          >
            <DotsThreeVerticalIcon weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              {actions.remove && (
                <DropdownMenuItem onClick={() => actions.remove?.(id)}>
                  <TrashIcon />
                  Remove
                </DropdownMenuItem>
              )}
              {actions.moveUp && (
                <DropdownMenuItem onClick={() => actions.moveUp?.(id)}>
                  <CaretUpIcon />
                  Move up
                </DropdownMenuItem>
              )}
              {actions.moveDown && (
                <DropdownMenuItem onClick={() => actions.moveDown?.(id)}>
                  <CaretDownIcon />
                  Move down
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export default function ModuleList({
  ids,
  activeId,
  historyIds,
  onSelect,
  actions,
}: ModuleListProps) {
  return (
    <div className="flex flex-col divide-y overflow-y-scroll">
      {ids.map((id) => (
        <_ModuleListItem
          key={id}
          id={id}
          isActive={id === activeId}
          isHistory={historyIds?.has(id) ?? false}
          onSelect={onSelect}
          actions={actions}
        />
      ))}
    </div>
  )
}
