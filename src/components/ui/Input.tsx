import { cn } from '@/lib/cn'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  mono?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, mono, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-[6px] border bg-background px-3 py-2 text-sm',
            'border-border text-foreground placeholder:text-subtle',
            'transition-colors duration-[var(--transition-fast)]',
            'hover:border-muted focus:border-accent focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-40',
            mono && 'font-mono text-xs',
            error && 'border-destructive focus:border-destructive',
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-subtle">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input, type InputProps }
