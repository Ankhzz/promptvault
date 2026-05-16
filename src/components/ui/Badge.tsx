import { cn } from '@/lib/cn'
import { type HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'default' | 'accent' | 'warning' | 'destructive' | 'info' | 'outline' | 'success'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-transparent text-muted border-border',
  accent: 'bg-transparent text-accent border-accent/30',
  warning: 'bg-transparent text-warning border-warning/30',
  destructive: 'bg-transparent text-destructive border-destructive/30',
  info: 'bg-transparent text-info border-info/30',
  success: 'bg-transparent text-success border-success/30',
  outline: 'bg-transparent text-muted border-border',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {children}
    </span>
  ),
)
Badge.displayName = 'Badge'

export { Badge, type BadgeVariant }
