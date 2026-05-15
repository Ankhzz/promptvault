'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ShieldIcon, KeyIcon, LockIcon, ClockIcon, VaultIcon, ArrowRightIcon } from '@/components/Icons'
import { STORY_CHAIN } from '@/lib/constants'

export default function LandingPage() {
  const { login, authenticated } = usePrivy()

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldIcon className="h-7 w-7 text-accent" />
            <span className="font-display text-lg font-bold tracking-tight text-gradient">PromptVault</span>
          </div>
          <div className="flex items-center gap-4">
            {authenticated ? (
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
              >
                Dashboard
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            ) : (
              <button
                onClick={() => login()}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
              >
                Connect Wallet
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px]" />
          <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-muted/50 px-4 py-1.5 text-xs font-medium text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                Built on Story Protocol &middot; Aeneid Testnet
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                Encrypted AI Prompt{' '}
                <span className="text-gradient">Vaults</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
                Protect your intellectual property with threshold-encrypted vaults, license-gated access, and on-chain conditions. No single point of failure. No trust required.
              </p>
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => authenticated ? window.location.href = '/dashboard' : login()}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
                >
                  Get Started
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface"
                >
                  Learn More
                </a>
              </div>
              <div className="flex items-center justify-center gap-6 pt-6 text-xs text-subtle">
                <a href={`${STORY_CHAIN.explorer}`} target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
                  Aeneid Explorer
                </a>
                <span>&middot;</span>
                <a href="https://docs.story.foundation/developers/cdr-sdk/overview" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
                  CDR SDK Docs
                </a>
                <span>&middot;</span>
                <a href="/faucet" className="hover:text-muted transition-colors">
                  Testnet Faucet
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">How It Works</h2>
              <p className="mt-3 text-muted text-lg">Three steps to protect your most valuable prompts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                <div key={step} className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative rounded-xl border border-border/50 bg-elevated/50 p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-muted">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-display text-2xl font-bold text-surface-active">{step}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Vault Types</h2>
              <p className="mt-3 text-muted text-lg">Choose the access control model that fits your content</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                <div key={title} className="rounded-xl border border-border/50 bg-elevated/50 p-6 space-y-4 hover:border-accent/20 transition-colors duration-300">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-muted">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{description}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-8 sm:p-12">
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                  Ready to protect your prompts?
                </h2>
                <p className="text-muted text-lg">
                  Connect your wallet and create your first encrypted vault on the Story Aeneid testnet. It&apos;s free.
                </p>
                <button
                  onClick={() => authenticated ? window.location.href = '/dashboard' : login()}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
                >
                  {authenticated ? 'Go to Dashboard' : 'Connect Wallet & Start'}
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/50 py-8">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-subtle">
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-accent" />
              <span className="font-display font-semibold text-muted">PromptVault</span>
            </div>
            <p>Built on Story Protocol &middot; CDR Hackathon 2025</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
