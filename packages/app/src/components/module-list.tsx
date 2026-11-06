import {PlayIcon} from "@phosphor-icons/react"
import {useSuspenseQuery} from "@tanstack/react-query"
import * as React from "react"

import {getModuleInfo} from "#lib/module-info"
import * as player from "#lib/player"
import {cn} from "#lib/utils"

import ModuleMenu from "./module-menu"
import type {ModuleListActions} from "./module-menu"
import {Spinner} from "./ui/spinner"

interface ModuleListProps {
  ids: number[]
  activeId?: number
  historyIds?: Set<number>
  onSelect?: (id: number) => void
  actions?: ModuleListActions
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
  const loading = player.usePlayerState((state) => state.loadingModuleId === id)
  const moduleInfo = useSuspenseQuery({
    queryKey: ["module", id, "info"],
    queryFn: async () => await getModuleInfo(id),
  })
  const title = moduleInfo.data.title || "~"
  const artists =
    moduleInfo.data.artists.map((artist) => artist.name).join(", ") ||
    moduleInfo.data.filename
  const fullName = `${title} - ${artists}`
  const name = (
    <span
      className={cn(
        "truncate",
        isActive ? "font-medium text-primary" : isHistory && "text-muted-foreground",
      )}
    >
      {fullName}
    </span>
  )

  return (
    <div className="group flex h-7 shrink-0 items-center transition-colors hover:bg-card">
      {onSelect ? (
        <button
          type="button"
          className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(id)}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <Spinner className="ml-2 size-4 shrink-0" aria-label="Loading song" />
          ) : (
            <PlayIcon
              className={cn(
                "ml-2 size-4 shrink-0",
                !isActive && "opacity-0 transition-opacity group-hover:opacity-75",
              )}
            />
          )}
          {name}
        </button>
      ) : (
        <div className="flex h-full min-w-0 flex-1 items-center px-2">{name}</div>
      )}
      <ModuleMenu id={id} name={fullName} actions={actions} />
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
    <div className="flex flex-col divide-y">
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
