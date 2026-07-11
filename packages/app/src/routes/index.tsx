import {useSuspenseQuery} from "@tanstack/react-query"
import {createFileRoute} from "@tanstack/react-router"

import {getModuleInfo} from "#lib/module-info"

function RouteComponent() {
  const moduleID = 113391
  const moduleInfo = useSuspenseQuery({
    queryKey: ["module-info", moduleID],
    queryFn: async () => await getModuleInfo(moduleID),
  })
  return (
    <pre>
      <code>{JSON.stringify(moduleInfo.data, null, 2)}</code>
    </pre>
  )
}

export const Route = createFileRoute("/")({component: RouteComponent})
