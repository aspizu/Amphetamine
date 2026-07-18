import {useQuery} from "@tanstack/react-query"

import {getModuleInfo} from "#lib/module-info"
import {useStore} from "#lib/store"

export default function PlayerDetails() {
  const moduleID = useStore((state) =>
    state.queue.length > 0 ? state.queue[state.queueHead] : null,
  )
  const moduleInfo = useQuery({
    queryKey: ["module", moduleID, "info"],
    queryFn: async () => {
      if (moduleID === null) {
        return null
      }
      return await getModuleInfo(moduleID)
    },
  })
  return (
    <div className="flex min-h-9 flex-col">
      {moduleInfo.data && (
        <>
          <div className="text-lg leading-none">{moduleInfo.data.title || "~"}</div>
          <div className="text-sm leading-tight text-muted-foreground">
            {moduleInfo.data.artists.map((a) => a.name).join(", ") || "~"}
          </div>
        </>
      )}
    </div>
  )
}
