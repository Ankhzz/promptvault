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

export const ArrowLeftIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
)
ArrowLeftIcon.displayName = 'ArrowLeftIcon'

export const FileIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
)
FileIcon.displayName = 'FileIcon'

export const DownloadIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ),
)
DownloadIcon.displayName = 'DownloadIcon'

export const EyeIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
)
EyeIcon.displayName = 'EyeIcon'

export const MenuIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
)
MenuIcon.displayName = 'MenuIcon'

export const XIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
)
XIcon.displayName = 'XIcon'

export const PricetagIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l9 9-9 9-9-9 9-9z" />
      <path d="M9 12a1 1 0 102 0 1 1 0 00-2 0" />
      <path d="M15 6l-9 9" />
    </svg>
  ),
)
PricetagIcon.displayName = 'PricetagIcon'

export const GlobeIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
)
GlobeIcon.displayName = 'GlobeIcon'

export const ShoppingCartIcon = forwardRef<SVGSVGElement, IconProps>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  ),
)
ShoppingCartIcon.displayName = 'ShoppingCartIcon'
