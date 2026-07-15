let _tasks: {promise: Promise<unknown>; settled: boolean}[] = []

function _gc() {
  _tasks = _tasks.filter((task) => !task.settled)
}

let _timeout: ReturnType<typeof setTimeout> | null = null

export function branchOff(task: () => Promise<unknown>) {
  let t = {promise: task(), settled: false}
  t.promise
    .catch((e) => {
      console.error(e instanceof Error ? e.stack : e)
    })
    .finally(() => {
      t.settled = true
      if (_timeout) {
        clearTimeout(_timeout)
      }
      _timeout = setTimeout(_gc, 1000)
    })
  _tasks.push(t)
}

window.addEventListener("beforeunload", (event) => {
  if (_tasks.some((task) => !task.settled)) {
    event.preventDefault()
  }
})
