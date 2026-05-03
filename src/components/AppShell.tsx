'use client'

import { Sidebar } from '@/components/Sidebar'
import { useState, type ReactNode } from 'react'
import { MenuIcon } from '@/components/Icons'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 md:ml-64">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/80 backdrop-blur-md px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-foreground p-1" aria-label="Open menu">
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="font-display text-base font-bold tracking-tight text-gradient">PromptVault</span>
        </div>
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
