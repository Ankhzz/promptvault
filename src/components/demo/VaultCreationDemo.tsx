'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ShieldIcon, KeyIcon, FileIcon, CheckIcon, VaultIcon } from '@/components/Icons'

type Step = 0 | 1 | 2 | 3

const STEP_LABELS = [
  'Select Vault Type',
  'Upload Prompt',
  'Confirm Encryption',
  'Authorized Access',
]

export function VaultCreationDemo() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>(0)
  const [accessPhase, setAccessPhase] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
        } else {
          setVisible(false)
          setStep(0)
          clearTimer()
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [clearTimer])

  useEffect(() => {
    if (step !== 3) {
      setAccessPhase(0)
      return
    }

    const phaseTimers = [
      setTimeout(() => setAccessPhase(1), 2000),
      setTimeout(() => setAccessPhase(2), 4000),
      setTimeout(() => setAccessPhase(3), 6000),
      setTimeout(() => setAccessPhase(4), 7500),
    ]

    return () => phaseTimers.forEach(clearTimeout)
  }, [step])

  useEffect(() => {
    if (!visible) return

    clearTimer()

    const durations = [3500, 4000, 3500, 10000]
    timerRef.current = setTimeout(
      () => setStep((s) => (s < 3 ? (s + 1) as Step : 0 as Step)),
      durations[step],
    )

    return clearTimer
  }, [visible, step, clearTimer])

  return (
    <>
      <style>{`
        @keyframes demo-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      <section ref={sectionRef} className="py-[80px]">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-xl mb-16">
            <h2 className="font-display text-[56px] leading-[1] tracking-[-0.05em]">
              Secure a Prompt in Seconds
            </h2>
            <p className="mt-4 text-muted text-lg">
              Watch how a prompt becomes an encrypted, license-gated vault without exposing the original content.
            </p>
          </div>

          <div className="relative rounded-2xl border border-border bg-background p-6 md:p-8">
            {/* Secure status indicator */}
            <div className="absolute top-5 right-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping"
                  style={{ animationDuration: '3s' }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success shadow-[0_0_6px_var(--success)]" />
              </span>
            </div>

            {/* Panel header */}
            <div className="flex items-center gap-3 mb-6">
              <VaultIcon className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-foreground">Create a Vault</span>
            </div>

            {/* Step indicator bar */}
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-xs text-subtle">
                {String(step + 1).padStart(2, '0')}
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-foreground">
                {STEP_LABELS[step]}
              </span>
            </div>

            {/* Step content — keyed to remount and restart animations */}
            <div key={step} className="h-[230px] animate-fade-in">
              {step === 0 && (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    {['Licensed', 'Private', 'Timelocked'].map((type, i) => (
                      <span
                        key={type}
                        className={
                          `inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-xs font-medium animate-fade-in ${
                            type === 'Licensed'
                              ? 'border-accent bg-accent-muted text-accent'
                              : 'border-border text-muted'
                          }`
                        }
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        {type === 'Licensed' && (
                          <CheckIcon className="h-3 w-3 animate-fade-in-scale" />
                        )}
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      'License-gated decryption',
                      'On-chain IP registration',
                      'Marketplace listing',
                    ].map((bullet, i) => (
                      <div
                        key={bullet}
                        className="flex items-center gap-2 text-xs text-muted animate-fade-in"
                        style={{ animationDelay: `${300 + i * 150}ms` }}
                      >
                        <span className="h-1 w-1 rounded-full bg-accent/60" />
                        {bullet}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background animate-fade-in-scale">
                    <FileIcon className="h-7 w-7 text-accent" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground">my_prompt.txt</p>
                    <p className="text-xs text-subtle mt-0.5">2.4 KB</p>
                  </div>
                  <div className="w-full max-w-[240px] space-y-1.5">
                    <div className="h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/60"
                        style={{ animation: 'demo-fill 1.5s ease-out forwards' }}
                      />
                    </div>
                    <p className="text-xs text-subtle text-center">Uploading...</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col items-center gap-5 py-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background animate-pulse-glow">
                    <ShieldIcon className="h-7 w-7 text-accent" />
                  </div>
                  <div className="flex items-center gap-2 animate-fade-in animate-slide-in-right">
                    <KeyIcon className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted">Key secured by CDR validators</span>
                  </div>
                  <p className="text-xs text-subtle">Threshold encryption · 3-of-5 network</p>
                </div>
              )}

              {step === 3 && (
                <div key={`auth-${accessPhase}`} className="flex flex-col items-center justify-center h-full animate-fade-in">
                  {accessPhase === 0 && (
                    <div className="flex flex-col items-center gap-3">
                      <span className="relative flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" style={{ animationDuration: '2s' }} />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
                      </span>
                      <p className="text-sm font-medium text-foreground">Verifying License Token...</p>
                      <p className="text-xs text-subtle">Checking on-chain ownership</p>
                    </div>
                  )}
                  {accessPhase === 1 && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background animate-pulse-glow">
                        <ShieldIcon className="h-6 w-6 text-accent" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Threshold Recovery Initiated</p>
                      <p className="text-xs text-subtle">CDR validator network responding</p>
                    </div>
                  )}
                  {accessPhase === 2 && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-full ${i < 3 ? 'bg-accent shadow-[0_0_4px_var(--accent)]' : 'bg-border'}`}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-foreground">3-of-5 Validator Partials Recovered</p>
                      <p className="text-xs text-subtle">Threshold met — reconstructing key</p>
                    </div>
                  )}
                  {accessPhase === 3 && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background animate-fade-in-scale">
                        <KeyIcon className="h-6 w-6 text-accent" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Data Key Reconstructed</p>
                      <p className="text-xs text-subtle">32-byte key assembled from partials</p>
                    </div>
                  )}
                  {accessPhase === 4 && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-success/30 bg-success-muted animate-fade-in-scale">
                        <ShieldIcon className="h-6 w-6 text-success" />
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-[6px] border border-success/30 px-2 py-0.5 text-xs font-medium text-success">
                        <CheckIcon className="h-3 w-3" />
                        Authorized Access Granted
                      </div>
                      <p className="text-xs text-subtle">Content ready to decrypt</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={
                    `h-2 w-2 rounded-full transition-all duration-[var(--transition-slow)] ${
                      i === step
                        ? 'bg-accent shadow-[0_0_6px_var(--accent)]'
                        : i < step
                          ? 'bg-accent/40'
                          : 'bg-border'
                    }`
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
