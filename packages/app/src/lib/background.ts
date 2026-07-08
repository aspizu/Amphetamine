const _tasks: Promise<unknown>[] = []

export function branchOff(task: () => Promise<unknown>) {
  _tasks.push(
    task().catch((e) => {
      console.error(`background task failed: ${e}`)
    }),
  )
}
