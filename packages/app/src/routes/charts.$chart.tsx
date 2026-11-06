import {useSuspenseQuery} from "@tanstack/react-query"
import {createFileRoute} from "@tanstack/react-router"
import * as React from "react"

import ModuleList from "#components/module-list.tsx"
import {playPlaylist} from "#lib/playlists"
import {useStore} from "#lib/store"
import {getMusicCharts, type MusicChart} from "#lib/top-charts"

const _chartTypes = new Map<string, MusicChart>([
  ["favourites", "favourites"],
  ["top-hits", "tophits"],
  ["top-score", "topscore"],
])

function _ChartPage({type}: {type: MusicChart}) {
  const activeId = useStore((state) => state.queue[state.queueHead])
  const page = useSuspenseQuery({
    queryKey: ["music-chart", type],
    queryFn: async () => await getMusicCharts(type),
  })

  return (
    <ModuleList
      ids={page.data.entries}
      activeId={activeId}
      onSelect={(moduleId) => playPlaylist(page.data.entries, moduleId)}
    />
  )
}

function _RouteComponent() {
  const {chart} = Route.useParams()
  const chartType = _chartTypes.get(chart)

  if (!chartType) {
    return <div className="p-2 text-primary/80">Chart not found.</div>
  }

  return <_ChartPage type={chartType} />
}

export const Route = createFileRoute("/charts/$chart")({component: _RouteComponent})
