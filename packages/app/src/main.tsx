import {IconContext} from "@phosphor-icons/react"
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"
import {createRouter, RouterProvider} from "@tanstack/react-router"
import NProgress from "nprogress"
import {StrictMode} from "react"

import "nprogress/nprogress.css"
import "#styles/global.css"

import {createRoot} from "react-dom/client"

import {routeTree} from "./routeTree.gen"

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export const queryClient = new QueryClient()
const router = createRouter({
  routeTree,
  defaultViewTransition: true,
  scrollRestoration: true,
})

NProgress.configure({showSpinner: false})
router.subscribe("onBeforeNavigate", ({hrefChanged}) => {
  if (hrefChanged) NProgress.start()
})
router.subscribe("onResolved", () => NProgress.done())

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <IconContext.Provider value={{weight: "fill"}}>
        <RouterProvider router={router} />
      </IconContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
)
