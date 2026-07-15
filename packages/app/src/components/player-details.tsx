import {useQuery} from "@tanstack/react-query"

import {getModuleInfo} from "#lib/module-info"
import {useStore} from "#lib/store"

import {Spinner} from "./ui/spinner"

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
    <div>
      {moduleInfo.isLoading && <Spinner />}
      {moduleInfo.data && <div>{moduleInfo.data.title}</div>}
      {moduleInfo.data && <div>{moduleInfo.data.artists.map((a) => a.name).join(", ")}</div>}
    </div>
  )
}
