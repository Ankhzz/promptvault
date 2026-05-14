'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { VaultIcon, GridIcon, ActivityIcon, PlusIcon, ShieldIcon, UnlockIcon, XIcon, GlobeIcon } from '@/components/Icons'
import { WalletStatus } from '@/components/WalletStatus'

const navItems = [
  { href: '/', label: 'Dashboard', icon: GridIcon },
  { href: '/my-vaults', label: 'My Vaults', icon: VaultIcon },
  { href: '/explore', label: 'Explore', icon: GlobeIcon },
  { href: '/create', label: 'Create Vault', icon: PlusIcon },
  { href: '/unlock', label: 'Unlock Vault', icon: UnlockIcon },
  { href: '/activity', label: 'Activity', icon: ActivityIcon },
]

function isActiveNav(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  if (href === '/vault') return pathname.startsWith('/vault')
  return pathname.startsWith(href)
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
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-[var(--transition-fast)]',
              active
                ? 'bg-accent-muted text-accent'
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
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-elevated">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
          <ShieldIcon className="h-7 w-7 text-accent" />
          <span className="font-display text-lg font-bold tracking-tight text-gradient">
            PromptVault
          </span>
        </div>
        {navContent}
        <div className="border-t border-border px-4 py-4">
          <WalletStatus />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 w-64 flex flex-col border-r border-border bg-elevated animate-slide-in-left">
            <div className="flex h-16 items-center justify-between px-6 border-b border-border">
              <div className="flex items-center gap-3">
                <ShieldIcon className="h-7 w-7 text-accent" />
                <span className="font-display text-lg font-bold tracking-tight text-gradient">
                  PromptVault
                </span>
              </div>
              <button onClick={onClose} className="text-muted hover:text-foreground p-1" aria-label="Close menu">
                <XIcon className="h-5 w-5" />
              </button>
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
