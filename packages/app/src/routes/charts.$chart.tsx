import {useSuspenseQuery} from "@tanstack/react-query"
import {createFileRoute} from "@tanstack/react-router"

import ModuleList from "#components/module-list.tsx"
import {playPlaylist} from "#lib/playlists"
import {getMusicCharts, type MusicChart} from "#lib/top-charts"

const _chartTypes = {
  favourites: "favourites",
  "top-hits": "tophits",
  "top-score": "topscore",
} as const satisfies Record<string, MusicChart>

function _ChartPage({type}: {type: MusicChart}) {
  const page = useSuspenseQuery({
    queryKey: ["music-chart", type],
    queryFn: async () => await getMusicCharts(type),
  })

  return (
    <ModuleList
      ids={page.data.entries}
      onSelect={(moduleId) => playPlaylist(page.data.entries, moduleId)}
    />
  )
}

function _RouteComponent() {
  const {chart} = Route.useParams()
  const chartType = _chartTypes[chart as keyof typeof _chartTypes]

  if (!chartType) {
    return <div className="p-2 text-primary/80">Chart not found.</div>
  }

  return <_ChartPage type={chartType} />
}

export const Route = createFileRoute("/charts/$chart")({component: _RouteComponent})
