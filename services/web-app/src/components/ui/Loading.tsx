import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const loadingVariants = cva(
  "animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-2",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-12 w-12 border-4",
      },
      variant: {
        default: "text-gray-600",
        primary: "text-blue-600",
        white: "text-white",
        success: "text-green-600",
        warning: "text-yellow-600",
        danger: "text-red-600",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size, variant, text, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center space-x-2", className)}
        {...props}
      >
        <div className={cn(loadingVariants({ size, variant }))} />
        {text && (
          <span className="text-sm text-gray-600">{text}</span>
        )}
      </div>
    )
  }
)
Loading.displayName = "Loading"

// Pulse loading animation
const PulseLoading = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { count?: number }
>(({ className, count = 3, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex space-x-1", className)}
    {...props}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
))
PulseLoading.displayName = "PulseLoading"

// Skeleton loading component
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-gray-200", className)}
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

export { Loading, PulseLoading, Skeleton, loadingVariants }
