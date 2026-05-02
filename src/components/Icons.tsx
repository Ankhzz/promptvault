import { type SVGProps, forwardRef } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export const ShieldIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
)
ShieldIcon.displayName = 'ShieldIcon'

export const LockIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
)
LockIcon.displayName = 'LockIcon'

export const UnlockIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  ),
)
UnlockIcon.displayName = 'UnlockIcon'

export const KeyIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
)
KeyIcon.displayName = 'KeyIcon'

export const PlusIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
)
PlusIcon.displayName = 'PlusIcon'

export const ArrowRightIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
)
ArrowRightIcon.displayName = 'ArrowRightIcon'

export const ExternalLinkIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
)
ExternalLinkIcon.displayName = 'ExternalLinkIcon'

export const ActivityIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
)
ActivityIcon.displayName = 'ActivityIcon'

export const VaultIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M2 9h20" />
      <path d="M12 15v.01" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  ),
)
VaultIcon.displayName = 'VaultIcon'

export const GridIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
)
GridIcon.displayName = 'GridIcon'

export const ChevronRightIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
)
ChevronRightIcon.displayName = 'ChevronRightIcon'

export const CopyIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
)
CopyIcon.displayName = 'CopyIcon'

export const CheckIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
)
CheckIcon.displayName = 'CheckIcon'
