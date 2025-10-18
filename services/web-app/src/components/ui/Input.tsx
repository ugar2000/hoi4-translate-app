import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-gray-300 focus-visible:ring-blue-500 focus-visible:border-blue-500",
        error: "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 bg-red-50",
        success: "border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500 bg-green-50",
        ghost: "border-transparent bg-gray-100 focus-visible:ring-gray-500 focus-visible:bg-white",
        glass: "bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder-gray-300 focus-visible:ring-blue-400 focus-visible:border-blue-400",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-10 px-3",
        lg: "h-12 px-4 text-base",
        xl: "h-14 px-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, icon, iconPosition = "left", label, error, helperText, ...props }, ref) => {
    const inputId = React.useId()
    const hasIcon = !!icon
    const actualVariant = error ? "error" : variant

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {hasIcon && iconPosition === "left" && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="h-5 w-5 text-gray-400">
                {icon}
              </div>
            </div>
          )}
          <input
            id={inputId}
            className={cn(
              inputVariants({ variant: actualVariant, size, className }),
              hasIcon && iconPosition === "left" && "pl-10",
              hasIcon && iconPosition === "right" && "pr-10"
            )}
            ref={ref}
            {...props}
          />
          {hasIcon && iconPosition === "right" && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="h-5 w-5 text-gray-400">
                {icon}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
