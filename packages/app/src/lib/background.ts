const tasks = new Set<Promise<unknown>>()

function formatError(error: unknown): any {
  if (error instanceof AggregateError)
    return [error.stack, ...error.errors.map(formatError)].join("\nCaused by: ")

  if (error instanceof Error)
    return error.cause
      ? `${error.stack ?? error.message}\nCaused by: ${formatError(error.cause)}`
      : (error.stack ?? error.message)

  if (typeof error === "object")
    try {
      return JSON.stringify(error, null, 2)
    } catch {}

  return error
}

export function branchOff(task: () => Promise<unknown>, message = "task failed") {
  const promise = Promise.resolve().then(task)
  tasks.add(promise)

  void promise
    .catch((error) => {
      console.group(`[background] ${message}`)
      console.error(formatError(error))
      console.groupEnd()
    })
    .finally(() => tasks.delete(promise))
}

window.addEventListener("beforeunload", (event) => {
  if (tasks.size) {
    event.preventDefault()
  }
})
