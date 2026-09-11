import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 relative min-w-[44px] min-h-[36px]",
  {
    variants: {
      variant: {
        primary:
          "bg-maroon-700 text-white hover:bg-maroon-600 font-semibold px-[18px] py-[10px] rounded-[3px] disabled:bg-ink-400 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-ink-400",
        secondary:
          "bg-white border border-line text-ink-900 hover:bg-sand-050 font-semibold px-[18px] py-[10px] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed",
        ghost:
          "bg-transparent text-maroon-700 hover:bg-sand-100 font-semibold px-[18px] py-[10px] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 font-semibold px-[18px] py-[10px] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed",
        icon:
          "bg-white border border-line text-ink-900 hover:bg-sand-050 rounded-[3px] w-[36px] h-[36px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed !min-w-0 p-0",
      },
      size: {
        default: "",
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
    
    // Accessibility: Automatically map title to aria-label for icon buttons if missing
    const isIcon = variant === 'icon';
    const computedAriaLabel = props['aria-label'] || (isIcon ? props.title : undefined);

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        aria-label={computedAriaLabel}
        {...props}
      >
        <span className={cn("inline-flex items-center justify-center gap-2", isLoading && "opacity-0")}>
          {children}
        </span>
        {isLoading && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-current" />
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
