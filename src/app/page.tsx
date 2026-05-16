'use client'

import Image from 'next/image'
import { usePrivy } from '@privy-io/react-auth'
import { ShieldIcon, KeyIcon, LockIcon, ClockIcon, VaultIcon, ArrowRightIcon } from '@/components/Icons'
import { STORY_CHAIN } from '@/lib/constants'

export default function LandingPage() {
  const { login, authenticated } = usePrivy()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 h-[59px] border-b border-border bg-background/80 backdrop-blur-[25px]">
        <div className="mx-auto max-w-[1200px] px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="PromptVault" width={150} height={59} priority />
          </div>
          <div className="flex items-center gap-4">
            {authenticated ? (
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 border border-accent rounded-[6px] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted"
              >
                Dashboard
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </a>
            ) : (
              <button
                onClick={() => login()}
                className="inline-flex items-center gap-2 border border-accent rounded-[6px] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted"
              >
                Connect Wallet
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-[59px]">
        <section className="relative">
          <div className="mx-auto max-w-[1200px] px-6 py-[120px]">
            <div className="max-w-2xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-[16px] border border-border px-4 py-1.5 text-sm text-frost/70 transition-colors hover:border-muted">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                </span>
                Built on Story Protocol · Aeneid Testnet
              </div>

              <h1 className="font-display text-[56px] leading-[1] tracking-[-0.05em] text-foreground">
                Encrypted AI Prompt{' '}
                <span className="text-gradient">Vaults</span>
              </h1>

              <p className="text-lg text-muted leading-[1.6] max-w-xl">
                Protect your intellectual property with threshold-encrypted vaults, license-gated access, and on-chain conditions. No single point of failure. No trust required.
              </p>

              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => authenticated ? window.location.href = '/dashboard' : login()}
                  className="inline-flex items-center gap-2 border border-accent rounded-[6px] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted"
                >
                  Get Started
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Learn More
                </a>
              </div>

              <div className="flex items-center gap-4 pt-4 text-xs text-subtle">
                <a href={`${STORY_CHAIN.explorer}`} target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
                  Aeneid Explorer
                </a>
                <span className="text-border">·</span>
                <a href="https://docs.story.foundation/developers/cdr-sdk/overview" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
                  CDR SDK Docs
                </a>
                <span className="text-border">·</span>
                <a href="/faucet" className="hover:text-muted transition-colors">
                  Testnet Faucet
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        <section id="how-it-works" className="py-[80px]">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="max-w-xl mb-16">
              <h2 className="font-display text-[56px] leading-[1] tracking-[-0.05em]">How It Works</h2>
              <p className="mt-4 text-muted text-lg">Three steps to protect your most valuable prompts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: '01',
                  title: 'Create a Vault',
                  description: 'Choose your vault type — licensed, private, or time-locked. Your content is encrypted client-side with a random 256-bit data key.',
                  icon: VaultIcon,
                },
                {
                  step: '02',
                  title: 'Encrypt & Protect',
                  description: 'The data key is threshold-encrypted to the CDR validator network. On-chain conditions enforce who can request decryption.',
                  icon: ShieldIcon,
                },
                {
                  step: '03',
                  title: 'Gate & License',
                  description: 'License tokens, EOA ownership, or on-chain timestamps control access. Authorized users recover the data key via CDR.',
                  icon: KeyIcon,
                },
              ].map(({ step, title, description, icon: Icon }) => (
                <div
                  key={step}
                  className="rounded-2xl border border-border bg-background p-8 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <span className="font-mono text-sm text-subtle">{step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        <section className="py-[80px]">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="max-w-xl mb-16">
              <h2 className="font-display text-[56px] leading-[1] tracking-[-0.05em]">Vault Types</h2>
              <p className="mt-4 text-muted text-lg">Choose the access control model that fits your content</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: ShieldIcon,
                  title: 'Licensed Vaults',
                  description: 'Register an IP asset on Story Protocol. Mint license tokens that grant decryption access. Perfect for selling prompt collections.',
                  tags: ['IP Registration', 'License Tokens', 'Marketplace'],
                },
                {
                  icon: LockIcon,
                  title: 'Private Vaults',
                  description: 'Owner-only EOA access. No IP registration, no license tokens. Maximum privacy — only your wallet can decrypt.',
                  tags: ['Owner-Only', 'No IP Registration', 'EOA Gated'],
                },
                {
                  icon: ClockIcon,
                  title: 'Time-Locked Vaults',
                  description: 'On-chain smart contract enforces an unlock timestamp. Anyone can access after the deadline — perfect for scheduled releases.',
                  tags: ['Smart Contract', 'Timestamp Gated', 'Public After'],
                },
              ].map(({ icon: Icon, title, description, tags }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-background p-8 space-y-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{description}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tags.map(tag => (
                      <span key={tag} className="rounded-[6px] border border-border px-2 py-0.5 text-xs text-muted">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        <section className="py-[80px]">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="rounded-2xl border border-border bg-background p-12">
              <div className="max-w-xl mx-auto text-center space-y-6">
                <h2 className="font-display text-[56px] leading-[1] tracking-[-0.05em]">
                  Ready to protect your prompts?
                </h2>
                <p className="text-muted text-lg leading-relaxed">
                  Connect your wallet and create your first encrypted vault on the Story Aeneid testnet. It&apos;s free.
                </p>
                <button
                  onClick={() => authenticated ? window.location.href = '/dashboard' : login()}
                  className="inline-flex items-center gap-2 border border-accent rounded-[6px] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted"
                >
                  {authenticated ? 'Go to Dashboard' : 'Connect Wallet & Start'}
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-8">
          <div className="mx-auto max-w-[1200px] px-6 flex items-center justify-between text-xs text-subtle">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="PromptVault" width={150} height={59} />
            </div>
            <p>Built on Story Protocol · CDR Hackathon 2025</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
