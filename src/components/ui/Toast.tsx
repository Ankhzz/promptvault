'use client'

import { cn } from '@/lib/cn'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'accent' | 'destructive' | 'warning'
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto animate-slide-in-right',
              'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
              'max-w-sm',
              toast.variant === 'accent' && 'border-accent/20 bg-accent-muted text-accent',
              toast.variant === 'destructive' && 'border-destructive/20 bg-destructive-muted text-destructive',
              toast.variant === 'warning' && 'border-warning/20 bg-warning-muted text-warning',
              (!toast.variant || toast.variant === 'default') && 'border-border bg-surface text-foreground',
            )}
          >
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description && (
                <p className="text-xs opacity-70">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-current opacity-40 hover:opacity-70 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
