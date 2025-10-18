import * as React from "react"
import { cn } from "@/lib/utils"

export interface FileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  asChild?: boolean
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type="file"
        className={cn(
          "block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
FileInput.displayName = "FileInput"

export { FileInput }
