import {useQuery} from "@tanstack/react-query"
import {useState} from "react"

import {getModuleInfo} from "#lib/module-info"
import {useStore} from "#lib/store"
import {getMusicCharts, type MusicChart} from "#lib/top-charts"

const CHART_OPTIONS: {value: MusicChart; label: string}[] = [
  {value: "tophits", label: "most downloaded"},
  {value: "topscore", label: "most revered"},
  {value: "favourites", label: "top favs"},
]

export default function PlayerDetails() {
  const queueHeadId = useStore((store) => store.queue[store.queueHead] ?? null)
  const moduleInfo = useQuery({
    queryKey: ["module", queueHeadId, "info"],
    queryFn: async () => {
      if (queueHeadId === null) return null
      return await getModuleInfo(queueHeadId)
    },
  })

  const [chart, setChart] = useState<MusicChart>("tophits")
  const [page, setPage] = useState(1)

  const chartsInfo = useQuery({
    queryKey: ["music-charts", chart, page],
    queryFn: () => getMusicCharts(chart, page),
  })

  return (
    <div>
      <pre>
        <code>{JSON.stringify(moduleInfo)}</code>
      </pre>
      <select
        value={chart}
        onChange={(event) => {
          setChart(event.target.value as MusicChart)
          setPage(1)
        }}
      >
        {CHART_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <pre>
        <code>{JSON.stringify(chartsInfo, null, 2)}</code>
      </pre>
      <button
        onClick={() => {
          setPage(Math.max(1, page - 1))
        }}
      >
        prev page
      </button>
      {page}
      <button
        style={{margin: "0px 10px"}}
        onClick={() => {
          setPage(Math.min(page + 1, chartsInfo.data?.totalPages ?? 1000))
        }}
      >
        next page{" "}
      </button>
    </div>
  )
}
