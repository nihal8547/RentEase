import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1 relative select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-maroon-700 text-white hover:bg-maroon-600 active:bg-maroon-800 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        secondary:
          "bg-white border border-line text-ink-800 hover:bg-sand-100 hover:border-ink-200 active:bg-sand-200 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed",
        ghost:
          "bg-transparent text-maroon-700 hover:bg-sand-100 active:bg-sand-200 disabled:opacity-50 disabled:cursor-not-allowed",
        destructive:
          "bg-ruby-600 text-white hover:bg-ruby-700 active:bg-ruby-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
        outline:
          "bg-transparent border border-maroon-700 text-maroon-700 hover:bg-maroon-700 hover:text-white active:bg-maroon-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        icon:
          "bg-white border border-line text-ink-600 hover:bg-sand-100 hover:text-ink-900 active:bg-sand-200 shadow-xs rounded-md disabled:opacity-50 disabled:cursor-not-allowed !min-w-0 p-0",
      },
      size: {
        sm:      "text-xs px-3 py-1.5 rounded-md min-h-[30px] min-w-[30px]",
        default: "text-sm px-4 py-2 rounded-md min-h-[36px] min-w-[36px]",
        lg:      "text-base px-5 py-2.5 rounded-lg min-h-[42px] min-w-[42px]",
        icon:    "w-[34px] h-[34px] rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    const isIconVariant = variant === 'icon';
    const computedAriaLabel = props['aria-label'] || (isIconVariant ? props.title : undefined);
    const resolvedSize = (isIconVariant && !size) ? 'icon' : (size ?? 'default');

    return (
      <button
        className={cn(buttonVariants({ variant, size: resolvedSize, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        aria-label={computedAriaLabel}
        {...props}
      >
        <span className={cn("inline-flex items-center justify-center gap-1.5", isLoading && "opacity-0")}>
          {children}
        </span>
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
