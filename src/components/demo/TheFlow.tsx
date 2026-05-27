'use client'

import { useState, useEffect, useRef } from 'react'

const NODES = [
  { label: 'Prompt', sub: null },
  { label: 'Encrypt', sub: 'AES-256-GCM' },
  { label: 'Split', sub: 'CDR 3-of-5' },
  { label: 'Store', sub: 'IPFS' },
  { label: 'License', sub: 'Story Protocol' },
  { label: 'Authorized Access', sub: null },
] as const

export function TheFlow() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const startRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
        } else {
          setVisible(false)
          setProgress(0)
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) {
      setProgress(0)
      return
    }

    startRef.current = performance.now()
    const DURATION = 8000

    intervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startRef.current
      const p = (elapsed % DURATION) / DURATION
      setProgress(p)
    }, 30)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible])

  const getNodeState = (index: number): 'pending' | 'active' | 'passed' => {
    const center = index / (NODES.length - 1)
    if (Math.abs(progress - center) < 0.025) return 'active'
    return progress > center ? 'passed' : 'pending'
  }

  return (
    <section ref={sectionRef} className="py-[80px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-xl mb-16">
          <h2 className="font-display text-[56px] leading-[1] tracking-[-0.05em]">
            Privacy-Preserving Flow
          </h2>
          <p className="mt-4 text-muted text-lg">
            From encryption to licensed access, every step protects the original prompt.
          </p>
        </div>

        <div className="relative rounded-2xl border border-border bg-background p-8 md:p-10">
          <div className="relative">
            {/* Connecting line — behind nodes */}
            <div className="absolute inset-x-0 top-[6px] h-px bg-border" />
            <div
              className="absolute left-0 top-[6px] h-px bg-accent/60 transition-none"
              style={{ width: `${progress * 100}%` }}
            />

            {/* Encrypted pulse */}
            <div
              className="absolute top-[6px] w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_6px_var(--accent)] z-10"
              style={{ left: `${progress * 100}%` }}
            />

            {/* Nodes */}
            <div className="flex justify-between relative z-[1]">
              {NODES.map((node, i) => {
                const state = getNodeState(i)
                return (
                  <div key={node.label} className="flex flex-col items-center gap-1.5">
                    <div
                      className={
                        `w-3 h-3 rounded-full border-2 transition-all duration-[var(--transition)] ${
                          state === 'active'
                            ? 'border-accent bg-accent shadow-[0_0_6px_var(--accent)]'
                            : state === 'passed'
                              ? 'border-accent/50 bg-accent/30'
                              : 'border-border bg-background'
                        }`
                      }
                    />
                    <span className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">
                      {node.label}
                    </span>
                    {node.sub && (
                      <span className="hidden md:block text-[10px] md:text-xs text-subtle whitespace-nowrap">
                        {node.sub}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
