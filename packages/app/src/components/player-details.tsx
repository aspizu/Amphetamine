import {useQuery} from "@tanstack/react-query"
import {useState} from "react"

import {getModuleInfo} from "#lib/module-info"
import {useStore} from "#lib/store"
import {getMostDownloaded} from "#lib/top-charts"

export default function PlayerDetails() {
  const queueHeadId = useStore((store) => store.queue[store.queueHead] ?? null)
  const moduleInfo = useQuery({
    queryKey: ["module", queueHeadId, "info"],
    queryFn: async () => {
      if (queueHeadId === null) return null
      return await getModuleInfo(queueHeadId)
    },
  })

  const [page, setPage] = useState(1)

  const chartsInfo = useQuery({
    queryKey: ["most-downloaded", page],
    queryFn: () => getMostDownloaded(page),
  })

  return (
    <div>
      <pre>
        <code>{JSON.stringify(moduleInfo)}</code>
      </pre>
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
