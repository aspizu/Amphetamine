import {SpinnerGapIcon} from "@phosphor-icons/react"
import * as React from "react"

import {cn} from "#lib/utils"

function Spinner({className, ...props}: React.ComponentProps<"svg">) {
  return (
    <SpinnerGapIcon
      weight="bold"
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export {Spinner}
