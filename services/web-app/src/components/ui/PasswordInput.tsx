import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const passwordInputVariants = cva(
  "flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
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
        sm: "h-8 px-2 text-xs pr-8",
        default: "h-10 px-3 pr-10",
        lg: "h-12 px-4 text-base pr-12",
        xl: "h-14 px-5 text-lg pr-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    VariantProps<typeof passwordInputVariants> {
  label?: string
  error?: string
  helperText?: string
  showPasswordText?: string
  hidePasswordText?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    className, 
    variant, 
    size, 
    label, 
    error, 
    helperText, 
    showPasswordText = "Show password",
    hidePasswordText = "Hide password",
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputId = React.useId()
    const actualVariant = error ? "error" : variant

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const getIconSize = () => {
      if (size === "sm") return "w-4 h-4"
      if (size === "lg") return "w-6 h-6"
      if (size === "xl") return "w-7 h-7"
      return "w-5 h-5"
    }

    const getButtonPadding = () => {
      if (size === "sm") return "right-2"
      if (size === "lg") return "right-4"
      if (size === "xl") return "right-5"
      return "right-3"
    }

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
          <input
            id={inputId}
            type={showPassword ? "text" : "password"}
            className={cn(passwordInputVariants({ variant: actualVariant, size, className }))}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={cn(
              "absolute inset-y-0 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors",
              getButtonPadding()
            )}
            aria-label={showPassword ? hidePasswordText : showPasswordText}
          >
            {showPassword ? (
              // Eye slash icon (hide password)
              <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              // Eye icon (show password)
              <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
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
PasswordInput.displayName = "PasswordInput"

export { PasswordInput, passwordInputVariants }
