import {Dialog} from "@base-ui/react/dialog"
import {useMatch, useNavigate} from "@tanstack/react-router"
import * as React from "react"

import {useStore} from "#lib/store"

import {Button} from "./ui/button"

interface DeletePlaylistDialogProps {
  index: number
  onClose: () => void
}

export default function DeletePlaylistDialog({
  index,
  onClose,
}: DeletePlaylistDialogProps) {
  const navigate = useNavigate()
  const playlistMatch = useMatch({
    from: "/playlists/$playlistIndex",
    shouldThrow: false,
  })
  const playlist = useStore((state) => state.playlists[index])

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-lg outline-none">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!playlist) return

              useStore.setState((draft) => {
                draft.playlists.splice(index, 1)
              })
              const activeIndex = Number(playlistMatch?.params.playlistIndex)
              if (activeIndex === index) {
                void navigate({to: "/", replace: true})
              } else if (activeIndex > index) {
                void navigate({
                  to: "/playlists/$playlistIndex",
                  params: {playlistIndex: String(activeIndex - 1)},
                  replace: true,
                })
              }
              onClose()
            }}
          >
            <Dialog.Title className="font-medium">Delete playlist</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Delete "{playlist?.name}"? Tracks in your queue will stay there.
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
              <Button type="submit" variant="destructive" disabled={!playlist}>
                Delete
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
