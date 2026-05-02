'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { VaultIcon, GridIcon, ActivityIcon, PlusIcon, ShieldIcon, UnlockIcon } from '@/components/Icons'
import { WalletStatus } from '@/components/WalletStatus'

const navItems = [
  { href: '/', label: 'Dashboard', icon: GridIcon },
  { href: '/create', label: 'Create Vault', icon: PlusIcon },
  { href: '/unlock', label: 'Unlock Vault', icon: UnlockIcon },
  { href: '/activity', label: 'Activity', icon: ActivityIcon },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-elevated">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <ShieldIcon className="h-7 w-7 text-accent" />
        <span className="font-display text-lg font-bold tracking-tight text-gradient">
          PromptVault
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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

      <div className="border-t border-border px-4 py-4">
        <WalletStatus />
      </div>
    </aside>
  )
}
