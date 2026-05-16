'use client'

import Image from 'next/image'
import { Sidebar } from '@/components/Sidebar'
import { useState, type ReactNode } from 'react'
import { MenuIcon } from '@/components/Icons'
import { useTheme } from '@/lib/useTheme'
import { SunIcon, MoonIcon } from '@/components/Icons'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useTheme()

  return (
    <div className="flex min-h-dvh">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 md:ml-60">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-foreground p-1" aria-label="Open menu">
            <MenuIcon className="h-5 w-5" />
          </button>
          <Image src="/logo.svg" alt="PromptVault" width={128} height={50} />
          <div className="flex-1" />
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>
        <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
