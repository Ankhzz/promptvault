'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/useTheme'
import { VaultIcon, GridIcon, ActivityIcon, PlusIcon, UnlockIcon, XIcon, GlobeIcon, DropletIcon, SunIcon, MoonIcon } from '@/components/Icons'
import { WalletStatus } from '@/components/WalletStatus'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: GridIcon },
  { href: '/my-vaults', label: 'My Vaults', icon: VaultIcon },
  { href: '/explore', label: 'Explore', icon: GlobeIcon },
  { href: '/faucet', label: 'Faucet', icon: DropletIcon },
  { href: '/create', label: 'Create Vault', icon: PlusIcon },
  { href: '/unlock', label: 'Unlock Vault', icon: UnlockIcon },
  { href: '/activity', label: 'Activity', icon: ActivityIcon },
]

function isActiveNav(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  if (href === '/vault') return pathname.startsWith('/vault')
  return pathname.startsWith(href)
}

function LogoBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/logo.svg" alt="PromptVault" width={128} height={50} className="shrink-0" />
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:text-foreground hover:bg-surface transition-colors duration-[var(--transition-fast)]"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  )
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()

  const navContent = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActiveNav(href, pathname)
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm transition-colors duration-[var(--transition-fast)]',
              active
                ? 'text-accent bg-accent-muted'
                : 'text-muted hover:text-foreground hover:bg-surface',
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-border bg-elevated">
        <div className="flex h-14 items-center justify-between px-5 border-b border-border">
          <LogoBrand />
          <ThemeToggle />
        </div>
        {navContent}
        <div className="border-t border-border px-4 py-4">
          <WalletStatus />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 w-60 flex flex-col border-r border-border bg-elevated animate-slide-in-left">
            <div className="flex h-14 items-center justify-between px-5 border-b border-border">
              <LogoBrand />
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:text-foreground" aria-label="Close menu">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {navContent}
            <div className="border-t border-border px-4 py-4">
              <WalletStatus />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
