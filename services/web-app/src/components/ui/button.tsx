import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gray-900 text-white shadow-lg hover:bg-gray-800 focus-visible:ring-gray-500",
        primary:
          "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700 focus-visible:ring-blue-500",
        secondary:
          "bg-white/10 backdrop-blur-sm border border-white/20 text-white shadow-lg hover:bg-white/20 focus-visible:ring-white/50",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700 focus-visible:ring-red-500",
        outline:
          "border-2 border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500",
        ghost: 
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
        link: 
          "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 focus-visible:ring-blue-500",
        success:
          "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:from-green-600 hover:to-green-700 focus-visible:ring-green-500",
        warning:
          "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:from-yellow-600 hover:to-orange-600 focus-visible:ring-yellow-500",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
