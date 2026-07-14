import {useQuery} from "@tanstack/react-query"

import {getModuleInfo} from "#lib/module-info"
import {useStore} from "#lib/store"

export default function PlayerDetails() {
  const queueHeadId = useStore((store) => store.queue[store.queueHead] ?? null)
  const moduleInfo = useQuery({
    queryKey: ["module", queueHeadId, "info"],
    queryFn: async () => {
      if (queueHeadId === null) return null
      return await getModuleInfo(queueHeadId)
    },
  })
  return (
    <pre>
      <code>{JSON.stringify(moduleInfo)}</code>
    </pre>
  )
}
