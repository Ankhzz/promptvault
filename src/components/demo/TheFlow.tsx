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

const NODE_POSITIONS = [0.040, 0.215, 0.390, 0.565, 0.740, 0.915]

type Keyframe = { p: number; t: number; ease?: 'ease-in' }

const KEYFRAMES: Keyframe[] = [
  { p: NODE_POSITIONS[0], t: 0 },
  { p: NODE_POSITIONS[0], t: 200 },
  { p: NODE_POSITIONS[1], t: 1200 },
  { p: NODE_POSITIONS[1], t: 1450 },
  { p: NODE_POSITIONS[2], t: 2450 },
  { p: NODE_POSITIONS[2], t: 2900 },
  { p: NODE_POSITIONS[3], t: 3900 },
  { p: NODE_POSITIONS[3], t: 4150 },
  { p: NODE_POSITIONS[4], t: 5150 },
  { p: NODE_POSITIONS[4], t: 6050 },
  { p: NODE_POSITIONS[5], t: 7050, ease: 'ease-in' },
  { p: NODE_POSITIONS[5], t: 7750 },
]

const CYCLE_MS = 8000

type TimelineState = {
  progress: number
  activeNode: number | null
  passedNodes: boolean[]
}

const NODE_TIMES = [
  { arrival: 0, departure: 200 },
  { arrival: 1200, departure: 1450 },
  { arrival: 2450, departure: 2900 },
  { arrival: 3900, departure: 4150 },
  { arrival: 5150, departure: 6050 },
  { arrival: 7050, departure: 7750 },
]

function getTimelineState(cycleT: number): TimelineState {
  let progress = 1.0
  for (let i = 1; i < KEYFRAMES.length; i++) {
    if (cycleT <= KEYFRAMES[i].t) {
      const k0 = KEYFRAMES[i - 1]
      const k1 = KEYFRAMES[i]
      const seg = (cycleT - k0.t) / (k1.t - k0.t)
      const eased = k1.ease === 'ease-in' ? seg * seg * seg : seg
      progress = k0.p + (k1.p - k0.p) * eased
      break
    }
  }

  let activeNode: number | null = null
  const passedNodes = NODE_TIMES.map((nt) => cycleT >= nt.departure)
  const pausedIdx = NODE_TIMES.findIndex(
    (nt) => cycleT >= nt.arrival && cycleT < nt.departure,
  )
  if (pausedIdx >= 0) activeNode = pausedIdx

  return { progress, activeNode, passedNodes }
}

export function TheFlow() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [timeline, setTimeline] = useState<TimelineState>({
    progress: 0,
    activeNode: null,
    passedNodes: NODES.map(() => false),
  })
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
          setTimeline({ progress: 0, activeNode: null, passedNodes: NODES.map(() => false) })
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) {
      setTimeline({ progress: 0, activeNode: null, passedNodes: NODES.map(() => false) })
      return
    }

    startRef.current = performance.now()

    intervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startRef.current
      const cycleT = elapsed % CYCLE_MS
      setTimeline(getTimelineState(cycleT))
    }, 30)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible])

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
              style={{ width: `${timeline.progress * 100}%` }}
            />

            {/* Encrypted pulse */}
            <div
              className="absolute top-[6px] w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_6px_var(--accent)] z-10"
              style={{ left: `${timeline.progress * 100}%` }}
            />

            {/* Nodes */}
            <div className="relative z-[1]">
              {NODES.map((node, i) => {
                const state: 'active' | 'passed' | 'pending' =
                  timeline.activeNode === i ? 'active'
                  : timeline.passedNodes[i] ? 'passed'
                  : 'pending'
                return (
                  <div
                    key={node.label}
                    className="absolute"
                    style={{ left: `${NODE_POSITIONS[i] * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="flex flex-col items-center gap-1.5" style={{ width: 'max-content' }}>
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
