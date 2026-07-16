import {useQuery} from "@tanstack/react-query"
import {createFileRoute} from "@tanstack/react-router"

import {Button} from "#components/ui/button.tsx"
import {Spinner} from "#components/ui/spinner.tsx"
import {useStore} from "#lib/store"
import {getMusicCharts} from "#lib/top-charts"

function RouteComponent() {
  const page = useQuery({
    queryKey: ["tophits"],
    queryFn: () => getMusicCharts("tophits"),
  })
  if (page.isLoading) {
    return <Spinner />
  }
  return (
    <div>
      <Button
        onClick={() => {
          useStore.setState((draft) => {
            draft.queue = page.data?.entries ?? []
            draft.repeatHead = 0
            draft.queueHead = 0
          })
        }}
      >
        Enqueue top hits
      </Button>
    </div>
  )
}

export const Route = createFileRoute("/")({component: RouteComponent})
