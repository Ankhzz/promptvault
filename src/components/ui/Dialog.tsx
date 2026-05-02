'use client'

import { cn } from '@/lib/cn'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg animate-fade-in-scale',
          'rounded-2xl border border-border bg-surface shadow-2xl',
          className,
        )}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-2 space-y-1.5">
            {title && (
              <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            )}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        <div className="flex justify-end px-6 pb-6">
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
