import { cn } from '@/lib/cn'
import { type HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'default' | 'accent' | 'warning' | 'destructive' | 'info' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-active text-muted border-border',
  accent: 'bg-accent-muted text-accent border-accent/20',
  warning: 'bg-warning-muted text-warning border-warning/20',
  destructive: 'bg-destructive-muted text-destructive border-destructive/20',
  info: 'bg-info-muted text-info border-info/20',
  outline: 'bg-transparent text-muted border-border',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
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
