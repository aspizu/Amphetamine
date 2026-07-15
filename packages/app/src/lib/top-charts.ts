export type MusicChart = "tophits" | "topscore" | "favourites"

export interface ChartPage {
  page: number
  totalPages: number
  entries: number[]
}

export const getMusicCharts = async (type: MusicChart, page = 1): Promise<ChartPage> => {
  const chartPaths = {
    tophits: "request=view_chart&query=tophits",
    topscore: "request=view_chart&query=topscore",
    favourites: "request=view_top_favourites",
  } as const satisfies Record<MusicChart, string>

  const res = await fetch(
    `https://proxy.aspiz.uk/https://modarchive.org/index.php?${chartPaths[type]}&page=${page}&cors-origin=${location.origin}`,
  )

  if (!res.ok) {
    throw new Error(`failed to fetch: ${res.status}`)
  }
  const doc = new DOMParser().parseFromString(await res.text(), "text/html")

  const totalPages = Math.max(
    ...Array.from(
      doc.querySelectorAll<HTMLOptionElement>("select.pagination option"),
      (option) => Number(option.value),
    ).filter(Number.isInteger),
    0,
  )

  const entries = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>("a.chart-listing-title[href^='module.php?']"),
  ).flatMap((link) => {
    const id = Number(link.getAttribute("href")?.match(/\?(\d+)$/)?.[1])
    if (!Number.isInteger(id)) return []
    return [id]
  })

  return {
    page,
    entries,
    totalPages,
  }
}
