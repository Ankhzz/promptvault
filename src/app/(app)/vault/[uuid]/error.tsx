'use client'

export default function VaultError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-md">
        <p className="text-destructive text-sm font-medium">Something went wrong</p>
        <p className="text-subtle text-xs mt-1 mb-6">
          {error.message || 'An unexpected error occurred loading this vault'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-[6px] border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}